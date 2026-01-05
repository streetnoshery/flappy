import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post, PostSchema } from './schemas/post.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Reaction, ReactionSchema } from '../reactions/schemas/reaction.schema';
import { Comment, CommentSchema } from '../interactions/schemas/comment.schema';
import { FeatureFlagsModule } from '../common/feature-flags.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Reaction.name, schema: ReactionSchema },
      { name: Comment.name, schema: CommentSchema }
    ]),
    FeatureFlagsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}