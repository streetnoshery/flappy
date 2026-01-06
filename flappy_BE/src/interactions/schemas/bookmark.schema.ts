import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Bookmark extends Document {
  @Prop({ required: true })
  userId: string; // UUID of the user who bookmarked

  @Prop({ required: true })
  postId: string; // ID of the bookmarked post

  @Prop({ required: true })
  postAuthorId: string; // ID of the post author (for validation)
}

export const BookmarkSchema = SchemaFactory.createForClass(Bookmark);

// Create compound index to ensure one bookmark per user per post
BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });