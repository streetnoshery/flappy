import { IsString, IsEmail } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  text: string;

  @IsString()
  userId: string;

  @IsEmail()
  email: string;
}

export class CreateReplyDto {
  @IsString()
  text: string;

  @IsString()
  userId: string;

  @IsEmail()
  email: string;
}

export class LikePostDto {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;
}

export class PinPostDto {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;
}

export class SavePostDto {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;
}