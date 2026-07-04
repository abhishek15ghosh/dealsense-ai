import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import Product from '../models/Product';
import ProductSource from '../models/ProductSource';
import { getVerifiedBestDeal } from '../lib/priceUtils';

async function check() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);

  console.log('=== VERIFYING POSITIVE SAVINGS INTELLIGENCE ===');

  const products = await Product.find({});
  for (const prod of products) {
    const sources = await ProductSource.find({ productId: prod.customId });
    
    const simpleSources = sources.map(s => ({
      storeName: s.platform,
      price: s.currentPrice,
      originalPrice: s.originalPrice,
      url: s.productUrl,
      availability: s.availability,
      inStock: s.availability === 'In Stock',
      status: s.status,
      lastChecked: s.lastChecked
    }));

    const deal = getVerifiedBestDeal(simpleSources);

    console.log(`Product: ${prod.name}`);
    console.log(`- Database bestDealPrice: ₹${prod.bestDealPrice} (${prod.bestDealStore})`);
    console.log(`- Computed live best deal:`);
    console.log(`  * hasDeal: ${deal.hasDeal}`);
    console.log(`  * bestPrice: ₹${deal.bestPrice}`);
    console.log(`  * bestStore: ${deal.bestStore}`);
    console.log(`  * savingsPct: ${deal.savingsPct}%`);
    console.log(`  * originalPrice: ₹${deal.originalPrice}`);
    console.log('--------------------------------------------------');
  }

  await mongoose.disconnect();
}

check().catch(console.error);
