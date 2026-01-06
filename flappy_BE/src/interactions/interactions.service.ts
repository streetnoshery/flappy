import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './schemas/comment.schema';
import { Like } from './schemas/like.schema';
import { Bookmark } from './schemas/bookmark.schema';
import { Post } from '../posts/schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { Reaction } from '../reactions/schemas/reaction.schema';
import { CreateCommentDto, CreateReplyDto } from './dto/interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Like.name) private likeModel: Model<Like>,
    @InjectModel(Bookmark.name) private bookmarkModel: Model<Bookmark>,
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
  ) {}

  async likePost(postId: string, userId: string) {
    // Check if user already liked the post
    const existingLike = await this.likeModel.findOne({ postId, userId });
    
    if (existingLike) {
      // Unlike the post
      await this.likeModel.deleteOne({ postId, userId });
      const likeCount = await this.likeModel.countDocuments({ postId });
      
      return { 
        message: 'Post unliked successfully',
        isLiked: false,
        likeCount
      };
    } else {
      // Like the post
      const like = new this.likeModel({ postId, userId });
      await like.save();
      const likeCount = await this.likeModel.countDocuments({ postId });
      
      return { 
        message: 'Post liked successfully',
        isLiked: true,
        likeCount
      };
    }
  }

  async getPostLikes(postId: string, userId?: string) {
    const likeCount = await this.likeModel.countDocuments({ postId });
    const isLiked = userId ? await this.likeModel.exists({ postId, userId }) : false;
    
    return {
      likeCount,
      isLiked: !!isLiked
    };
  }

  async commentOnPost(postId: string, createCommentDto: CreateCommentDto, userId: string) {
    const comment = new this.commentModel({
      postId,
      userId,
      text: createCommentDto.text,
    });
    
    const savedComment = await comment.save();
    
    // Populate user data for the response
    const user = await this.userModel.findOne({ userId }, 'username profilePhotoUrl userId').lean();
    
    const commentWithUser = {
      ...savedComment.toObject(),
      userId: user || { userId, username: 'Unknown User', profilePhotoUrl: null }
    };
    
    return commentWithUser;
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
    ).lean();
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    // Populate user data for the comment and all replies
    const user = await this.userModel.findOne({ userId: comment.userId }, 'username profilePhotoUrl userId').lean();
    
    const repliesWithUsers = await Promise.all(
      (comment.replies || []).map(async (reply) => {
        const replyUser = await this.userModel.findOne({ userId: reply.userId }, 'username profilePhotoUrl userId').lean();
        return {
          ...reply,
          userId: replyUser || { userId: reply.userId, username: 'Unknown User', profilePhotoUrl: null }
        };
      })
    );

    const commentWithUsers = {
      ...comment,
      userId: user || { userId: comment.userId, username: 'Unknown User', profilePhotoUrl: null },
      replies: repliesWithUsers
    };
    
    return commentWithUsers;
  }

  async pinPost(postId: string, userId: string) {
    // Mock pin functionality - implement actual pin logic
    return { message: 'Post pinned successfully' };
  }

  async savePost(postId: string, userId: string) {
    // Check if user is trying to bookmark their own post
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    if (post.userId === userId) {
      throw new BadRequestException('You cannot bookmark your own posts');
    }
    
    // Check if already bookmarked
    const existingBookmark = await this.bookmarkModel.findOne({ postId, userId });
    
    if (existingBookmark) {
      // Remove bookmark
      await this.bookmarkModel.deleteOne({ postId, userId });
      return { 
        message: 'Post removed from bookmarks',
        isBookmarked: false
      };
    } else {
      // Add bookmark
      const bookmark = new this.bookmarkModel({ 
        postId, 
        userId, 
        postAuthorId: post.userId 
      });
      await bookmark.save();
      return { 
        message: 'Post bookmarked successfully',
        isBookmarked: true
      };
    }
  }

  async getUserBookmarks(userId: string) {
    try {
      // Get all bookmarks for the user
      const bookmarks = await this.bookmarkModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      // Get the actual posts with full data including reactions and comments
      const bookmarkedPosts = await Promise.all(
        bookmarks.map(async (bookmark) => {
          const post = await this.postModel.findById(bookmark.postId).lean();
          if (!post) return null; // Post might have been deleted
          
          // Populate user data for the post author
          const user = await this.userModel.findOne({ userId: post.userId }, 'username profilePhotoUrl userId _id').lean();
          
          // Get reaction information (same as in posts service)
          const reactionCounts = await this.reactionModel.aggregate([
            { $match: { postId: post._id.toString() } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
          ]);
          
          const reactions = reactionCounts.reduce((acc, reaction) => {
            acc[reaction._id] = reaction.count;
            return acc;
          }, {});
          
          // Get current user's reaction
          let userReaction = null;
          const userReactionDoc = await this.reactionModel.findOne({ 
            postId: post._id.toString(), 
            userId 
          }).lean();
          userReaction = userReactionDoc ? userReactionDoc.type : null;
          
          // Get comment count
          const commentCount = await this.commentModel.countDocuments({ postId: post._id.toString() });
          
          return {
            ...post,
            userId: user || { userId: post.userId, username: 'Unknown User', profilePhotoUrl: null },
            reactions,
            userReaction,
            commentCount,
            // Keep like count for backward compatibility (sum of all reactions)
            likeCount: Object.values(reactions).reduce((sum: number, count: any) => sum + count, 0),
            isLiked: userReaction === 'love', // Heart is filled if user reacted with love
            bookmarkedAt: (bookmark as any).createdAt || new Date()
          };
        })
      );

      // Filter out null values (deleted posts)
      return bookmarkedPosts.filter(post => post !== null);
    } catch (error) {
      console.error('Error getting user bookmarks:', error.message);
      return [];
    }
  }

  async getBookmarkStatus(postId: string, userId: string) {
    const bookmark = await this.bookmarkModel.findOne({ postId, userId });
    return { isBookmarked: !!bookmark };
  }

  async getComments(postId: string) {
    try {
      const comments = await this.commentModel
        .find({ postId })
        .sort({ createdAt: -1 })
        .lean();

      // Manually populate user data for comments and replies
      const commentsWithUsers = await Promise.all(
        comments.map(async (comment) => {
          const user = await this.userModel.findOne({ userId: comment.userId }, 'username profilePhotoUrl userId').lean();
          
          // Populate replies with user data
          const repliesWithUsers = await Promise.all(
            (comment.replies || []).map(async (reply) => {
              const replyUser = await this.userModel.findOne({ userId: reply.userId }, 'username profilePhotoUrl userId').lean();
              return {
                ...reply,
                userId: replyUser || { userId: reply.userId, username: 'Unknown User', profilePhotoUrl: null }
              };
            })
          );

          return {
            ...comment,
            userId: user || { userId: comment.userId, username: 'Unknown User', profilePhotoUrl: null },
            replies: repliesWithUsers
          };
        })
      );

      return commentsWithUsers;
    } catch (error) {
      console.error('Error getting comments:', error.message);
      // Return empty array on error to prevent frontend crashes
      return [];
    }
  }
}