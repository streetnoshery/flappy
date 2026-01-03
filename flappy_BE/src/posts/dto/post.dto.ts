import { IsString, IsEnum, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsEnum(['text', 'image', 'gif'])
  type: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}