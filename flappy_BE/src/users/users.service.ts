import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string, viewerId?: string) {
    console.log('👤 [USERS_SERVICE] Finding user by ID', { id, viewerId });
    
    // Try to find by userId first (UUID), then fallback to MongoDB _id
    let user;
    
    // Check if it's a valid MongoDB ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    if (isObjectId) {
      // If it looks like a MongoDB ObjectId, search by _id
      user = await this.userModel.findById(id).select('-password');
    } else {
      // Otherwise, search by userId (UUID)
      user = await this.userModel.findOne({ userId: id }).select('-password');
    }
    
    if (!user) {
      console.log('❌ [USERS_SERVICE] User not found', { id });
      throw new NotFoundException('User not found');
    }
    
    console.log('✅ [USERS_SERVICE] User found', { 
      id, 
      userId: user.userId, 
      username: user.username 
    });

    // Build profile response with subscription fields
    const userObj = user.toObject();
    const isOwnProfile = viewerId != null && (viewerId === user.userId || viewerId === user._id?.toString());

    const profileResponse: Record<string, any> = {
      ...userObj,
      isSubscribed: user.isSubscribed ?? false,
      subscribedAt: user.subscribedAt ?? null,
    };

    if (isOwnProfile) {
      profileResponse.coinBalance = user.coinBalance ?? 0;
    } else {
      delete profileResponse.coinBalance;
    }

    return profileResponse;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    console.log('✏️ [USERS_SERVICE] Updating user', { id, updateFields: Object.keys(updateUserDto) });

    // Check uniqueness of username, email, and phone before updating
    const conflicts: string[] = [];

    if (updateUserDto.username) {
      const existingByUsername = await this.userModel.findOne({
        username: updateUserDto.username,
        userId: { $ne: id },
      });
      if (existingByUsername) conflicts.push('Username is already taken');
    }

    if (updateUserDto.email) {
      const existingByEmail = await this.userModel.findOne({
        email: updateUserDto.email,
        userId: { $ne: id },
      });
      if (existingByEmail) conflicts.push('Email is already in use');
    }

    if (updateUserDto.phone) {
      const existingByPhone = await this.userModel.findOne({
        phone: updateUserDto.phone,
        userId: { $ne: id },
      });
      if (existingByPhone) conflicts.push('Phone number is already in use');
    }

    if (conflicts.length > 0) {
      throw new ConflictException(conflicts.join('. '));
    }
    
    // Try to find by userId first (UUID), then fallback to MongoDB _id
    let user;
    
    // Check if it's a valid MongoDB ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    if (isObjectId) {
      user = await this.userModel.findByIdAndUpdate(
        id,
        updateUserDto,
        { new: true }
      ).select('-password');
    } else {
      user = await this.userModel.findOneAndUpdate(
        { userId: id },
        updateUserDto,
        { new: true }
      ).select('-password');
    }
    
    if (!user) {
      console.log('❌ [USERS_SERVICE] User not found for update', { id });
      throw new NotFoundException('User not found');
    }
    
    console.log('✅ [USERS_SERVICE] User updated successfully', { 
      id, 
      userId: user.userId, 
      username: user.username 
    });
    
    return user;
  }

  async uploadProfilePhoto(id: string, file: Express.Multer.File) {
    console.log('📸 [USERS_SERVICE] Uploading profile photo', { id, fileName: file?.originalname });
    
    // Mock S3 upload - implement actual S3 logic
    const photoUrl = `https://your-bucket.s3.amazonaws.com/users/profile-pictures/${id}-${Date.now()}.jpg`;
    
    // Try to find by userId first (UUID), then fallback to MongoDB _id
    let user;
    
    // Check if it's a valid MongoDB ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    if (isObjectId) {
      // If it looks like a MongoDB ObjectId, update by _id
      user = await this.userModel.findByIdAndUpdate(
        id,
        { profilePhotoUrl: photoUrl },
        { new: true }
      ).select('-password');
    } else {
      // Otherwise, update by userId (UUID)
      user = await this.userModel.findOneAndUpdate(
        { userId: id },
        { profilePhotoUrl: photoUrl },
        { new: true }
      ).select('-password');
    }
    
    if (!user) {
      console.log('❌ [USERS_SERVICE] User not found for photo upload', { id });
      throw new NotFoundException('User not found');
    }
    
    console.log('✅ [USERS_SERVICE] Profile photo uploaded successfully', { 
      id, 
      userId: user.userId, 
      photoUrl 
    });
    
    return { profilePhotoUrl: photoUrl };
  }

  async searchByUsername(username: string) {
    return this.userModel.find({
      username: { $regex: username, $options: 'i' }
    }).select('-password').limit(20);
  }
}