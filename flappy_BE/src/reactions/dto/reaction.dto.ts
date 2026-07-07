import { IsEnum } from 'class-validator';

/**
 * userId and email removed — identity always from JWT via @CurrentUser().
 */
export class CreateReactionDto {
  @IsEnum(['love', 'laugh', 'wow', 'sad', 'angry'])
  type: string;
}