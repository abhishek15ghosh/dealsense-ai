import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string; // Storing the user email or ID
  productId?: string;
  title: string;
  message: string;
  type: 'price_drop' | 'alert_triggered' | 'ai_recommendation' | 'system';
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: String, required: true, index: true },
  productId: { type: String, required: false, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['price_drop', 'alert_triggered', 'ai_recommendation', 'system'],
    required: true
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
