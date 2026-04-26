import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyEngagementCountDocument = DailyEngagementCount & Document;

@Schema({ timestamps: true })
export class DailyEngagementCount {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD format

  @Prop({ required: true, default: 0 })
  count: number;
}

export const DailyEngagementCountSchema =
  SchemaFactory.createForClass(DailyEngagementCount);

// Unique compound index to ensure one record per user per day
DailyEngagementCountSchema.index({ userId: 1, date: 1 }, { unique: true });
