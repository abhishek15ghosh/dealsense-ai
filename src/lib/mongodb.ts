import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const connectionString = MONGODB_URI || 'mongodb://localhost:27017/dealsense';

// Extend the NodeJS global type to store a cached mongoose connection
interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCached: GlobalMongoose | undefined;
}

if (!globalThis.mongooseCached) {
  globalThis.mongooseCached = { conn: null, promise: null };
}

const cached = globalThis.mongooseCached;

async function dbConnect() {
  if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI environment variable is missing. Please set MONGODB_URI in your production configuration.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(connectionString, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Auto-initialize background price checking scheduler
    try {
      const { initScheduler } = await import('@/services/schedulerService');
      initScheduler();
    } catch (schedErr) {
      console.error('Failed to auto-start background scheduler:', schedErr);
    }
  } catch (e) {
    cached.promise = null;
    console.error('Database connection failed:', e);
    throw new Error(`Database connection failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return cached.conn;
}

export default dbConnect;
