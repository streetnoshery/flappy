import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CoinTransactionDocument = CoinTransaction & Document;

@Schema({ timestamps: true })
export class CoinTransaction {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  amount: number; // positive = credit, negative = debit

  @Prop({
    required: true,
    enum: [
      'engagement_earned',
      'engagement_received',
      'engagement_reversed',
      'conversion',
    ],
  })
  eventType: string;

  @Prop({ index: true })
  relatedPostId: string;

  @Prop()
  relatedUserId: string;

  @Prop()
  description: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CoinTransactionSchema =
  SchemaFactory.createForClass(CoinTransaction);

// Compound index for efficient paginated queries (wallet transaction history)
CoinTransactionSchema.index({ userId: 1, createdAt: -1 });
