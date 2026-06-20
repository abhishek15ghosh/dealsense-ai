import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import ProductSource from '@/models/ProductSource';
import PriceHistory from '@/models/PriceHistory';
import { searchProductSources } from '@/services/productSources';
import { calculatePriceTrend } from '@/lib/priceUtils';

export interface TrackingStats {
  alertsChecked: number;
  alertsTriggered: number;
  emailsSent: number;
  errors: string[];
}

export async function trackProductPrices(): Promise<TrackingStats> {
  const stats: TrackingStats = {
    alertsChecked: 0,
    alertsTriggered: 0,
    emailsSent: 0,
    errors: []
  };

  try {
    await dbConnect();

    // 1. Fetch all active products
    const products = await Product.find({});

    for (const product of products) {
      try {
        const customId = product.customId;

        // 2. Query adapters for relevant listings
        const listings = await searchProductSources(product.name);
        
        // Filter listings relevant to this product
        const relevantListings = listings.filter((listing) => {
          const titleLower = listing.title.toLowerCase();
          const nameLower = product.name.toLowerCase();
          return (
            titleLower.includes(customId) ||
            customId.includes(titleLower) ||
            nameLower.includes(titleLower) ||
            titleLower.includes(nameLower)
          );
        });

        if (relevantListings.length === 0) continue;

        // 3. Save latest prices
        for (const listing of relevantListings) {
          const source = await ProductSource.findOne({ productId: customId, platform: listing.platform });
          if (source) {
            const prevPrice = source.currentPrice;
            const newPrice = listing.currentPrice;

            source.currentPrice = listing.currentPrice;
            source.originalPrice = listing.originalPrice;
            source.availability = listing.availability;
            source.lastChecked = new Date();
            await source.save();

            // Check if price dropped by 5% or more
            if (newPrice < prevPrice) {
              const dropPercent = Math.round(((prevPrice - newPrice) / prevPrice) * 100);
              if (dropPercent >= 5) {
                const Watchlist = (await import('@/models/Watchlist')).default;
                const watchers = await Watchlist.find({ productId: customId });
                const { createNotification } = await import('@/services/notificationService');
                for (const w of watchers) {
                  await createNotification(
                    w.userEmail,
                    "Price Drop Detected",
                    `Price dropped by ${dropPercent}% since last recorded scan.`,
                    "price_drop"
                  );
                }
              }
            }
          } else {
            await ProductSource.create({
              productId: customId,
              title: listing.title,
              brand: listing.brand,
              category: listing.category,
              image: listing.image,
              currentPrice: listing.currentPrice,
              originalPrice: listing.originalPrice,
              platform: listing.platform,
              productUrl: listing.productUrl,
              availability: listing.availability,
              lastChecked: new Date()
            });
          }
        }

        // 4. Update parent product's best deal indicators
        const allSources = await ProductSource.find({ productId: customId });
        if (allSources.length > 0) {
          let bestSource = allSources[0];
          for (const src of allSources) {
            if (src.currentPrice < bestSource.currentPrice) {
              bestSource = src;
            }
          }
          product.bestDealPrice = bestSource.currentPrice;
          product.bestDealStore = bestSource.platform;
        }

        // 5. Store history in PriceHistory collection
        const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        
        const historyPoint = await PriceHistory.findOne({ productId: customId, date: todayStr });
        const historyObj: Record<string, string | number> = historyPoint
          ? (historyPoint.toObject ? historyPoint.toObject() : historyPoint)
          : { productId: customId, date: todayStr };

        relevantListings.forEach((listing) => {
          historyObj[listing.platform] = listing.currentPrice;
        });

        if (historyPoint) {
          Object.keys(historyObj).forEach((key) => {
            if (key !== '_id' && key !== '__v') {
              historyPoint.set(key, historyObj[key]);
            }
          });
          await historyPoint.save();
        } else {
          await PriceHistory.create(historyObj);
        }

        // 6. Compute lowest, highest, and priceTrend stats
        const allHistory = await PriceHistory.find({ productId: customId });
        
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        allHistory.forEach((hPoint) => {
          const raw = hPoint.toObject ? hPoint.toObject() : hPoint;
          Object.keys(raw).forEach((key) => {
            if (!['productId', 'date', '_id', '__v'].includes(key) && typeof raw[key] === 'number') {
              const val = raw[key] as number;
              if (val < minPrice) minPrice = val;
              if (val > maxPrice) maxPrice = val;
            }
          });
        });

        product.lowestRecordedPrice = minPrice !== Infinity ? minPrice : product.bestDealPrice;
        product.highestRecordedPrice = maxPrice !== -Infinity ? maxPrice : product.bestDealPrice * 1.1;
        product.priceTrend = calculatePriceTrend(allHistory);
        
        await product.save();

        // 7. Evaluate active alerts for this product
        const Alert = (await import('@/models/Alert')).default;
        const activeAlerts = await Alert.find({ productId: customId, status: 'active' });
        
        for (const alert of activeAlerts) {
          stats.alertsChecked++;
          // Find the price on the requested store
          const platformPriceSource = allSources.find((s) => s.platform === alert.storeName);
          // Fallback: if store price not found, check best deal price
          const latestPrice = platformPriceSource ? platformPriceSource.currentPrice : product.bestDealPrice;
          
          // Update the current price in the alert
          alert.currentPrice = latestPrice;
          
          if (latestPrice <= alert.targetPrice) {
            alert.status = 'triggered';
            alert.isTriggered = true;
            alert.triggeredAt = new Date();
            console.log(`[ALERT TRIGGERED] Product: ${product.name}, Target: ₹${alert.targetPrice}, Current: ₹${latestPrice} on ${alert.storeName}`);
            
            stats.alertsTriggered++;

            // Trigger notification
            const { createNotification } = await import('@/services/notificationService');
            await createNotification(
              alert.userEmail,
              "Price Target Reached",
              `${product.name} is now ₹${latestPrice.toLocaleString('en-IN')} and has reached your target price of ₹${alert.targetPrice.toLocaleString('en-IN')}.`,
              "alert_triggered"
            );

            // Trigger email if not already sent
            if (!alert.emailSentAt) {
              try {
                const { sendPriceTargetReachedEmail } = await import('@/services/emailService');
                const sentResult = await sendPriceTargetReachedEmail(alert, latestPrice);
                if (sentResult) {
                  stats.emailsSent++;
                }
              } catch (emailErr) {
                console.error('Error sending alert email:', emailErr);
                stats.errors.push(`Email send failed for ${alert.userEmail}: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`);
              }
            }
          }
          await alert.save();
        }
      } catch (innerErr) {
        console.error(`Error tracking product ${product.name}:`, innerErr);
        stats.errors.push(`Product ${product.name} tracking failed: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
      }
    }
  } catch (outerErr) {
    console.error('Global error in price tracking execution:', outerErr);
    stats.errors.push(`Global tracking error: ${outerErr instanceof Error ? outerErr.message : String(outerErr)}`);
  }

  return stats;
}
