import dbConnect from '@/lib/mongodb';
import Watchlist from '@/models/Watchlist';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import Alert from '@/models/Alert';
import Notification from '@/models/Notification';
import { fetchPriceForRetailer } from '@/services/retailerPriceService';
import { mockProducts } from '@/data/mockProducts';
import { isValidSourceUrl, getVerifiedBestDeal, verifyUrlMatchesProduct } from '@/lib/priceUtils';


export async function runPriceMonitoringEngine() {
  console.log('[Monitoring Engine] Running real price monitoring checks...');
  await dbConnect();

  // 1. Read all watchlist items
  const watchlistItems = await Watchlist.find({});
  if (watchlistItems.length === 0) {
    console.log('[Monitoring Engine] No watchlist items to monitor.');
    return { checked: 0, alertsCreated: 0 };
  }

  const uniqueProductIds = Array.from(new Set(watchlistItems.map(item => item.productId)));
  let checked = 0;
  let alertsCreated = 0;

  for (const productId of uniqueProductIds) {
    try {
      const productDoc = await Product.findOne({ customId: productId });
      
      // Fetch ProductSource records for this product
      let sources = await ProductSource.find({ productId });
      
      // If no sources exist, do NOT seed mock sources.
      if (sources.length === 0) {
        console.log(`[Monitoring Engine] No ProductSources found for ${productId}. Skipping.`);
        if (productDoc) {
          productDoc.bestDealPrice = 0;
          productDoc.bestDealStore = 'None';
          await productDoc.save();
        }
        continue;
      }

      // Loop through all active sources and update their prices
      const fetchPromises = sources.map(async (source) => {
        try {
          const isValid = isValidSourceUrl(source.productUrl);
          if (!isValid) {
            source.active = false;
            source.status = 'Failed';
            source.currentPrice = undefined;
            source.availability = 'Unavailable';
            source.lastChecked = new Date();
            await source.save();
            return source;
          }

          const parentName = productDoc ? productDoc.name : source.title;
          if (!verifyUrlMatchesProduct(source.productUrl, source.productId, parentName)) {
            source.active = false;
            source.status = 'Failed';
            source.currentPrice = undefined;
            source.availability = 'Unavailable';
            source.failureReason = 'URL model keywords mismatch';
            source.scrapedAt = new Date();
            source.sourceUrl = source.productUrl;
            source.extractedPrice = undefined;
            source.scrapeStatus = 'Failed';
            source.productTitleMatched = false;
            source.pinCode = '110001 (Delhi Default)';
            source.lastChecked = new Date();
            await source.save();
            return source;
          }

          const result = await fetchPriceForRetailer(source.retailer || source.platform, source.productUrl);
          
          source.scrapedAt = new Date();
          source.sourceUrl = source.productUrl;
          source.extractedPrice = result.success ? result.price : undefined;
          source.scrapeStatus = result.success ? 'Success' : (result.error || 'Failed');
          source.productTitleMatched = result.success;
          source.pinCode = '110001 (Delhi Default)';

          if (result.success) {
            source.currentPrice = result.price;
            if (result.title && result.title !== 'Unknown Amazon Product') {
              source.title = result.title;
            }
            source.status = 'Success';
            source.availability = 'In Stock';
            source.active = true;
            source.failureReason = '';
          } else {
            source.active = false;
            source.status = 'Failed';
            source.currentPrice = undefined;
            source.availability = 'Unavailable';
            source.failureReason = result.error || 'Scraper failed';
            console.warn(`[Monitoring Engine] Fetch failed for ${source.retailer} URL ${source.productUrl}: ${result.error}`);
          }
          source.lastChecked = new Date();
          await source.save();
          return source;
        } catch (fetchErr) {
          console.error(`[Monitoring Engine] Failed to fetch price for source ${source._id}:`, fetchErr);
          source.scrapedAt = new Date();
          source.sourceUrl = source.productUrl;
          source.extractedPrice = undefined;
          source.scrapeStatus = 'Failed';
          source.productTitleMatched = false;
          source.pinCode = '110001 (Delhi Default)';
          source.active = false;
          source.status = 'Failed';
          source.currentPrice = undefined;
          source.availability = 'Unavailable';
          source.failureReason = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          source.lastChecked = new Date();
          await source.save();
          return source;
        }
      });

      await Promise.all(fetchPromises);

      // Reload successfully updated sources to find the best deal
      const allSources = await ProductSource.find({ productId });
      const deal = getVerifiedBestDeal(allSources);
      if (!deal.hasDeal) {
        console.log(`[Monitoring Engine] No successful sources found for ${productId}. Setting bestDealPrice to 0.`);
        if (productDoc) {
          productDoc.bestDealPrice = 0;
          productDoc.bestDealStore = 'None';
          await productDoc.save();
        }
        continue;
      }

      const newPrice = deal.bestPrice;
      const retailer = deal.bestStore;
      const productName = productDoc ? productDoc.name : productId;

      // Find the last recorded price for this product from flat history records first
      const lastHistory = await PriceHistory.findOne({ productId, price: { $gt: 0 } }).sort({ timestamp: -1, _id: -1 });
      const oldPrice = lastHistory && lastHistory.price ? lastHistory.price : (productDoc ? productDoc.bestDealPrice : 0);

      console.log(`[Monitoring Engine] Product: ${productId}, Old Price: ₹${oldPrice}, New Price: ₹${newPrice} on ${retailer}`);

      // Save a new PriceHistory record only if a valid verified best deal price exists
      if (newPrice > 0) {
        const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        await PriceHistory.create({
          productId,
          productName,
          retailer,
          price: newPrice,
          timestamp: new Date(),
          date: todayStr
        });
      }

      // Update current best price in Product details
      if (productDoc) {
        productDoc.bestDealPrice = newPrice;
        productDoc.bestDealStore = retailer;
        await productDoc.save();
      }

      checked++;

      // If price drops:
      if (oldPrice > 0 && newPrice > 0 && newPrice < oldPrice) {
        const savings = oldPrice - newPrice;
        console.log(`[Monitoring Engine] Price drop detected for ${productId}! Savings: ₹${savings}`);

        // Find all watchers of this product
        const watchers = watchlistItems.filter((w) => w.productId === productId);
        for (const watcher of watchers) {
          // Check if an alert was already triggered for this product/user with the exact same price
          const duplicateAlert = await Alert.findOne({
            userEmail: watcher.userEmail,
            productId,
            newPrice,
            status: 'triggered'
          }).exec();

          if (!duplicateAlert) {
            // Create price drop Alert record
            await Alert.create({
              userId: watcher.userEmail,
              userEmail: watcher.userEmail,
              productId,
              productName,
              productImage: watcher.productImage || (productDoc ? productDoc.image : `/images/${productId}.png`),
              targetPrice: 0,
              currentPriceAtSet: oldPrice || (productDoc ? productDoc.bestDealPrice : newPrice),
              currentPrice: newPrice,
              storeName: retailer,
              platform: retailer,
              oldPrice,
              newPrice,
              savings,
              read: false,
              isTriggered: true,
              status: 'triggered',
              triggeredAt: new Date(),
              createdAt: new Date()
            });

            alertsCreated++;
          }

          // Create standard in-app notification
          try {
            const { createNotification } = await import('@/services/notificationService');
            // Check if notification already exists to avoid duplicates
            const existingNotification = await Notification.findOne({
              userId: watcher.userEmail,
              productId,
              type: 'price_drop',
              message: { $regex: newPrice.toString() }
            }).exec();

            if (!existingNotification) {
              await createNotification(
                watcher.userEmail,
                "Price Drop Detected",
                `Price dropped for ${productName} by ₹${savings.toLocaleString('en-IN')}. Current price is ₹${newPrice.toLocaleString('en-IN')}.`,
                "price_drop",
                productId
              );
            }
          } catch (notifErr) {
            console.error('[Monitoring Engine] Notification trigger failed:', notifErr);
          }
        }
      }
    } catch (err) {
      console.error(`[Monitoring Engine] Error checking product ${productId}:`, err);
    }
  }

  return { checked, alertsCreated };
}
