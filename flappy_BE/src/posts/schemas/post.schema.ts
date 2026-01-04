import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: ['text', 'image', 'gif'] })
  type: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  mediaUrl: string;

  @Prop({ type: [String], default: [] })
  hashtags: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);