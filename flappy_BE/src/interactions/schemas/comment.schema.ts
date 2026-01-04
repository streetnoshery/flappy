import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ required: true })
  postId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  text: string;

  @Prop([{
    userId: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }])
  replies: Array<{
    userId: string;
    text: string;
    createdAt: Date;
  }>;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);