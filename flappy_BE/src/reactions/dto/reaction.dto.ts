import { IsEnum, IsString, IsEmail } from 'class-validator';

export class CreateReactionDto {
  @IsEnum(['love', 'laugh', 'wow', 'sad', 'angry'])
  type: string;

  @IsString()
  userId: string;

  @IsEmail()
  email: string;
}