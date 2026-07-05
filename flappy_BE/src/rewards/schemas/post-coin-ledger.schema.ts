import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostCoinLedgerDocument = PostCoinLedger & Document;

@Schema({ timestamps: true })
export class PostCoinLedger {
  @Prop({ required: true, index: true })
  postId: string;

  @Prop({ required: true, index: true })
  ownerId: string;

  @Prop({ required: true, default: 0 })
  coinBalance: number;

  @Prop({ required: true, default: false })
  thresholdReached: boolean;

  @Prop()
  thresholdReachedAt: Date;

  @Prop({ required: true, default: false })
  converted: boolean;

  @Prop()
  convertedAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostCoinLedgerSchema = SchemaFactory.createForClass(PostCoinLedger);

// Compound index for wallet summary aggregation (filter by ownerId + thresholdReached)
PostCoinLedgerSchema.index({ ownerId: 1, thresholdReached: 1 });

// Compound index for sorted per-post earnings list (sort by coinBalance desc per owner)
PostCoinLedgerSchema.index({ ownerId: 1, coinBalance: -1 });
