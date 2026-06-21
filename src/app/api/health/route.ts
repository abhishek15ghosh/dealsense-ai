import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'disconnected';
  let appStatus = 'healthy';
  let errorDetails: string | undefined = undefined;

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
  } catch (error) {
    dbStatus = 'error';
    appStatus = 'unhealthy';
    errorDetails = error instanceof Error ? error.message : 'Unknown database error';
  }

  const responseBody = {
    status: appStatus,
    database: dbStatus,
    timestamp: new Date().toISOString(),
    ...(errorDetails && { error: errorDetails })
  };

  const statusCode = appStatus === 'healthy' ? 200 : 500;
  return NextResponse.json(responseBody, { status: statusCode });
}
