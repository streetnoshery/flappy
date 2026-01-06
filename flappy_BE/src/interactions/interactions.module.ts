import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Like, LikeSchema } from './schemas/like.schema';
import { Bookmark, BookmarkSchema } from './schemas/bookmark.schema';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Bookmark.name, schema: BookmarkSchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [InteractionsController],
  providers: [InteractionsService],
})
export class InteractionsModule {}