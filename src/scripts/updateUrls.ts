import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import ProductSource from '../models/ProductSource';

async function update() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  
  console.log('[Migration] Connecting to database...');
  await mongoose.connect(uri);
  
  const realUrls = {
    Amazon: 'https://www.amazon.in/dp/B0B1TV8B39',
    Flipkart: 'https://www.flipkart.com/sony-wh-1000xm5-designed-adaptive-anc-30-hours-battery-life-bluetooth-wired-headset/p/itm549646b90f4d3',
    Croma: 'https://www.croma.com/sony-wh-1000xm5-bluetooth-headphone-with-mic-auto-noise-cancellation-optimizer-over-ear-black-/p/257321',
    'Reliance Digital': 'https://www.reliancedigital.in/sony-wh-1000xm5-wireless-industry-leading-active-noise-cancelling-headphones-black/p/492850913'
  };

  console.log('[Migration] Updating ProductSource records for sony-wh-1000xm5...');

  for (const [platform, url] of Object.entries(realUrls)) {
    const query = {
      productId: 'sony-wh-1000xm5',
      platform: platform
    };

    const updateDoc = {
      $set: {
        productUrl: url,
        active: true,
        status: 'Success' // initialize status
      }
    };

    const result = await ProductSource.updateOne(query, updateDoc, { upsert: true });
    console.log(`[Migration] Updated ${platform} source for sony-wh-1000xm5. Match: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`);
  }

  await mongoose.disconnect();
  console.log('[Migration] Completed successfully.');
}

update().catch(err => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
