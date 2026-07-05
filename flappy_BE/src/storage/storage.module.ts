import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { FileRecord, FileRecordSchema } from './schemas/file-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FileRecord.name, schema: FileRecordSchema }]),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
