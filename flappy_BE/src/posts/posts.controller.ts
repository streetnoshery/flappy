import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { FeatureFlagsService } from '../common/services/feature-flags.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SecurityAuditService } from '../common/services/security-audit.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly auditService: SecurityAuditService,
  ) {}

  /** POST /posts — userId from JWT only, never from body */
  @Post()
  async createPost(
    @Body() dto: CreatePostDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!this.featureFlagsService.validatePostType(dto.type)) {
      const enabledTypes = this.featureFlagsService.getEnabledPostTypes();
      throw new BadRequestException(
        `Post type '${dto.type}' is not enabled. Available types: ${enabledTypes.join(', ')}`,
      );
    }
    return this.postsService.create(dto, actor.userId);
  }

  @Get('trending-tags')
  async getTrendingTags() {
    return this.postsService.getTrendingTags();
  }

  /** GET /posts/user/:userId — public profile view (read-only, no sensitive data) */
  @Get('user/:userId')
  async getPostsByUserId(
    @Param('userId') userId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    // currentUserId for reaction enrichment comes from JWT, not a query param
    return { data: await this.postsService.findByUserId(userId, actor.userId) };
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  /** PUT /posts/:id — ownership verified in service against JWT userId */
  @Put(':id')
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.postsService.update(id, dto, actor.userId);
  }

  /** DELETE /posts/:id — ownership verified in service against JWT userId */
  @Delete(':id')
  async deletePost(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.postsService.delete(id, actor.userId);
  }
}
