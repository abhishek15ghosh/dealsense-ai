import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import Product from './src/models/Product';

async function main() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);

  const products = await Product.find({});
  console.log('=== PRODUCTS IN DB ===');
  products.forEach(p => {
    console.log(`Name: ${p.name}`);
    console.log(`  customId: ${p.customId}`);
    console.log(`  originalPrice: ${p.originalPrice}`);
    console.log(`  bestDealPrice: ${p.bestDealPrice}`);
    console.log(`  bestDealStore: ${p.bestDealStore}`);
    console.log('---');
  });

  await mongoose.disconnect();
}

main().catch(console.error);
