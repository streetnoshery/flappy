import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  UnauthorizedException,
  Req,
  Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { CreateFolderDto, GetUploadUrlDto, ConfirmUploadDto } from './dto/storage.dto';
import { Request, Response } from 'express';

/** Pull the verified userId out of the JWT payload attached by JwtAuthGuard. */
function getAuthUserId(req: Request): string {
  const userId = (req as any).user?.userId;
  if (!userId) throw new UnauthorizedException('Authentication required');
  return userId;
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * POST /storage/upload-url
   * Returns a presigned PUT URL. Client PUTs the file directly to S3 — no proxy through Node.
   * Files > 8 MB: client should use @aws-sdk/lib-storage multipart on their side.
   */
  @Post('upload-url')
  async getUploadUrl(@Body() dto: GetUploadUrlDto, @Req() req: Request) {
    const userId = getAuthUserId(req);
    console.log('🔑 [STORAGE] POST /storage/upload-url', { userId, filename: dto.filename, size: dto.size, timestamp: new Date().toISOString() });
    const result = await this.storageService.getUploadUrl(userId, dto.filename, dto.mimeType, dto.size, dto.folderPrefix);
    return { success: true, ...result };
  }

  /**
   * POST /storage/confirm
   * Called by client after a successful PUT to the presigned URL.
   * Saves { key, size, mimeType, ownerId } to MongoDB.
   */
  @Post('confirm')
  async confirmUpload(@Body() dto: ConfirmUploadDto, @Req() req: Request) {
    const userId = getAuthUserId(req);
    console.log('✅ [STORAGE] POST /storage/confirm', { userId, key: dto.key, timestamp: new Date().toISOString() });
    const record = await this.storageService.confirmUpload(userId, dto.key, dto.originalName, dto.mimeType, dto.size, dto.folderPrefix);
    return { success: true, fileId: record._id, key: record.key };
  }

  /**
   * GET /storage/files/:id/download-url
   * Returns a presigned GET URL (15 min) for a confirmed file by its MongoDB ID.
   */
  @Get('files/:id/download-url')
  async getDownloadUrlById(@Param('id') fileId: string, @Req() req: Request) {
    const userId = getAuthUserId(req);
    console.log('🔗 [STORAGE] GET /storage/files/:id/download-url', { userId, fileId, timestamp: new Date().toISOString() });
    const result = await this.storageService.getDownloadUrlById(userId, fileId);
    return { success: true, ...result };
  }

  /**
   * POST /storage/upload  (legacy — server-proxied, kept for backward compat)
   * Multipart/form-data: files[] + optional folderPrefix
   */
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folderPrefix') folderPrefix: string,
    @Req() req: Request,
  ) {
    const userId = getAuthUserId(req);

    console.log('📤 [STORAGE] POST /storage/upload', {
      userId,
      fileCount: files?.length,
      folderPrefix,
      timestamp: new Date().toISOString(),
    });

    const results = await this.storageService.uploadFiles(userId, files, folderPrefix);
    return { success: true, uploaded: results };
  }

  /**
   * POST /storage/folder
   * Body: { folderName, parentPrefix? }
   * Identity always taken from the JWT.
   */
  @Post('folder')
  async createFolder(@Body() dto: CreateFolderDto, @Req() req: Request) {
    const userId = getAuthUserId(req);

    console.log('📁 [STORAGE] POST /storage/folder', {
      userId,
      folderName: dto.folderName,
      parentPrefix: dto.parentPrefix,
      timestamp: new Date().toISOString(),
    });

    const result = await this.storageService.createFolder(userId, dto.folderName, dto.parentPrefix);
    return { success: true, ...result };
  }

  /**
   * GET /storage/list?prefix=optional
   * Lists only the authenticated user's own files — prefix is scoped server-side.
   */
  @Get('list')
  async listObjects(
    @Query('prefix') prefix: string,
    @Req() req: Request,
  ) {
    const userId = getAuthUserId(req);

    console.log('📋 [STORAGE] GET /storage/list', {
      userId,
      prefix,
      timestamp: new Date().toISOString(),
    });

    const result = await this.storageService.listObjects(userId, prefix);
    return { success: true, ...result };
  }

  /**
   * GET /storage/download?key=users/<own-id>/file.jpg
   * Server verifies the key belongs to the authenticated user before presigning.
   */
  @Get('download')
  async getDownloadUrl(
    @Query('key') key: string,
    @Req() req: Request,
  ) {
    const userId = getAuthUserId(req);

    if (!key) throw new BadRequestException('key is required');

    console.log('🔗 [STORAGE] GET /storage/download', {
      userId,
      key,
      timestamp: new Date().toISOString(),
    });

    const result = await this.storageService.getPresignedDownloadUrl(userId, key);
    return { success: true, ...result };
  }

  /**
   * GET /storage/folder/zip?prefix=users/<own-id>/myfolder/
   * Streams all files inside the folder as a single .zip download.
   */
  @Get('folder/zip')
  async downloadFolderZip(
    @Query('prefix') prefix: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = getAuthUserId(req);
    if (!prefix) throw new BadRequestException('prefix is required');

    console.log('📦 [STORAGE] GET /storage/folder/zip', { userId, prefix, timestamp: new Date().toISOString() });

    const { stream, filename } = await this.storageService.downloadFolderZip(userId, prefix);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  }

  /**
   * DELETE /storage/file?key=users/<own-id>/photo.jpg
   * Permanently deletes a single file. Ownership verified server-side.
   */
  @Delete('file')
  async deleteFile(@Query('key') key: string, @Req() req: Request) {
    const userId = getAuthUserId(req);
    if (!key) throw new BadRequestException('key is required');

    console.log('🗑️ [STORAGE] DELETE /storage/file', { userId, key, timestamp: new Date().toISOString() });

    const result = await this.storageService.deleteFile(userId, key);
    return { success: true, ...result };
  }

  /**
   * DELETE /storage/folder?prefix=users/<own-id>/myfolder/
   * Permanently deletes a folder and every object inside it.
   */
  @Delete('folder')
  async deleteFolder(@Query('prefix') prefix: string, @Req() req: Request) {
    const userId = getAuthUserId(req);
    if (!prefix) throw new BadRequestException('prefix is required');

    console.log('🗑️ [STORAGE] DELETE /storage/folder', { userId, prefix, timestamp: new Date().toISOString() });

    const result = await this.storageService.deleteFolder(userId, prefix);
    return { success: true, ...result };
  }
}