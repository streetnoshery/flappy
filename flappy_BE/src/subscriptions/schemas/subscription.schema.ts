import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true, default: false })
  isActive: boolean;

  @Prop()
  subscribedAt: Date;

  @Prop()
  unsubscribedAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
