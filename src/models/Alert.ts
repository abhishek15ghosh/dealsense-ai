import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  userEmail: string;
  userId?: string;
  productId: string; // references Product.customId
  productName: string;
  productImage: string;
  targetPrice: number;
  currentPriceAtSet: number;
  currentPrice?: number;
  isTriggered: boolean;
  status: 'active' | 'triggered' | 'cancelled';
  storeName: string;
  platform?: string;
  createdAt: Date;
  triggeredAt?: Date;
}

const AlertSchema = new Schema<IAlert>({
  userEmail: { type: String, required: true, index: true },
  userId: { type: String },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productImage: { type: String, required: true },
  targetPrice: { type: Number, required: true },
  currentPriceAtSet: { type: Number, required: true },
  currentPrice: { type: Number },
  isTriggered: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'triggered', 'cancelled'], default: 'active' },
  storeName: { type: String, required: true },
  platform: { type: String },
  createdAt: { type: Date, default: Date.now },
  triggeredAt: { type: Date }
});

export default mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);
