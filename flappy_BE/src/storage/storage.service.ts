import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { Upload as S3MultipartUpload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PassThrough } from 'stream';
import { FileRecord, FileRecordDocument } from './schemas/file-record.schema';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver') as (format: string, options?: object) => import('archiver').Archiver;

/** Files larger than this go through multipart upload */
const MULTIPART_THRESHOLD = 8 * 1024 * 1024; // 8 MB

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly useAcceleration: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(FileRecord.name) private readonly fileRecordModel: Model<FileRecordDocument>,
  ) {
    const accessKeyId     = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region          = this.configService.get<string>('AWS_REGION') || 'ap-south-1';
    const bucket          = this.configService.get<string>('S3_BUCKET_NAME');
    this.useAcceleration  = this.configService.get<string>('S3_TRANSFER_ACCELERATION') === 'true';

    const missing: string[] = [];
    if (!accessKeyId)     missing.push('AWS_ACCESS_KEY_ID');
    if (!secretAccessKey) missing.push('AWS_SECRET_ACCESS_KEY');
    if (!bucket)          missing.push('S3_BUCKET_NAME');
    if (missing.length > 0) {
      console.error(`❌ [STORAGE] Missing AWS env vars: ${missing.join(', ')}. Set them in .env and restart.`);
    }

    this.s3 = new S3Client({
      region,
      useAccelerateEndpoint: this.useAcceleration,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;
  }

  /**
   * Build the S3 prefix for a user. All user files live under users/<userId>/
   */
  private userPrefix(userId: string): string {
    return `users/${userId}/`;
  }

  /**
   * Ensure a given key actually belongs to the requesting user.
   */
  private assertOwnership(userId: string, key: string): void {
    const allowed = this.userPrefix(userId);
    if (!key.startsWith(allowed)) {
      throw new ForbiddenException('Access to this object is not allowed');
    }
  }

  // ─── OPTIMISED UPLOAD (presigned PUT) ──────────────────────────────────────

  /**
   * POST /storage/upload-url
   * Returns a presigned PUT URL the client uses to upload directly to S3.
   * Files > 8 MB: client should use multipart via @aws-sdk/lib-storage on their end,
   * but for server-side uploads (e.g. server proxied) we support it too.
   * The presigned URL is valid for 15 minutes.
   */
  async getUploadUrl(
    userId: string,
    filename: string,
    mimeType: string,
    size: number,
    folderPrefix?: string,
  ): Promise<{ key: string; presignedUrl: string; expiresIn: number; multipart: boolean }> {
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const relative = folderPrefix
      ? `${folderPrefix.replace(/^\/|\/$/g, '')}/${sanitizedName}`
      : sanitizedName;
    const key = `${this.userPrefix(userId)}${relative}`;
    const multipart = size > MULTIPART_THRESHOLD;

    console.log(`🔑 [STORAGE] Generating presigned PUT URL`, { userId, key, size, multipart });

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
        ContentLength: size,
      });
      const presignedUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
      console.log(`✅ [STORAGE] Presigned PUT URL generated`, { key, multipart });
      return { key, presignedUrl, expiresIn: 900, multipart };
    } catch (err) {
      console.error(`❌ [STORAGE] Presigned PUT failed`, { key, error: err.message });
      throw new InternalServerErrorException(`Failed to generate upload URL: ${err.message}`);
    }
  }

  /**
   * POST /storage/confirm
   * Called by the client after a successful PUT to the presigned URL.
   * Saves the file record to MongoDB for later lookup by ID.
   */
  async confirmUpload(
    userId: string,
    key: string,
    originalName: string,
    mimeType: string,
    size: number,
    folderPrefix?: string,
  ): Promise<FileRecordDocument> {
    this.assertOwnership(userId, key);

    console.log(`✅ [STORAGE] Confirming upload`, { userId, key, size });

    const record = await this.fileRecordModel.create({
      key,
      ownerId: userId,
      originalName,
      mimeType,
      size,
      folderPrefix: folderPrefix ?? '',
    });

    console.log(`✅ [STORAGE] File record saved`, { id: record._id, key });
    return record;
  }

  /**
   * GET /storage/files/:id/download-url
   * Returns a presigned GET URL for a file identified by its MongoDB record ID.
   * Verifies ownership via the stored ownerId field.
   */
  async getDownloadUrlById(userId: string, fileId: string): Promise<{ presignedUrl: string; expiresIn: number; filename: string }> {
    const record = await this.fileRecordModel.findById(fileId);
    if (!record) throw new BadRequestException('File not found');
    if (record.ownerId !== userId) throw new ForbiddenException('Access to this file is not allowed');

    console.log(`🔗 [STORAGE] Generating presigned GET URL by ID`, { userId, fileId, key: record.key });

    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: record.key });
      const presignedUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
      return { presignedUrl, expiresIn: 900, filename: record.originalName };
    } catch (err) {
      console.error(`❌ [STORAGE] Presigned GET by ID failed`, { fileId, error: err.message });
      throw new InternalServerErrorException(`Failed to generate download URL: ${err.message}`);
    }
  }

  // ─── SERVER-PROXIED UPLOAD (legacy / small files) ──────────────────────────

  /**
   * Upload one or more files server-side.
   * Small files (≤8 MB): single PutObjectCommand.
   * Large files (>8 MB): @aws-sdk/lib-storage multipart, queueSize=4, partSize=8MB.
   * Node memory: only the current file's buffer is held — never the whole batch.
   */
  async uploadFiles(
    userId: string,
    files: Express.Multer.File[],
    folderPrefix?: string,
  ): Promise<{ key: string; url: string }[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results: { key: string; url: string }[] = [];

    for (const file of files) {
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
      const relativePath = folderPrefix
        ? `${folderPrefix.replace(/^\/|\/$/g, '')}/${sanitizedName}`
        : sanitizedName;
      const key = `${this.userPrefix(userId)}${relativePath}`;

      console.log(`📤 [STORAGE] Uploading file`, { userId, key, size: file.size, multipart: file.size > MULTIPART_THRESHOLD });

      try {
        if (file.size > MULTIPART_THRESHOLD) {
          // Multipart upload — streams buffer in 8 MB parts, 4 concurrent
          const upload = new S3MultipartUpload({
            client: this.s3,
            params: {
              Bucket: this.bucket,
              Key: key,
              Body: file.buffer,
              ContentType: file.mimetype,
            },
            queueSize: 4,
            partSize: MULTIPART_THRESHOLD,
            leavePartsOnError: false,
          });
          await upload.done();
        } else {
          await this.s3.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }));
        }

        const url = `https://${this.bucket}.s3.amazonaws.com/${key}`;
        results.push({ key, url });
        console.log(`✅ [STORAGE] File uploaded`, { key });
      } catch (err) {
        console.error(`❌ [STORAGE] Upload failed`, { key, error: err.message });
        throw new InternalServerErrorException(`Failed to upload ${file.originalname}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Create a "folder" in S3 by uploading a zero-byte object with a trailing slash.
   */
  async createFolder(userId: string, folderName: string, parentPrefix?: string): Promise<{ key: string }> {
    const sanitizedName = folderName.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const relative = parentPrefix
      ? `${parentPrefix.replace(/^\/|\/$/g, '')}/${sanitizedName}/`
      : `${sanitizedName}/`;

    const key = `${this.userPrefix(userId)}${relative}`;

    console.log(`📁 [STORAGE] Creating folder in S3`, { userId, key });

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: '',
          ContentType: 'application/x-directory',
        }),
      );
      console.log(`✅ [STORAGE] Folder created`, { key });
      return { key };
    } catch (err) {
      console.error(`❌ [STORAGE] Folder creation failed`, { key, error: err.message });
      throw new InternalServerErrorException(`Failed to create folder: ${err.message}`);
    }
  }

  /**
   * List objects in the user's S3 "directory" (ListObjectsV2).
   * Returns both common prefixes (folders) and object keys (files).
   */
  async listObjects(
    userId: string,
    prefix?: string,
  ): Promise<{ folders: string[]; files: { key: string; size: number; lastModified: Date }[] }> {
    // Scope listing to this user, optionally narrowed by a sub-prefix
    const base = this.userPrefix(userId);
    const queryPrefix = prefix ? `${base}${prefix.replace(/^\//, '')}` : base;

    console.log(`📋 [STORAGE] Listing S3 objects`, { userId, queryPrefix });

    try {
      let folders: string[] = [];
      let files: { key: string; size: number; lastModified: Date }[] = [];
      let continuationToken: string | undefined;

      do {
        const response: ListObjectsV2CommandOutput = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: queryPrefix,
            Delimiter: '/',
            ContinuationToken: continuationToken,
          }),
        );

        // Common prefixes are "folders"
        if (response.CommonPrefixes) {
          for (const cp of response.CommonPrefixes) {
            if (cp.Prefix) folders.push(cp.Prefix);
          }
        }

        // Contents are files (skip the folder marker itself)
        if (response.Contents) {
          for (const obj of response.Contents) {
            if (obj.Key && !obj.Key.endsWith('/')) {
              files.push({
                key: obj.Key,
                size: obj.Size ?? 0,
                lastModified: obj.LastModified ?? new Date(),
              });
            }
          }
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);

      console.log(`✅ [STORAGE] Listed objects`, {
        userId,
        folderCount: folders.length,
        fileCount: files.length,
      });

      return { folders, files };
    } catch (err) {
      console.error(`❌ [STORAGE] S3 list failed`, { queryPrefix, error: err.message });
      throw new InternalServerErrorException(`Failed to list objects: ${err.message}`);
    }
  }

  /**
   * Generate a pre-signed GET URL (valid 15 minutes) for a file.
   */
  async getPresignedDownloadUrl(userId: string, key: string): Promise<{ url: string }> {
    this.assertOwnership(userId, key);

    console.log(`🔗 [STORAGE] Generating presigned URL`, { userId, key });

    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      const url = await getSignedUrl(this.s3, command, { expiresIn: 900 }); // 15 min
      console.log(`✅ [STORAGE] Presigned URL generated`, { key });
      return { url };
    } catch (err) {
      console.error(`❌ [STORAGE] Presign failed`, { key, error: err.message });
      throw new InternalServerErrorException(`Failed to generate download URL: ${err.message}`);
    }
  }

  /**
   * Permanently delete a single file. Verifies ownership before deleting.
   */
  async deleteFile(userId: string, key: string): Promise<{ deleted: string }> {
    this.assertOwnership(userId, key);
    if (key.endsWith('/')) throw new BadRequestException('Use deleteFolder to delete folders');

    console.log(`🗑️ [STORAGE] Deleting file`, { userId, key });
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      console.log(`✅ [STORAGE] File deleted`, { key });
      return { deleted: key };
    } catch (err) {
      console.error(`❌ [STORAGE] Delete file failed`, { key, error: err.message });
      throw new InternalServerErrorException(`Failed to delete file: ${err.message}`);
    }
  }

  /**
   * Permanently delete a folder and ALL objects inside it.
   * Lists every key under the prefix, batch-deletes in groups of 1000.
   */
  async deleteFolder(userId: string, folderPrefix: string): Promise<{ deletedCount: number }> {
    const prefix = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
    this.assertOwnership(userId, prefix);

    console.log(`🗑️ [STORAGE] Deleting folder`, { userId, prefix });
    try {
      const keys: string[] = [];
      let continuationToken: string | undefined;

      do {
        const response: ListObjectsV2CommandOutput = await this.s3.send(
          new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: continuationToken }),
        );
        if (response.Contents) {
          for (const obj of response.Contents) { if (obj.Key) keys.push(obj.Key); }
        }
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);

      if (keys.length === 0) { return { deletedCount: 0 }; }

      const CHUNK = 1000;
      for (let i = 0; i < keys.length; i += CHUNK) {
        const chunk = keys.slice(i, i + CHUNK);
        await this.s3.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }

      console.log(`✅ [STORAGE] Folder deleted`, { prefix, deletedCount: keys.length });
      return { deletedCount: keys.length };
    } catch (err) {
      console.error(`❌ [STORAGE] Delete folder failed`, { prefix, error: err.message });
      throw new InternalServerErrorException(`Failed to delete folder: ${err.message}`);
    }
  }

  /**
   * Stream all objects under a folder prefix into a ZIP archive via archiver.
   * Fetches each S3 object using GetObjectCommand and pipes the stream into the ZIP.
   * Returns a PassThrough stream the controller can pipe directly to the HTTP response.
   */
  async downloadFolderZip(
    userId: string,
    folderPrefix: string,
  ): Promise<{ stream: PassThrough; filename: string }> {
    const prefix = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
    this.assertOwnership(userId, prefix);

    // Collect all keys under the prefix
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const response: ListObjectsV2CommandOutput = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && !obj.Key.endsWith('/')) keys.push(obj.Key);
        }
      }
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    if (keys.length === 0) {
      throw new BadRequestException('Folder is empty — nothing to download');
    }

    console.log(`📦 [STORAGE] Building ZIP for folder`, { userId, prefix, fileCount: keys.length });

    // Folder display name becomes the ZIP filename
    const folderName = prefix.replace(this.userPrefix(userId), '').replace(/\/$/, '') || 'folder';
    const zipFilename = `${folderName}.zip`;

    const passthrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', (err) => {
      console.error(`❌ [STORAGE] ZIP archive error`, { err: err.message });
      passthrough.destroy(err);
    });

    archive.pipe(passthrough);

    // Append each S3 object stream into the archive
    (async () => {
      for (const key of keys) {
        try {
          const getCmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
          const s3Res = await this.s3.send(getCmd);
          // Entry name = path relative to the folder prefix (preserves sub-folders inside zip)
          const entryName = key.replace(prefix, '');
          archive.append(s3Res.Body as any, { name: entryName });
        } catch (err) {
          console.error(`❌ [STORAGE] Failed to add file to ZIP`, { key, err: err.message });
        }
      }
      await archive.finalize();
      console.log(`✅ [STORAGE] ZIP finalized`, { zipFilename });
    })();

    return { stream: passthrough, filename: zipFilename };
  }
}
