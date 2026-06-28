import mongoose from 'mongoose';
import { loadEnvConfig } from '@next/env';
import Notification from '../models/Notification';

async function check() {
  loadEnvConfig(process.cwd());
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dealsense';
  await mongoose.connect(uri);
  const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(10).lean();
  console.log(JSON.stringify(notifications, null, 2));
  await mongoose.disconnect();
}

check().catch(console.error);
