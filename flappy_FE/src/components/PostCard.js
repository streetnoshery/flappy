import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from 'lucide-react';
import { interactionsAPI, reactionsAPI } from '../services/api';
import { useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

const PostCard = ({ post }) => {
  const [showReactions, setShowReactions] = useState(false);
  const queryClient = useQueryClient();

  const likeMutation = useMutation(
    () => interactionsAPI.likePost(post._id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('homeFeed');
        toast.success('Post liked!');
      },
    }
  );

  const saveMutation = useMutation(
    () => interactionsAPI.savePost(post._id),
    {
      onSuccess: () => {
        toast.success('Post saved!');
      },
    }
  );

  const reactionMutation = useMutation(
    (type) => reactionsAPI.reactToPost(post._id, { type }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('homeFeed');
        setShowReactions(false);
        toast.success('Reaction added!');
      },
    }
  );

  const reactions = ['love', 'laugh', 'wow', 'sad', 'angry'];
  const reactionEmojis = {
    love: '😍',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😡'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            {post.userId?.profilePhotoUrl ? (
              <img
                src={post.userId.profilePhotoUrl}
                alt={post.userId.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 font-medium">
                {post.userId?.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <Link
              to={`/profile/${post.userId?._id}`}
              className="font-medium text-gray-900 hover:underline"
            >
              {post.userId?.username}
            </Link>
            <p className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-4">
        <p className="text-gray-900 mb-3">{post.content}</p>
        
        {post.mediaUrl && (
          <div className="mb-3">
            {post.type === 'image' || post.type === 'gif' ? (
              <img
                src={post.mediaUrl}
                alt="Post media"
                className="w-full rounded-lg max-h-96 object-cover"
              />
            ) : null}
          </div>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.hashtags.map((tag, index) => (
              <span
                key={index}
                className="text-primary-600 hover:underline cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span className="text-sm">Like</span>
              </button>
              
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-full shadow-lg p-2 flex space-x-2">
                  {reactions.map((reaction) => (
                    <button
                      key={reaction}
                      onClick={() => reactionMutation.mutate(reaction)}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      {reactionEmojis[reaction]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <Link
              to={`/post/${post._id}`}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">Comment</span>
            </Link>
            
            <button className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors">
              <Share className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </button>
          </div>
          
          <button
            onClick={() => saveMutation.mutate()}
            className="text-gray-600 hover:text-yellow-600 transition-colors"
          >
            <Bookmark className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard;