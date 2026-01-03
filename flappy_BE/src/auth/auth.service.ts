import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/schemas/user.schema';
import { SignupDto, LoginDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, phone, password, username } = signupDto;
    
    console.log('🔐 [AUTH_SERVICE] Starting user registration process', {
      email,
      username,
      hasPhone: !!phone
    });
    
    // Check if user exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { phone }, { username }]
    });
    
    if (existingUser) {
      console.log('❌ [AUTH_SERVICE] User registration failed - user already exists', {
        email,
        username,
        existingField: existingUser.email === email ? 'email' : 
                      existingUser.phone === phone ? 'phone' : 'username'
      });
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔒 [AUTH_SERVICE] Password hashed successfully');
    
    // Create user
    const user = new this.userModel({
      email,
      phone,
      username,
      password: hashedPassword,
    });
    
    await user.save();
    console.log('✅ [AUTH_SERVICE] User created in database', {
      userId: user._id,
      email: user.email,
      username: user.username
    });
    
    // Generate tokens
    const tokens = this.generateTokens(user._id.toString());
    console.log('🎫 [AUTH_SERVICE] JWT tokens generated for new user', {
      userId: user._id
    });
    
    return {
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { emailOrPhone, password } = loginDto;
    
    console.log('🔐 [AUTH_SERVICE] Starting login process', {
      emailOrPhone
    });
    
    // Find user by email or phone
    const user = await this.userModel.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });
    
    if (!user) {
      console.log('❌ [AUTH_SERVICE] Login failed - user not found', {
        emailOrPhone
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      console.log('❌ [AUTH_SERVICE] Login failed - invalid password', {
        userId: user._id,
        email: user.email
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    
    console.log('✅ [AUTH_SERVICE] User authenticated successfully', {
      userId: user._id,
      email: user.email,
      username: user.username
    });
    
    const tokens = this.generateTokens(user._id.toString());
    console.log('🎫 [AUTH_SERVICE] JWT tokens generated for login', {
      userId: user._id
    });
    
    return {
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
      ...tokens,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    // Mock OTP verification - implement actual OTP logic
    const { phone, otp } = verifyOtpDto;
    
    console.log('📱 [AUTH_SERVICE] Verifying OTP (MOCK)', {
      phone,
      otp: otp.replace(/./g, '*') // Hide OTP in logs
    });
    
    if (otp !== '123456') {
      console.log('❌ [AUTH_SERVICE] OTP verification failed', {
        phone,
        providedOtp: otp.replace(/./g, '*')
      });
      throw new UnauthorizedException('Invalid OTP');
    }
    
    console.log('✅ [AUTH_SERVICE] OTP verified successfully (MOCK)', {
      phone
    });
    
    return { message: 'OTP verified successfully' };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    console.log('🔄 [AUTH_SERVICE] Attempting to refresh token');
    
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken);
      console.log('✅ [AUTH_SERVICE] Refresh token validated', {
        userId: payload.sub
      });
      
      const tokens = this.generateTokens(payload.sub);
      console.log('🎫 [AUTH_SERVICE] New tokens generated', {
        userId: payload.sub
      });
      
      return tokens;
    } catch (error) {
      console.log('❌ [AUTH_SERVICE] Refresh token validation failed', {
        error: error.message
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(userId: string) {
    const payload = { sub: userId };
    
    console.log('🎫 [AUTH_SERVICE] Generating JWT tokens', {
      userId
    });
    
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}