import dbConnect from '@/lib/mongodb';
import Watchlist from '@/models/Watchlist';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import Alert from '@/models/Alert';
import { fetchPriceForRetailer } from '@/services/retailerPriceService';

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
      
      // Fetch active ProductSource records for this product
      let sources = await ProductSource.find({ productId, active: true });
      
      // Auto-seed default Amazon mock ProductSource record if none exists
      if (sources.length === 0) {
        console.log(`[Monitoring Engine] Seeding default active ProductSource for ${productId}`);
        const defaultTitle = productDoc ? productDoc.name : productId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const defaultBestPrice = productDoc ? productDoc.bestDealPrice || 49999 : 49999;
        
        const newSource = await ProductSource.create({
          productId,
          title: defaultTitle,
          brand: productDoc ? productDoc.brand || 'Brand' : 'Brand',
          category: productDoc ? productDoc.category || 'Gadgets' : 'Gadgets',
          image: productDoc ? productDoc.image || `/images/${productId}.png` : `/images/${productId}.png`,
          currentPrice: defaultBestPrice,
          originalPrice: productDoc ? (productDoc.originalPrice || defaultBestPrice * 1.15) : defaultBestPrice * 1.15,
          platform: 'Amazon',
          retailer: 'Amazon',
          productUrl: `https://www.amazon.in/dp/mock-${productId}`,
          availability: 'In Stock',
          lastChecked: new Date(),
          active: true,
          status: 'Success'
        });
        sources = [newSource];
      }

      // Loop through all active sources and update their prices
      const fetchPromises = sources.map(async (source) => {
        try {
          const result = await fetchPriceForRetailer(source.retailer || source.platform, source.productUrl);
          
          if (result.success) {
            source.currentPrice = result.price;
            if (result.title && result.title !== 'Unknown Amazon Product') {
              source.title = result.title;
            }
            source.status = 'Success';
            source.availability = 'In Stock';
          } else {
            source.status = 'Failed';
            console.warn(`[Monitoring Engine] Fetch failed for ${source.retailer} URL ${source.productUrl}: ${result.error}`);
          }
          source.lastChecked = new Date();
          await source.save();
          return source;
        } catch (fetchErr) {
          console.error(`[Monitoring Engine] Failed to fetch price for source ${source._id}:`, fetchErr);
          source.status = 'Failed';
          source.lastChecked = new Date();
          await source.save();
          return source;
        }
      });

      await Promise.all(fetchPromises);

      // Reload successfully updated sources to find the best deal
      const successfulSources = await ProductSource.find({ productId, active: true, status: 'Success' });
      if (successfulSources.length === 0) {
        console.log(`[Monitoring Engine] No successful sources found for ${productId}. Skipping alerts.`);
        continue;
      }

      // Find the best platform and price
      let bestSource = successfulSources[0];
      for (const source of successfulSources) {
        if (source.currentPrice < bestSource.currentPrice) {
          bestSource = source;
        }
      }

      const newPrice = bestSource.currentPrice;
      const retailer = bestSource.retailer || bestSource.platform;
      const productName = productDoc ? productDoc.name : (bestSource.title || productId);

      // Find the last recorded price for this product from flat history records first
      const lastHistory = await PriceHistory.findOne({ productId, price: { $gt: 0 } }).sort({ timestamp: -1, _id: -1 });
      const oldPrice = lastHistory && lastHistory.price ? lastHistory.price : (productDoc ? productDoc.bestDealPrice : 0);

      console.log(`[Monitoring Engine] Product: ${productId}, Old Price: ₹${oldPrice}, New Price: ₹${newPrice} on ${retailer}`);

      // Save a new PriceHistory record
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      await PriceHistory.create({
        productId,
        productName,
        retailer,
        price: newPrice,
        timestamp: new Date(),
        date: todayStr
      });

      // Update current best price in Product details
      if (productDoc) {
        productDoc.bestDealPrice = newPrice;
        productDoc.bestDealStore = retailer;
        await productDoc.save();
      }

      checked++;

      // If price drops:
      if (oldPrice > 0 && newPrice < oldPrice) {
        const savings = oldPrice - newPrice;
        console.log(`[Monitoring Engine] Price drop detected for ${productId}! Savings: ₹${savings}`);

        // Find all watchers of this product
        const watchers = watchlistItems.filter((w) => w.productId === productId);
        for (const watcher of watchers) {
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
            createdAt: new Date()
          });

          alertsCreated++;

          // Create standard in-app notification
          try {
            const { createNotification } = await import('@/services/notificationService');
            await createNotification(
              watcher.userEmail,
              "Price Drop Detected",
              `Price dropped for ${productName} by ₹${savings.toLocaleString('en-IN')}. Current price is ₹${newPrice.toLocaleString('en-IN')}.`,
              "price_drop"
            );
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
