import dbConnect from '@/lib/mongodb';
import Watchlist from '@/models/Watchlist';
import Product from '@/models/Product';
import PriceHistory from '@/models/PriceHistory';
import Alert from '@/models/Alert';
import { searchProductSources } from '@/services/productSources';

export async function runPriceMonitoringEngine() {
  console.log('[Monitoring Engine] Running price monitoring checks...');
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
      const productName = productDoc ? productDoc.name : productId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      // Find the last recorded price for this product from flat history records first
      const lastHistory = await PriceHistory.findOne({ productId, price: { $gt: 0 } }).sort({ timestamp: -1, _id: -1 });
      const oldPrice = lastHistory && lastHistory.price ? lastHistory.price : (productDoc ? productDoc.bestDealPrice : 0);

      // Fetch latest price from crawlers
      const searchName = productDoc ? productDoc.name : productName;
      const listings = await searchProductSources(searchName);
      
      const relevantListings = listings.filter((listing) => {
        const titleLower = listing.title.toLowerCase();
        const idLower = productId.toLowerCase();
        const cleanId = idLower.replace(/-/g, ' ');
        const nameLower = productDoc ? productDoc.name.toLowerCase() : '';
        return (
          titleLower.includes(idLower) ||
          idLower.includes(titleLower) ||
          titleLower.includes(cleanId) ||
          (nameLower !== '' && (titleLower.includes(nameLower) || nameLower.includes(titleLower)))
        );
      });

      if (relevantListings.length === 0) {
        console.log(`[Monitoring Engine] No listings found for ${productId}.`);
        continue;
      }

      // Find the best platform and price
      let bestListing = relevantListings[0];
      for (const listing of relevantListings) {
        if (listing.currentPrice < bestListing.currentPrice) {
          bestListing = listing;
        }
      }

      const newPrice = bestListing.currentPrice;
      const retailer = bestListing.platform;

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
        console.log(`[Monitoring Engine] Price drop detected! Savings: ₹${savings}`);

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
