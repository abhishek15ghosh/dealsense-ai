import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import ProductSource from './src/models/ProductSource';

async function main() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);

  const targetProducts = ['iphone-15-pro', 'macbook-air-m3', 'sony-wh-1000xm5', 'samsung-galaxy-s24-ultra'];
  console.log('Activating sources for:', targetProducts);

  const res = await ProductSource.updateMany(
    { productId: { $in: targetProducts } },
    { $set: { active: true } }
  );

  console.log('Update result:', res);
  await mongoose.disconnect();
}

main().catch(console.error);
