import dbConnect from '@/lib/mongodb';
import SystemStatus from '@/models/SystemStatus';
import { trackProductPrices, TrackingStats } from '@/services/priceTracker';

// Scoped module variables to ensure the scheduler interval runs as a singleton
let isSchedulerInitialized = false;
let schedulerTimer: NodeJS.Timeout | null = null;

const SCHEDULER_INTERVAL = 15 * 60 * 1000; // 15 minutes

export async function runScheduledPriceCheck(): Promise<TrackingStats> {
  console.log('[Scheduler] Initiating scheduled price checking scan...');
  
  try {
    await dbConnect();
    
    // Execute the core product price tracking scan and alert evaluation
    const stats = await trackProductPrices();
    
    // Run the new price monitoring engine as well
    try {
      const { runPriceMonitoringEngine } = await import('@/services/monitoringService');
      const monitoringResult = await runPriceMonitoringEngine();
      console.log('[Scheduler] Price Monitoring Engine result:', monitoringResult);
      stats.alertsChecked += monitoringResult.checked;
      stats.alertsTriggered += monitoringResult.alertsCreated;
    } catch (monErr) {
      console.error('[Scheduler] Price Monitoring Engine failed:', monErr);
      stats.errors.push(`Price monitoring failed: ${monErr instanceof Error ? monErr.message : String(monErr)}`);
    }
    
    // Find or create single SystemStatus config doc
    let statusDoc = await SystemStatus.findOne({});
    if (!statusDoc) {
      statusDoc = new SystemStatus();
    }
    
    statusDoc.lastRunAt = new Date();
    statusDoc.nextRunAt = new Date(Date.now() + SCHEDULER_INTERVAL);
    statusDoc.alertsChecked = stats.alertsChecked;
    statusDoc.alertsTriggered = stats.alertsTriggered;
    statusDoc.emailsSent = stats.emailsSent;
    statusDoc.errorLogs = stats.errors;
    
    await statusDoc.save();
    
    console.log('[Scheduler] Scheduled price checking completed successfully:', {
      alertsChecked: stats.alertsChecked,
      alertsTriggered: stats.alertsTriggered,
      emailsSent: stats.emailsSent,
      errorsCount: stats.errors.length
    });
    
    return stats;
  } catch (error) {
    console.error('[Scheduler] Critical error during scheduled check execution:', error);
    
    // Save error in system status if possible
    try {
      let statusDoc = await SystemStatus.findOne({});
      if (!statusDoc) {
        statusDoc = new SystemStatus();
      }
      statusDoc.lastRunAt = new Date();
      statusDoc.nextRunAt = new Date(Date.now() + SCHEDULER_INTERVAL);
      statusDoc.errorLogs = [error instanceof Error ? error.message : String(error)];
      await statusDoc.save();
    } catch (dbErr) {
      console.error('[Scheduler] Failed to write critical error to DB:', dbErr);
    }
    
    return {
      alertsChecked: 0,
      alertsTriggered: 0,
      emailsSent: 0,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export function initScheduler(): void {
  if (isSchedulerInitialized) {
    return;
  }
  
  isSchedulerInitialized = true;
  console.log('[Scheduler] Initializing interval-based background tracker...');
  
  // Set up the interval timer to trigger automatically
  schedulerTimer = setInterval(async () => {
    try {
      await runScheduledPriceCheck();
    } catch (intervalErr) {
      console.error('[Scheduler] Interval check exception:', intervalErr);
    }
  }, SCHEDULER_INTERVAL);
  
  // Unref the timer so it doesn't block process exit if needed (primarily for scripts/testing)
  if (schedulerTimer && typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
}
