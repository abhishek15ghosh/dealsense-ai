import mongoose, { Schema, Document } from 'mongoose';

export interface ICronExecutionLog extends Document {
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED';
  alertsChecked: number;
  alertsTriggered: number;
  emailsSent: number;
  errorMsgs: string[];
  triggeredBy: 'CRON' | 'MANUAL';
}

const CronExecutionLogSchema = new Schema<ICronExecutionLog>({
  startedAt: { type: Date, required: true, index: true },
  completedAt: { type: Date, required: true },
  durationMs: { type: Number, required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true, index: true },
  alertsChecked: { type: Number, default: 0 },
  alertsTriggered: { type: Number, default: 0 },
  emailsSent: { type: Number, default: 0 },
  errorMsgs: { type: [String], default: [] },
  triggeredBy: { type: String, enum: ['CRON', 'MANUAL'], default: 'CRON', index: true }
});

export default mongoose.models.CronExecutionLog || mongoose.model<ICronExecutionLog>('CronExecutionLog', CronExecutionLogSchema);
