import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    console.log('🔐 [AUTH] POST /auth/signup - User registration attempt', {
      email: signupDto.email,
      username: signupDto.username,
      hasPhone: !!signupDto.phone,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.authService.signup(signupDto);
      console.log('✅ [AUTH] POST /auth/signup - Registration successful', {
        userId: result.user?.userId,
        email: result.user?.email,
        username: result.user?.username
      });
      return result;
    } catch (error) {
      console.error('❌ [AUTH] POST /auth/signup - Registration failed', {
        error: error.message,
        email: signupDto.email,
        username: signupDto.username
      });
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    console.log('🔐 [AUTH] POST /auth/login - Login attempt', {
      emailOrPhone: loginDto.emailOrPhone,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.authService.login(loginDto);
      console.log('✅ [AUTH] POST /auth/login - Login successful', {
        userId: result.user?.userId,
        email: result.user?.email,
        username: result.user?.username
      });
      return result;
    } catch (error) {
      console.error('❌ [AUTH] POST /auth/login - Login failed', {
        error: error.message,
        emailOrPhone: loginDto.emailOrPhone
      });
      throw error;
    }
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    console.log('📱 [AUTH] POST /auth/otp/verify - OTP verification attempt', {
      phone: verifyOtpDto.phone,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.authService.verifyOtp(verifyOtpDto);
      console.log('✅ [AUTH] POST /auth/otp/verify - OTP verification successful', {
        phone: verifyOtpDto.phone
      });
      return result;
    } catch (error) {
      console.error('❌ [AUTH] POST /auth/otp/verify - OTP verification failed', {
        error: error.message,
        phone: verifyOtpDto.phone
      });
      throw error;
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    console.log('🔐 [AUTH] POST /auth/forgot-password - Forgot password request', {
      username: forgotPasswordDto.username,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.authService.forgotPassword(forgotPasswordDto);
      console.log('✅ [AUTH] POST /auth/forgot-password - Reset token generated', {
        username: forgotPasswordDto.username
      });
      return result;
    } catch (error) {
      console.error('❌ [AUTH] POST /auth/forgot-password - Failed to generate reset token', {
        error: error.message,
        username: forgotPasswordDto.username
      });
      throw error;
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    console.log('🔐 [AUTH] POST /auth/reset-password - Password reset attempt', {
      username: resetPasswordDto.username,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.authService.resetPassword(resetPasswordDto);
      console.log('✅ [AUTH] POST /auth/reset-password - Password reset successful', {
        username: resetPasswordDto.username,
        userId: result.user?.userId
      });
      return result;
    } catch (error) {
      console.error('❌ [AUTH] POST /auth/reset-password - Password reset failed', {
        error: error.message,
        username: resetPasswordDto.username
      });
      throw error;
    }
  }
}