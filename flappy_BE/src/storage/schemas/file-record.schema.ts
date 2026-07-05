import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FileRecordDocument = FileRecord & Document;

@Schema({ timestamps: true })
export class FileRecord {
  /** S3 key — e.g. users/<userId>/folder/photo.jpg */
  @Prop({ required: true, index: true })
  key: string;

  /** User who owns this file */
  @Prop({ required: true, index: true })
  ownerId: string;

  /** Original filename */
  @Prop({ required: true })
  originalName: string;

  /** MIME type reported by the client (informational) */
  @Prop({ required: true })
  mimeType: string;

  /** File size in bytes */
  @Prop({ required: true })
  size: number;

  /** Optional folder prefix (relative to user root) */
  @Prop({ default: '' })
  folderPrefix: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FileRecordSchema = SchemaFactory.createForClass(FileRecord);
