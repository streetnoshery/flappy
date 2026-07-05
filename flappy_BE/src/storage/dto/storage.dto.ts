import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  folderName: string;

  @IsString()
  @IsOptional()
  parentPrefix?: string;
}

export class ListObjectsDto {
  @IsString()
  @IsOptional()
  prefix?: string;
}

export class PresignDownloadDto {
  @IsString()
  @IsNotEmpty()
  key: string;
}

/** Body for POST /storage/upload-url — request a presigned PUT URL */
export class GetUploadUrlDto {
  /** Original filename — used to build the S3 key */
  @IsString()
  @IsNotEmpty()
  filename: string;

  /** MIME type — stored and set as ContentType on the presigned URL */
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  /** File size in bytes — used to decide single vs multipart */
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  size: number;

  /** Optional folder prefix relative to user root (e.g. "vacation/") */
  @IsString()
  @IsOptional()
  folderPrefix?: string;
}

/** Body for POST /storage/confirm — called after client PUT succeeds */
export class ConfirmUploadDto {
  /** The exact S3 key returned by /upload-url */
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  size: number;

  @IsString()
  @IsOptional()
  folderPrefix?: string;
}

