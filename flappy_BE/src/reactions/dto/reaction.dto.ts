import { IsEnum } from 'class-validator';

export class CreateReactionDto {
  @IsEnum(['love', 'laugh', 'wow', 'sad', 'angry'])
  type: string;
}