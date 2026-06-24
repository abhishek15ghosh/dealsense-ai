import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailLog extends Document {
  to: string;
  subject: string;
  alertId?: string;
  productId?: string;
  status: 'success' | 'failed';
  error?: string;
  sentAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>({
  to: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  alertId: { type: String, index: true },
  productId: { type: String, index: true },
  status: { type: String, enum: ['success', 'failed'], required: true, index: true },
  error: { type: String },
  sentAt: { type: Date, default: Date.now, required: true }
});

export default mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
