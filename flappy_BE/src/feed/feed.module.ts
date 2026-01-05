import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Like, LikeSchema } from '../interactions/schemas/like.schema';
import { Comment, CommentSchema } from '../interactions/schemas/comment.schema';
import { Reaction, ReactionSchema } from '../reactions/schemas/reaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Reaction.name, schema: ReactionSchema }
    ]),
  ],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}