import mongoose, { Schema, Document } from 'mongoose';

export interface IProductSource extends Document {
  productId: string; // references Product.customId
  title: string;
  brand: string;
  category: string;
  image: string;
  currentPrice: number;
  originalPrice: number;
  platform: string; // Amazon, Flipkart, Croma, Reliance Digital, Brand D2C, etc.
  productUrl: string;
  availability: string; // e.g. 'In Stock' | 'Out of Stock'
  lastChecked: Date;
}

const ProductSourceSchema = new Schema<IProductSource>({
  productId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  currentPrice: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  platform: { type: String, required: true },
  productUrl: { type: String, required: true },
  availability: { type: String, required: true },
  lastChecked: { type: Date, required: true, default: Date.now }
});

export default mongoose.models.ProductSource || mongoose.model<IProductSource>('ProductSource', ProductSourceSchema);
