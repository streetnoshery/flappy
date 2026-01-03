import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string) {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      updateUserDto,
      { new: true }
    ).select('-password');
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  async uploadProfilePhoto(id: string, file: Express.Multer.File) {
    // Mock S3 upload - implement actual S3 logic
    const photoUrl = `https://your-bucket.s3.amazonaws.com/users/profile-pictures/${id}-${Date.now()}.jpg`;
    
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { profilePhotoUrl: photoUrl },
      { new: true }
    ).select('-password');
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return { profilePhotoUrl: photoUrl };
  }

  async searchByUsername(username: string) {
    return this.userModel.find({
      username: { $regex: username, $options: 'i' }
    }).select('-password').limit(20);
  }
}