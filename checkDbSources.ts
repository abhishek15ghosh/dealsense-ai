import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import ProductSource from './src/models/ProductSource';

async function main() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);

  const sources = await ProductSource.find({ productId: 'iphone-15-pro' });
  console.log('=== PRODUCT SOURCES FOR IPHONE 15 PRO ===');
  sources.forEach(s => {
    console.log(`Retailer: ${s.platform}`);
    console.log(`  currentPrice: ${s.currentPrice}`);
    console.log(`  originalPrice: ${s.originalPrice}`);
    console.log(`  status: ${s.status}`);
    console.log(`  active: ${s.active}`);
    console.log(`  failureReason: "${s.failureReason}"`);
    console.log('---');
  });

  await mongoose.disconnect();
}

main().catch(console.error);
