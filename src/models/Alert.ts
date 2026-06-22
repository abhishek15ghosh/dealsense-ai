import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  userEmail?: string;
  userId?: string;
  productId: string; // references Product.customId
  productName?: string;
  productImage?: string;
  targetPrice?: number;
  currentPriceAtSet?: number;
  currentPrice?: number;
  isTriggered?: boolean;
  status?: 'active' | 'triggered' | 'cancelled';
  storeName?: string;
  platform?: string;
  createdAt: Date;
  triggeredAt?: Date;
  emailSentAt?: Date;

  // New fields for price monitoring engine
  oldPrice?: number;
  newPrice?: number;
  savings?: number;
  read?: boolean;
}

const AlertSchema = new Schema<IAlert>({
  userEmail: { type: String, index: true },
  userId: { type: String, index: true },
  productId: { type: String, required: true, index: true },
  productName: { type: String },
  productImage: { type: String },
  targetPrice: { type: Number },
  currentPriceAtSet: { type: Number },
  currentPrice: { type: Number },
  isTriggered: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'triggered', 'cancelled'], default: 'active' },
  storeName: { type: String },
  platform: { type: String },
  createdAt: { type: Date, default: Date.now },
  triggeredAt: { type: Date },
  emailSentAt: { type: Date },

  // New fields for price monitoring engine
  oldPrice: { type: Number },
  newPrice: { type: Number },
  savings: { type: Number },
  read: { type: Boolean, default: false }
});

export default mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);
