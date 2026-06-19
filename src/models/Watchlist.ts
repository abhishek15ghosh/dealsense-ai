import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchlist extends Document {
  userEmail: string;
  productId: string; // references Product.customId
  createdAt: Date;
}

const WatchlistSchema = new Schema<IWatchlist>({
  userEmail: { type: String, required: true, index: true },
  productId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Enforce unique combinations of userEmail and productId
WatchlistSchema.index({ userEmail: 1, productId: 1 }, { unique: true });

export default mongoose.models.Watchlist || mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
