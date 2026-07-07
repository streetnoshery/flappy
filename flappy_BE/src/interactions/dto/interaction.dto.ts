import { IsString, IsEmail } from 'class-validator';

/**
 * userId and email are REMOVED from all interaction DTOs.
 * The authenticated actor is always read from the JWT via @CurrentUser() in controllers.
 */
export class CreateCommentDto {
  @IsString()
  text: string;
}

export class CreateReplyDto {
  @IsString()
  text: string;
}

// Empty body DTOs — kept for future extensible fields; identity from JWT only
export class LikePostDto {}
export class PinPostDto {}
export class SavePostDto {}