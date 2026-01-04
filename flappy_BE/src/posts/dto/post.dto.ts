import { IsString, IsOptional } from 'class-validator';
import { IsValidPostType } from 'src/common/validators/post-type.validator';

export class CreatePostDto {
  @IsValidPostType({ message: 'Invalid post type or post type is disabled' })
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