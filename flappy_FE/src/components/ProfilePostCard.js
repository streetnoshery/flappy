import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePostCard = ({ post }) => {
  const { user } = useAuth();
  
  // Check if current user has liked this post
  const isLiked = post.userReaction === 'love' || post.isLiked;
  const likeCount = post.likeCount || 0;
  const commentCount = post.commentCount || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
      {/* Post Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full flex items-center justify-center">
            {post.userId?.profilePhotoUrl ? (
              <img
                src={post.userId.profilePhotoUrl}
                alt={post.userId.username}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-xs sm:text-sm text-gray-600 font-medium">
                {post.userId?.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <Link
              to={`/profile/${post.userId?.userId}`}
              className="font-medium text-gray-900 hover:underline text-sm sm:text-base"
            >
              {post.userId?.username}
            </Link>
            <p className="text-xs sm:text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-3">
        <p className="text-gray-900 text-sm sm:text-base whitespace-pre-wrap">
          {post.content}
        </p>
        
        {/* Media */}
        {post.mediaUrl && (
          <div className="mt-3">
            {post.type === 'image' ? (
              <img
                src={post.mediaUrl}
                alt="Post content"
                className="w-full rounded-lg max-h-96 object-cover"
              />
            ) : post.type === 'gif' ? (
              <img
                src={post.mediaUrl}
                alt="Post GIF"
                className="w-full rounded-lg max-h-96 object-cover"
              />
            ) : null}
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.hashtags.map((tag, index) => (
              <span
                key={index}
                className="text-primary-600 text-xs sm:text-sm hover:underline cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats Only (No Interactive Buttons) */}
      <div className="flex items-center space-x-4 pt-2 border-t border-gray-100">
        {/* Like Count */}
        <div className="flex items-center space-x-1">
          <Heart 
            className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
          />
          <span className="text-sm text-gray-600">
            {likeCount}
          </span>
        </div>

        {/* Comment Count */}
        <div className="flex items-center space-x-1">
          <MessageCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {commentCount}
          </span>
        </div>

        {/* Post Type Badge */}
        {post.type && post.type !== 'text' && (
          <div className="ml-auto">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
              {post.type}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePostCard;