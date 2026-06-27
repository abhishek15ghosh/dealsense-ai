import mongoose, { Schema, Document } from 'mongoose';

export interface IErrorLog extends Document {
  timestamp: Date;
  errorName: string;
  errorMessage: string;
  errorStack?: string;
  component: string;
  path?: string;
  severity: 'ERROR' | 'WARNING' | 'CRITICAL';
  resolved: boolean;
}

const ErrorLogSchema = new Schema<IErrorLog>({
  timestamp: { type: Date, default: Date.now, index: true },
  errorName: { type: String, required: true },
  errorMessage: { type: String, required: true },
  errorStack: { type: String },
  component: { type: String, required: true, index: true },
  path: { type: String },
  severity: { type: String, enum: ['ERROR', 'WARNING', 'CRITICAL'], default: 'ERROR', index: true },
  resolved: { type: Boolean, default: false, index: true }
});

export default mongoose.models.ErrorLog || mongoose.model<IErrorLog>('ErrorLog', ErrorLogSchema);
