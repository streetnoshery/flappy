import { IsEmail, IsString, IsOptional, MinLength, Matches, Length } from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone?: string;

  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
  })
  password: string;
}

export class LoginDto {
  @IsString({ message: 'Email or phone is required' })
  @MinLength(1, { message: 'Email or phone cannot be empty' })
  emailOrPhone: string;

  @IsString({ message: 'Password is required' })
  @MinLength(1, { message: 'Password cannot be empty' })
  password: string;
}

export class VerifyOtpDto {
  @IsString({ message: 'Phone number is required' })
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone: string;

  @IsString({ message: 'OTP is required' })
  @Matches(/^[0-9]{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token is required' })
  @MinLength(1, { message: 'Refresh token cannot be empty' })
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsString({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;
}

export class ResetPasswordDto {
  @IsString({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @IsString({ message: 'Reset token is required' })
  @MinLength(1, { message: 'Reset token cannot be empty' })
  resetToken: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
  })
  newPassword: string;
}