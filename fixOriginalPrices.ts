import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import ProductSource from './src/models/ProductSource';

const MSRP_MAPPING: Record<string, number> = {
  'iphone-15-pro': 79900,
  'macbook-air-m3': 114900,
  'sony-wh-1000xm5': 34990,
  'samsung-galaxy-s24-ultra': 139999
};

async function main() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);

  for (const [productId, msrp] of Object.entries(MSRP_MAPPING)) {
    const res = await ProductSource.updateMany(
      { productId },
      { $set: { originalPrice: msrp, active: true } }
    );
    console.log(`Updated ${productId} sources to MSRP ${msrp}. Result:`, res);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
