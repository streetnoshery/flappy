import { IsString, IsOptional, IsIn, IsEmail } from 'class-validator';

export class CreatePostDto {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;

  @IsIn(['text', 'image', 'gif'], { message: 'Post type must be text, image, or gif' })
  type: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class UpdatePostDto {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}