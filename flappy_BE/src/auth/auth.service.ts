import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/schemas/user.schema';
import { SignupDto, LoginDto, VerifyOtpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
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

    // Generate unique userId
    const userId = uuidv4();
    console.log('🆔 [AUTH_SERVICE] Generated userId', { userId });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔒 [AUTH_SERVICE] Password hashed successfully');
    
    // Create user
    const user = new this.userModel({
      userId,
      email,
      phone,
      username,
      password: hashedPassword,
    });
    
    await user.save();
    console.log('✅ [AUTH_SERVICE] User created in database', {
      userId: user.userId,
      mongoId: user._id,
      email: user.email,
      username: user.username
    });
    
    return {
      message: 'User created successfully',
      user: {
        userId: user.userId,
        id: user._id,
        email: user.email,
        username: user.username,
      },
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
        userId: user.userId,
        email: user.email
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    
    console.log('✅ [AUTH_SERVICE] User authenticated successfully', {
      userId: user.userId,
      email: user.email,
      username: user.username
    });
    
    return {
      message: 'Login successful',
      user: {
        userId: user.userId,
        id: user._id,
        email: user.email,
        username: user.username,
      },
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
}