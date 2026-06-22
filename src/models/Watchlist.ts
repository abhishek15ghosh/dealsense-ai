import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchlist extends Document {
  userEmail: string;
  productId: string; // references Product.customId
  productName?: string;
  productImage?: string;
  category?: string;
  bestPrice?: number;
  storeName?: string;
  rating?: number;
  savings?: number;
  createdAt: Date;
}

const WatchlistSchema = new Schema<IWatchlist>({
  userEmail: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  productName: { type: String },
  productImage: { type: String },
  category: { type: String },
  bestPrice: { type: Number },
  storeName: { type: String },
  rating: { type: Number },
  savings: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

// Enforce unique combinations of userEmail and productId
WatchlistSchema.index({ userEmail: 1, productId: 1 }, { unique: true });

export default mongoose.models.Watchlist || mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
