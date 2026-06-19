import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  customId: string; // matches frontend product.id (e.g. "iphone-15-pro")
  name: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  reviewsCount: number;
  bestDealStore: string;
  bestDealPrice: number;
  lowestRecordedPrice?: number;
  highestRecordedPrice?: number;
  priceTrend?: 'up' | 'down' | 'stable';
  aiRecommendation: {
    decision: 'BUY NOW' | 'WAIT' | 'AVOID' | 'BUY_NOW';
    confidence: number;
    reasoning: string[];
    summary: string;
    expectedBetterPriceRange?: string;
    bestPlatform?: string;
  };
}

const ProductSchema = new Schema<IProduct>({
  customId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  rating: { type: Number, required: true },
  reviewsCount: { type: Number, required: true },
  bestDealStore: { type: String, required: true },
  bestDealPrice: { type: Number, required: true },
  lowestRecordedPrice: { type: Number },
  highestRecordedPrice: { type: Number },
  priceTrend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
  aiRecommendation: {
    decision: { type: String, required: true, enum: ['BUY NOW', 'WAIT', 'AVOID', 'BUY_NOW'] },
    confidence: { type: Number, required: true },
    reasoning: [{ type: String }],
    summary: { type: String, required: true },
    expectedBetterPriceRange: { type: String },
    bestPlatform: { type: String }
  }
});

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
