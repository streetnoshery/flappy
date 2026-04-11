import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FollowDocument = Follow & Document;

@Schema({ timestamps: true })
export class Follow {
  /** The user who is following */
  @Prop({ required: true, index: true })
  followerId: string;

  /** The user being followed */
  @Prop({ required: true, index: true })
  followingId: string;

  createdAt?: Date;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);

// Compound unique index: a user can follow another user only once
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
