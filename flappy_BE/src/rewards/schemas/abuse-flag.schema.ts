import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AbuseFlagDocument = AbuseFlag & Document;

@Schema({ timestamps: true })
export class AbuseFlag {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  reason: string;

  @Prop({
    required: true,
    enum: ['pending_review', 'resolved', 'confirmed'],
    default: 'pending_review',
  })
  status: string;

  @Prop()
  resolvedAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AbuseFlagSchema = SchemaFactory.createForClass(AbuseFlag);
