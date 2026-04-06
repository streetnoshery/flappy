import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/schemas/user.schema';
import {
  SignupDto,
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { EmailService } from './email.service';
import { OtpStoreService } from './otp-store.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly emailService: EmailService,
    private readonly otpStore: OtpStoreService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, phone, password, username } = signupDto;

    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { phone }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new this.userModel({
      userId,
      email,
      phone,
      username,
      password: hashedPassword,
    });

    await user.save();
    this.logger.log(`User registered: ${username} (${email})`);

    return {
      message: 'User created successfully',
      user: {
        userId: user.userId,
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Step 1: Validate credentials (email/phone + password).
   * On success, send OTP to user's registered email.
   * Returns masked email for the frontend to display.
   */
  async login(loginDto: LoginDto) {
    const { emailOrPhone, password } = loginDto;

    // Find user by email or phone
    const user = await this.userModel.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check rate limit before sending OTP
    const rateLimitSeconds = this.otpStore.checkRateLimit(user.email);
    if (rateLimitSeconds > 0) {
      throw new HttpException(
        `Too many OTP requests. Try again in ${rateLimitSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Send OTP to registered email
    const otp = await this.emailService.sendOtpViaEmail(user.email);
    this.otpStore.storeOtp(user.email, otp);

    this.logger.log(`OTP sent to ${this.maskEmail(user.email)} for user ${user.username}`);

    return {
      message: 'OTP sent to your registered email',
      otpRequired: true,
      email: this.maskEmail(user.email),
      rawEmail: user.email, // needed for verify call — frontend stores temporarily
    };
  }

  /**
   * Step 2: Verify OTP and complete login.
   */
  async verifyLoginOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    const result = this.otpStore.verifyOtp(email, otp);

    if (!result.valid) {
      throw new UnauthorizedException(result.message);
    }

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`OTP verified, login complete for ${user.username}`);

    return {
      message: 'Login successful',
      user: {
        userId: user.userId,
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Resend OTP to user's email (with rate limiting).
   */
  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    const rateLimitSeconds = this.otpStore.checkRateLimit(email);
    if (rateLimitSeconds > 0) {
      throw new HttpException(
        `Too many OTP requests. Try again in ${rateLimitSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal whether user exists
      return { message: 'If the email is registered, a new OTP has been sent.' };
    }

    const otp = await this.emailService.sendOtpViaEmail(user.email);
    this.otpStore.storeOtp(user.email, otp);

    this.logger.log(`OTP resent to ${this.maskEmail(user.email)}`);

    return { message: 'A new OTP has been sent to your email.' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { username } = forgotPasswordDto;

    const user = await this.userModel.findOne({ username });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    return {
      message: 'Password reset token generated successfully',
      resetToken,
      expiresAt: resetTokenExpiry,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { username, resetToken, newPassword } = resetPasswordDto;

    const user = await this.userModel.findOne({
      username,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return {
      message: 'Password reset successfully',
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  /** Mask email: jo***@gmail.com */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const masked =
      local.length <= 2
        ? local[0] + '***'
        : local.slice(0, 2) + '***';
    return `${masked}@${domain}`;
  }
}
