import { 
  Controller, 
  Get, 
  Put, 
  Post, 
  Param, 
  Body, 
  Query, 
  UseInterceptors, 
  UploadedFile 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    console.log('👤 [USERS] GET /users/:id - Fetching user profile', {
      userId: id,
      timestamp: new Date().toISOString()
    });
    
    try {
      const user = await this.usersService.findById(id);
      console.log('✅ [USERS] GET /users/:id - User profile retrieved', {
        userId: id,
        username: user.username,
        email: user.email
      });
      return user;
    } catch (error) {
      console.error('❌ [USERS] GET /users/:id - Failed to retrieve user', {
        error: error.message,
        userId: id
      });
      throw error;
    }
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    console.log('✏️ [USERS] PUT /users/:id - Updating user profile', {
      userId: id,
      updateFields: Object.keys(updateUserDto),
      timestamp: new Date().toISOString()
    });
    
    try {
      const user = await this.usersService.update(id, updateUserDto);
      console.log('✅ [USERS] PUT /users/:id - User profile updated', {
        userId: id,
        username: user.username,
        updatedFields: Object.keys(updateUserDto)
      });
      return user;
    } catch (error) {
      console.error('❌ [USERS] PUT /users/:id - Failed to update user', {
        error: error.message,
        userId: id,
        updateFields: Object.keys(updateUserDto)
      });
      throw error;
    }
  }

  @Post(':id/upload-photo')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() body: { userId: string; email: string }) {
    console.log('📸 [USERS] POST /users/:id/upload-photo - Uploading profile photo', {
      userId: id,
      requestUserId: body.userId,
      fileName: file?.originalname,
      fileSize: file?.size,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.usersService.uploadProfilePhoto(id, file);
      console.log('✅ [USERS] POST /users/:id/upload-photo - Profile photo uploaded', {
        userId: id,
        photoUrl: result.profilePhotoUrl
      });
      return result;
    } catch (error) {
      console.error('❌ [USERS] POST /users/:id/upload-photo - Failed to upload photo', {
        error: error.message,
        userId: id,
        fileName: file?.originalname
      });
      throw error;
    }
  }

  @Get('search')
  async searchUsers(@Query('username') username: string) {
    console.log('🔍 [USERS] GET /users/search - Searching users', {
      searchQuery: username,
      timestamp: new Date().toISOString()
    });
    
    try {
      const users = await this.usersService.searchByUsername(username);
      console.log('✅ [USERS] GET /users/search - User search completed', {
        searchQuery: username,
        resultsCount: users.length
      });
      return users;
    } catch (error) {
      console.error('❌ [USERS] GET /users/search - User search failed', {
        error: error.message,
        searchQuery: username
      });
      throw error;
    }
  }
}