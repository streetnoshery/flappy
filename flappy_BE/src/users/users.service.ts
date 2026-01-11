import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string) {
    console.log('👤 [USERS_SERVICE] Finding user by ID', { id });
    
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
    
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    console.log('✏️ [USERS_SERVICE] Updating user', { id, updateFields: Object.keys(updateUserDto) });
    
    // Try to find by userId first (UUID), then fallback to MongoDB _id
    let user;
    
    // Check if it's a valid MongoDB ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    if (isObjectId) {
      // If it looks like a MongoDB ObjectId, update by _id
      user = await this.userModel.findByIdAndUpdate(
        id,
        updateUserDto,
        { new: true }
      ).select('-password');
    } else {
      // Otherwise, update by userId (UUID)
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