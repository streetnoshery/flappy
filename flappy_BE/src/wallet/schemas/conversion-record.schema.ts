import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversionRecordDocument = ConversionRecord & Document;

@Schema({ timestamps: true })
export class ConversionRecord {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  coinsConverted: number;

  @Prop({ required: true })
  conversionRate: number;

  @Prop({ required: true })
  payoutAmount: number;

  @Prop({
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversionRecordSchema =
  SchemaFactory.createForClass(ConversionRecord);
