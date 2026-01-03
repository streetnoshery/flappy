import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './schemas/comment.schema';
import { Post } from '../posts/schemas/post.schema';
import { CreateCommentDto, CreateReplyDto } from './dto/interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Post.name) private postModel: Model<Post>,
  ) {}

  async likePost(postId: string, userId: string) {
    // Mock like functionality - implement actual like logic with separate collection
    return { message: 'Post liked successfully' };
  }

  async commentOnPost(postId: string, createCommentDto: CreateCommentDto, userId: string) {
    const comment = new this.commentModel({
      postId,
      userId,
      text: createCommentDto.text,
    });
    
    return comment.save();
  }

  async replyToComment(commentId: string, createReplyDto: CreateReplyDto, userId: string) {
    const comment = await this.commentModel.findByIdAndUpdate(
      commentId,
      {
        $push: {
          replies: {
            userId,
            text: createReplyDto.text,
            createdAt: new Date(),
          }
        }
      },
      { new: true }
    );
    
    return comment;
  }

  async pinPost(postId: string, userId: string) {
    // Mock pin functionality - implement actual pin logic
    return { message: 'Post pinned successfully' };
  }

  async savePost(postId: string, userId: string) {
    // Mock save functionality - implement actual save logic with separate collection
    return { message: 'Post saved successfully' };
  }

  async getComments(postId: string) {
    return this.commentModel
      .find({ postId })
      .populate('userId', 'username profilePhotoUrl')
      .populate('replies.userId', 'username profilePhotoUrl')
      .sort({ createdAt: -1 });
  }
}