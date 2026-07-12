import mongoose, { Schema, Document } from 'mongoose';

export interface IProductSource extends Document {
  productId: string; // references Product.customId
  title: string;
  brand: string;
  category: string;
  image: string;
  currentPrice?: number;
  originalPrice: number;
  platform: string; // Amazon, Flipkart, Croma, Reliance Digital, Brand D2C, etc.
  retailer?: string; // Amazon, Flipkart, Croma, Reliance Digital, etc.
  productUrl: string;
  availability: string; // e.g. 'In Stock' | 'Out of Stock'
  lastChecked: Date;
  active?: boolean;
  status?: 'Success' | 'Failed';
  failureReason?: string;
  scrapedAt?: Date;
  sourceUrl?: string;
  extractedPrice?: number;
  scrapeStatus?: string;
  productTitleMatched?: boolean;
  pinCode?: string;
  dataSource?: string;
}

const ProductSourceSchema = new Schema<IProductSource>({
  productId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  currentPrice: { type: Number, required: false },
  originalPrice: { type: Number, required: true },
  platform: { type: String, required: true },
  retailer: { type: String },
  productUrl: { type: String, required: true },
  availability: { type: String, required: true },
  lastChecked: { type: Date, required: true, default: Date.now },
  active: { type: Boolean, default: true },
  status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
  failureReason: { type: String },
  scrapedAt: { type: Date },
  sourceUrl: { type: String },
  extractedPrice: { type: Number },
  scrapeStatus: { type: String },
  productTitleMatched: { type: Boolean },
  pinCode: { type: String },
  dataSource: { type: String, default: 'scrape' }
});

ProductSourceSchema.index({ productId: 1, platform: 1 }, { unique: true });

if (mongoose.models && mongoose.models.ProductSource) {
  delete mongoose.models.ProductSource;
}

export default mongoose.model<IProductSource>('ProductSource', ProductSourceSchema);
