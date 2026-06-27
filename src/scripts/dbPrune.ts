import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import ErrorLog from '../models/ErrorLog';
import CronExecutionLog from '../models/CronExecutionLog';

async function prune() {
  // Load environment configurations using Next.js native helper
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  
  console.log('[Prune] Connecting to database...');
  await mongoose.connect(uri);
  
  const thresholdDays = parseInt(process.argv[2] || '30', 10);
  const cutoffDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  
  console.log(`[Prune] Cutoff date for pruning: ${cutoffDate.toISOString()} (${thresholdDays} days ago)`);
  
  // 1. Prune historical ErrorLogs
  const errorLogsPruned = await ErrorLog.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  console.log(`[Prune] Deleted ${errorLogsPruned.deletedCount} ErrorLog records.`);
  
  // 2. Prune historical CronExecutionLogs
  const cronLogsPruned = await CronExecutionLog.deleteMany({
    startedAt: { $lt: cutoffDate }
  });
  console.log(`[Prune] Deleted ${cronLogsPruned.deletedCount} CronExecutionLog records.`);
  
  await mongoose.disconnect();
  console.log('[Prune] Database disconnected. Pruning complete.');
}

prune().catch(err => {
  console.error('[Prune] Failed with error:', err);
  process.exit(1);
});
