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
    decision: 'STRONG BUY' | 'BUY NOW' | 'WAIT' | 'STRONG WAIT' | 'HIGH RISK' | 'STRONG_BUY' | 'BUY_NOW' | 'STRONG_WAIT' | 'HIGH_RISK' | 'AVOID';
    confidence: number;
    reasoning: string[];
    summary: string;
    expectedBetterPriceRange?: string;
    bestPlatform?: string;
    estimatedSavings?: number;
    bestExpectedPurchaseDate?: string;
  };
  aiPricePrediction?: {
    nextPredictedDropDate?: string;
    predictedDropAmount?: number;
    confidenceScore?: number;
    forecast?: Array<{ date: string; price: number }>;
    analysis?: string;
    lastUpdated?: Date;
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
    decision: { type: String, required: true, enum: ['STRONG BUY', 'BUY NOW', 'WAIT', 'STRONG WAIT', 'HIGH RISK', 'STRONG_BUY', 'BUY_NOW', 'STRONG_WAIT', 'HIGH_RISK', 'AVOID'] },
    confidence: { type: Number, required: true },
    reasoning: [{ type: String }],
    summary: { type: String, required: true },
    expectedBetterPriceRange: { type: String },
    bestPlatform: { type: String },
    estimatedSavings: { type: Number, default: 0 },
    bestExpectedPurchaseDate: { type: String, default: 'Today' }
  },
  aiPricePrediction: {
    nextPredictedDropDate: { type: String },
    predictedDropAmount: { type: Number },
    confidenceScore: { type: Number },
    forecast: [{
      date: { type: String },
      price: { type: Number }
    }],
    analysis: { type: String },
    lastUpdated: { type: Date, default: Date.now }
  }
});

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
