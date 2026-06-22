import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistory extends Document {
  productId: string; // references Product.customId
  date?: string; // pivot-style e.g. "May 20"
  Amazon?: number;
  Flipkart?: number;
  Croma?: number;
  'Reliance Digital'?: number;

  // New fields for monitoring engine
  productName?: string;
  retailer?: string;
  price?: number;
  timestamp?: Date;
}

const PriceHistorySchema = new Schema<IPriceHistory>({
  productId: { type: String, required: true, index: true },
  date: { type: String },
  Amazon: { type: Number },
  Flipkart: { type: Number },
  Croma: { type: Number },
  'Reliance Digital': { type: Number },

  // New fields for monitoring engine
  productName: { type: String },
  retailer: { type: String },
  price: { type: Number },
  timestamp: { type: Date, default: Date.now }
}, { strict: false });

export default mongoose.models.PriceHistory || mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
