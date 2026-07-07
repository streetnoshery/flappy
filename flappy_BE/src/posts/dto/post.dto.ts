import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * userId and email are intentionally ABSENT from all mutation DTOs.
 * Identity always comes from the verified JWT via @CurrentUser() — never from the client.
 */
export class CreatePostDto {
  @IsIn(['text', 'image', 'gif'], { message: 'Post type must be text, image, or gif' })
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