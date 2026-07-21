import dbConnect from '@/lib/mongodb';
import SystemStatus from '@/models/SystemStatus';
import { trackProductPrices, TrackingStats } from '@/services/priceTracker';

// Scoped module variables to ensure the scheduler interval runs as a singleton
let isSchedulerInitialized = false;
let schedulerTimer: NodeJS.Timeout | null = null;

const SCHEDULER_INTERVAL = 15 * 60 * 1000; // 15 minutes

export async function runScheduledPriceCheck(): Promise<TrackingStats> {
  console.log('[Scheduler] Initiating scheduled price checking scan...');
  const startTime = Date.now();
  
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
      
      const { default: Logger } = await import('@/lib/logger');
      Logger.error('Price monitoring sub-engine failure', monErr, 'SCHEDULER');
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

    // Log the historical cron execution run
    try {
      const CronExecutionLog = (await import('@/models/CronExecutionLog')).default;
      await CronExecutionLog.create({
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        status: stats.errors.length > 0 ? 'FAILED' : 'SUCCESS',
        alertsChecked: stats.alertsChecked,
        alertsTriggered: stats.alertsTriggered,
        emailsSent: stats.emailsSent,
        errorMsgs: stats.errors,
        triggeredBy: process.env.NODE_ENV === 'production' ? 'CRON' : 'MANUAL'
      });
    } catch (logErr) {
      console.error('[Scheduler] Failed to write CronExecutionLog:', logErr);
    }
    
    console.log('[Scheduler] Scheduled price checking completed successfully:', {
      alertsChecked: stats.alertsChecked,
      alertsTriggered: stats.alertsTriggered,
      emailsSent: stats.emailsSent,
      errorsCount: stats.errors.length
    });
    
    return stats;
  } catch (error) {
    console.error('[Scheduler] Critical error during scheduled check execution:', error);
    const endTime = Date.now();
    
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

    // Log the failed historical run
    try {
      const CronExecutionLog = (await import('@/models/CronExecutionLog')).default;
      await CronExecutionLog.create({
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        durationMs: endTime - startTime,
        status: 'FAILED',
        alertsChecked: 0,
        alertsTriggered: 0,
        emailsSent: 0,
        errorMsgs: [error instanceof Error ? error.message : String(error)],
        triggeredBy: process.env.NODE_ENV === 'production' ? 'CRON' : 'MANUAL'
      });
    } catch (logErr) {
      console.error('[Scheduler] Failed to write failed CronExecutionLog:', logErr);
    }

    // Write to central Logger
    const { default: Logger } = await import('@/lib/logger');
    Logger.error('Critical scheduler run failure', error, 'SCHEDULER');
    
    return {
      alertsChecked: 0,
      alertsTriggered: 0,
      emailsSent: 0,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export async function runScheduledSerpApiCheck(): Promise<{ success: boolean; refreshed: string[]; errors: string[] }> {
  console.log('[Scheduler] Initiating scheduled SerpAPI price checking scan...');
  const refreshed: string[] = [];
  const errors: string[] = [];
  
  try {
    await dbConnect();
    
    // 1. Get all watchlisted product customIds
    const Watchlist = (await import('@/models/Watchlist')).default;
    const watchlistedProductIds = await Watchlist.find().distinct('productId');
    if (watchlistedProductIds.length === 0) {
      console.log('[Scheduler] No watchlisted products. Skipping SerpAPI check.');
      return { success: true, refreshed, errors };
    }
    
    // 2. Identify products that have SerpAPI sources
    const ProductSource = (await import('@/models/ProductSource')).default;
    const serpApiProductIds = await ProductSource.find({
      productId: { $in: watchlistedProductIds },
      dataSource: 'serpapi'
    }).distinct('productId');
    
    if (serpApiProductIds.length === 0) {
      console.log('[Scheduler] No watchlisted SerpAPI products found.');
      return { success: true, refreshed, errors };
    }
    
    // 3. For each product, check if it needs refresh (e.g. older than 12 hours)
    // And limit to at most 1 query per run to respect quota strictly.
    const SERPAPI_MIN_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
    const now = Date.now();
    
    const { refreshProductPricesWithSerpApi } = await import('@/services/serpApiShoppingService');
    
    for (const productId of serpApiProductIds) {
      const sources = await ProductSource.find({ productId, dataSource: 'serpapi' });
      const lastCheckedTimes = sources.map(s => s.lastChecked ? new Date(s.lastChecked).getTime() : 0);
      const oldestCheck = lastCheckedTimes.length > 0 ? Math.min(...lastCheckedTimes) : 0;
      
      if (now - oldestCheck >= SERPAPI_MIN_CHECK_INTERVAL_MS) {
        console.log(`[Scheduler] Product "${productId}" SerpAPI price check is stale. Refreshing...`);
        const res = await refreshProductPricesWithSerpApi(productId);
        if (res.success) {
          refreshed.push(productId);
        } else {
          errors.push(`Failed to refresh ${productId}: ${res.error}`);
        }
        
        // Limit to at most 1 product update per scheduled run to respect quota
        break; 
      }
    }
    
    return { success: true, refreshed, errors };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Scheduler] Scheduled SerpAPI check failed:', error);
    return { success: false, refreshed, errors: [msg] };
  }
}

export function initScheduler(): void {
  if (isSchedulerInitialized) {
    return;
  }
  
  // Skip stateful background intervals when running in serverless production environments
  if (process.env.NODE_ENV === 'production') {
    console.log('[Scheduler] Running in production mode. Stateful interval scheduler skipped.');
    isSchedulerInitialized = true;
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
