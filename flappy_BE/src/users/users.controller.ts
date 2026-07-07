import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CheckOwnership } from '../common/guards/ownership.guard';
import { SecurityAuditService } from '../common/services/security-audit.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: SecurityAuditService,
  ) {}

  /** GET /users/:id — public profile read, enriched with JWT actor */
  @Get(':id')
  async getUserById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.findById(id, actor.userId);
  }

  /**
   * PUT /users/:id — self-update only.
   * @CheckOwnership('id') enforces param :id === req.user.userId via OwnershipGuard.
   * Returns 404 (not 403) to avoid leaking account existence.
   */
  @CheckOwnership('id')
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    // actor.userId === id is already enforced by OwnershipGuard
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * POST /users/:id/upload-photo — self-update only.
   * @CheckOwnership('id') enforces param :id === req.user.userId.
   */
  @CheckOwnership('id')
  @Post(':id/upload-photo')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.uploadProfilePhoto(id, file);
  }

  /** GET /users/search?username= — public, no ownership needed */
  @Get('search')
  async searchUsers(@Query('username') username: string) {
    return this.usersService.searchByUsername(username);
  }
}
