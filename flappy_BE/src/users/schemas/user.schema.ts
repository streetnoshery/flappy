import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ unique: true, sparse: true })
  phone: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  bio: string;

  @Prop()
  website: string;

  @Prop()
  profilePhotoUrl: string;
}

export const UserSchema = SchemaFactory.createForClass(User);