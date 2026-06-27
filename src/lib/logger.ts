import mongoose from 'mongoose';
import ErrorLog from '@/models/ErrorLog';

export class Logger {
  static async logToDb(
    severity: 'ERROR' | 'WARNING' | 'CRITICAL',
    error: unknown,
    component: string,
    customMessage?: string
  ) {
    try {
      // Gracefully prevent database write failures if not connected
      if (mongoose.connection.readyState !== 1) {
        console.warn('[Logger] Database not connected. Skipping DB log persist.');
        return;
      }

      let errorName = 'LogInfo';
      let errorMessage = customMessage || 'No error details provided';
      let errorStack = '';

      if (error instanceof Error) {
        errorName = error.name;
        errorMessage = customMessage ? `${customMessage}: ${error.message}` : error.message;
        errorStack = error.stack || '';
      } else if (error && typeof error === 'object') {
        errorName = (error && 'name' in error && typeof (error as Record<string, unknown>).name === 'string')
          ? ((error as Record<string, unknown>).name as string)
          : 'ObjectError';
        errorMessage = customMessage ? `${customMessage}: ${JSON.stringify(error)}` : JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorName = 'StringError';
        errorMessage = customMessage ? `${customMessage}: ${error}` : error;
      }

      // Asynchronously create the DB log to prevent blocking main execution threads
      ErrorLog.create({
        timestamp: new Date(),
        errorName,
        errorMessage,
        errorStack,
        component,
        severity,
        resolved: false
      }).catch(err => {
        console.error('[Logger] Failed to write log to MongoDB:', err);
      });
    } catch (logErr) {
      console.error('[Logger] Central logging error:', logErr);
    }
  }

  static error(message: string, error?: unknown, component: string = 'UNKNOWN') {
    const formattedMsg = `[ERROR] [${component}] ${message}`;
    console.error(formattedMsg, error);
    this.logToDb('ERROR', error || message, component, message);
  }

  static warn(message: string, details?: unknown, component: string = 'UNKNOWN') {
    const formattedMsg = `[WARN] [${component}] ${message}`;
    console.warn(formattedMsg, details);
    this.logToDb('WARNING', details || message, component, message);
  }

  static info(message: string, details?: unknown, component: string = 'UNKNOWN') {
    console.log(`[INFO] [${component}] ${message}`, details !== undefined ? details : '');
  }
}

export default Logger;
