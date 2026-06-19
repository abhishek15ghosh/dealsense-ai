import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceHistory extends Document {
  productId: string; // references Product.customId
  date: string; // e.g. "May 20"
  Amazon?: number;
  Flipkart?: number;
  Croma?: number;
  'Reliance Digital'?: number;
}

const PriceHistorySchema = new Schema<IPriceHistory>({
  productId: { type: String, required: true, index: true },
  date: { type: String, required: true },
  Amazon: { type: Number },
  Flipkart: { type: Number },
  Croma: { type: Number },
  'Reliance Digital': { type: Number }
}, { strict: false });

export default mongoose.models.PriceHistory || mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
