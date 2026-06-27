import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'disconnected';
  let appStatus = 'healthy';
  let errorDetails: string | undefined = undefined;
  let dbLatencyMs: number | undefined = undefined;
  let unresolvedErrorsCount: number | undefined = undefined;
  let lastCronExecution: {
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
    status: string;
    alertsChecked: number;
    alertsTriggered: number;
    errorsCount: number;
  } | null = null;

  try {
    // Attempt database connection
    await dbConnect();
    const state = mongoose.connection.readyState;
    
    switch (state) {
      case 0:
        dbStatus = 'disconnected';
        appStatus = 'unhealthy';
        break;
      case 1:
        dbStatus = 'connected';
        break;
      case 2:
        dbStatus = 'connecting';
        break;
      case 3:
        dbStatus = 'disconnecting';
        appStatus = 'unhealthy';
        break;
      default:
        dbStatus = 'unknown';
        appStatus = 'unhealthy';
    }

    // Capture latency and monitoring metrics on successful database ping
    if (dbStatus === 'connected' && mongoose.connection.db) {
      const startLatency = Date.now();
      await mongoose.connection.db.admin().ping();
      dbLatencyMs = Date.now() - startLatency;

      const ErrorLog = (await import('@/models/ErrorLog')).default;
      unresolvedErrorsCount = await ErrorLog.countDocuments({ resolved: false });

      const CronExecutionLog = (await import('@/models/CronExecutionLog')).default;
      const lastCron = await CronExecutionLog.findOne({}).sort({ startedAt: -1 });
      if (lastCron) {
        lastCronExecution = {
          startedAt: lastCron.startedAt,
          completedAt: lastCron.completedAt,
          durationMs: lastCron.durationMs,
          status: lastCron.status,
          alertsChecked: lastCron.alertsChecked,
          alertsTriggered: lastCron.alertsTriggered,
          errorsCount: lastCron.errorMsgs.length
        };
      }
    }
  } catch (error) {
    dbStatus = 'error';
    appStatus = 'unhealthy';
    errorDetails = error instanceof Error ? error.message : 'Unknown database error';
  }

  const responseBody = {
    status: appStatus,
    database: dbStatus,
    timestamp: new Date().toISOString(),
    ...(dbLatencyMs !== undefined && { dbLatencyMs }),
    ...(unresolvedErrorsCount !== undefined && { unresolvedErrorsCount }),
    ...(lastCronExecution && { lastCronExecution }),
    ...(errorDetails && { error: errorDetails })
  };

  const statusCode = appStatus === 'healthy' ? 200 : 500;
  return NextResponse.json(responseBody, { status: statusCode });
}
