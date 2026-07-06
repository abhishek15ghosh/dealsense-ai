import mongoose from 'mongoose';
import { runScheduledPriceCheck } from './src/services/schedulerService';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);
  console.log('Connected to database:', uri);
  const stats = await runScheduledPriceCheck();
  console.log('Scheduled price check complete. Stats:', stats);
  await mongoose.disconnect();
}

main().catch(console.error);
