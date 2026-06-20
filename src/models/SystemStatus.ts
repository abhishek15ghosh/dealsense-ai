import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemStatus extends Document {
  lastRunAt: Date;
  nextRunAt: Date;
  alertsChecked: number;
  alertsTriggered: number;
  emailsSent: number;
  errorLogs: string[];
}

const SystemStatusSchema = new Schema<ISystemStatus>({
  lastRunAt: { type: Date, default: Date.now },
  nextRunAt: { type: Date, default: () => new Date(Date.now() + 15 * 60 * 1000) },
  alertsChecked: { type: Number, default: 0 },
  alertsTriggered: { type: Number, default: 0 },
  emailsSent: { type: Number, default: 0 },
  errorLogs: { type: [String], default: [] }
});

export default mongoose.models.SystemStatus || mongoose.model<ISystemStatus>('SystemStatus', SystemStatusSchema);
