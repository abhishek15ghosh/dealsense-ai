import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import ProductSource from './src/models/ProductSource';

async function main() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);

  const sources = await ProductSource.find({});
  console.log('=== PRODUCTION DB PRODUCT SOURCES ===');
  sources.forEach(s => {
    console.log(`Product: ${s.productId} | Retailer: ${s.platform}`);
    console.log(`  currentPrice: ${s.currentPrice}`);
    console.log(`  originalPrice: ${s.originalPrice}`);
    console.log(`  status: ${s.status} | active: ${s.active}`);
    console.log(`  failureReason: "${s.failureReason}"`);
    console.log(`  lastChecked: ${s.lastChecked}`);
    console.log('---');
  });

  await mongoose.disconnect();
}

main().catch(console.error);
