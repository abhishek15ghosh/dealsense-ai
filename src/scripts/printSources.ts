import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import ProductSource from '../models/ProductSource';

async function check() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);

  const sources = await ProductSource.find({ productId: 'iphone-15-pro' });
  console.log('=== SOURCES FOR iphone-15-pro ===');
  sources.forEach(s => {
    console.log(`Platform: ${s.platform}`);
    console.log(`- currentPrice: ${s.currentPrice}`);
    console.log(`- originalPrice: ${s.originalPrice}`);
    console.log(`- url: ${s.productUrl}`);
    console.log(`- active: ${s.active}`);
    console.log(`- status: ${s.status}`);
    console.log(`- availability: ${s.availability}`);
    console.log(`- lastChecked: ${s.lastChecked}`);
    console.log('---');
  });

  await mongoose.disconnect();
}

check().catch(console.error);
