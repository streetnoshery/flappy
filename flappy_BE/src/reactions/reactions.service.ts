import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reaction } from './schemas/reaction.schema';
import { CreateReactionDto } from './dto/reaction.dto';

@Injectable()
export class ReactionsService {
  constructor(@InjectModel(Reaction.name) private reactionModel: Model<Reaction>) {}

  async reactToPost(postId: string, createReactionDto: CreateReactionDto, userId: string) {
    // Check if user already reacted
    const existingReaction = await this.reactionModel.findOne({ postId, userId });
    
    if (existingReaction) {
      // Update existing reaction
      existingReaction.type = createReactionDto.type;
      return existingReaction.save();
    } else {
      // Create new reaction
      const reaction = new this.reactionModel({
        postId,
        userId,
        type: createReactionDto.type,
      });
      return reaction.save();
    }
  }

  async getReactions(postId: string) {
    const reactions = await this.reactionModel.aggregate([
      { $match: { postId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    
    return reactions.reduce((acc, reaction) => {
      acc[reaction._id] = reaction.count;
      return acc;
    }, {});
  }
}