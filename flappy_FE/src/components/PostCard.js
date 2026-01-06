import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Share, Bookmark, MoreHorizontal } from 'lucide-react';
import { interactionsAPI, reactionsAPI } from '../services/api';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { useAuth } from '../contexts/AuthContext';
import CommentSection from './CommentSection';
import toast from 'react-hot-toast';

const PostCard = ({ post }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [userReaction, setUserReaction] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const queryClient = useQueryClient();
  const { isFeatureEnabled } = useFeatureFlags();
  const { user } = useAuth();

  // Check if this is user's own post
  const isOwnPost = user?.userId === post.userId?.userId;

  // Initialize state from post data
  useEffect(() => {
    setIsLiked(post.isLiked || false);
    setLikeCount(post.likeCount || 0);
    setUserReaction(post.userReaction || null);
    setIsBookmarked(post.isBookmarked || false);
  }, [post]);

  const likeMutation = useMutation(
    () => interactionsAPI.likePost(post._id),
    {
      onSuccess: (response) => {
        const data = response.data;
        
        if (data && typeof data === 'object') {
          const newIsLiked = data.isReacted === true && data.reactionType === 'love';
          const newUserReaction = data.isReacted ? data.reactionType : null;
          const newLikeCount = data.reactionCounts ? 
            Object.values(data.reactionCounts).reduce((sum, count) => sum + count, 0) : 0;
          
          setIsLiked(newIsLiked);
          setUserReaction(newUserReaction);
          setLikeCount(newLikeCount);
          
          queryClient.invalidateQueries('homeFeed');
          toast.success(newIsLiked ? 'Post liked!' : 'Like removed!');
        } else {
          console.error('Invalid response data:', data);
          toast.error('Invalid response from server');
        }
      },
      onError: (error) => {
        console.error('Like API Error:', error);
        toast.error('Failed to toggle like');
      }
    }
  );

  const saveMutation = useMutation(
    () => interactionsAPI.savePost(post._id),
    {
      onSuccess: (response) => {
        const data = response.data;
        setIsBookmarked(data.isBookmarked);
        queryClient.invalidateQueries('homeFeed');
        queryClient.invalidateQueries('exploreFeed');
        queryClient.invalidateQueries(['userBookmarks', user?.userId]);
        toast.success(data.message);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to bookmark post');
      }
    }
  );

  const reactionMutation = useMutation(
    (type) => reactionsAPI.reactToPost(post._id, { type }),
    {
      onSuccess: (response) => {
        const data = response.data;
        if (data && typeof data === 'object') {
          const newUserReaction = data.isReacted ? data.reactionType : null;
          const newIsLiked = data.isReacted && data.reactionType === 'love';
          const newLikeCount = data.reactionCounts ? 
            Object.values(data.reactionCounts).reduce((sum, count) => sum + count, 0) : 0;
          
          setUserReaction(newUserReaction);
          setIsLiked(newIsLiked);
          setLikeCount(newLikeCount);
          
          queryClient.invalidateQueries('homeFeed');
          setShowReactions(false);
          toast.success(data.isReacted ? 'Reaction added!' : 'Reaction removed!');
        }
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mx-2 sm:mx-0">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full flex items-center justify-center">
            {post.userId?.profilePhotoUrl ? (
              <img
                src={post.userId.profilePhotoUrl}
                alt={post.userId.username}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 font-medium text-sm sm:text-base">
                {post.userId?.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <Link
              to={`/profile/${post.userId?._id}`}
              className="font-medium text-gray-900 hover:underline text-sm sm:text-base"
            >
              {post.userId?.username}
            </Link>
            <p className="text-xs sm:text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full">
          <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <p className="text-gray-900 mb-3 text-sm sm:text-base leading-relaxed">{post.content}</p>
        
        {post.mediaUrl && (
          <div className="mb-3">
            {post.type === 'image' || post.type === 'gif' ? (
              <img
                src={post.mediaUrl}
                alt="Post media"
                className="w-full rounded-lg max-h-64 sm:max-h-96 object-cover"
              />
            ) : null}
          </div>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-3">
            {post.hashtags.map((tag, index) => (
              <span
                key={index}
                className="text-primary-600 hover:underline cursor-pointer text-xs sm:text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="border-t border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative flex items-center">
              <button
                onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isLoading}
                className={`flex items-center space-x-1.5 sm:space-x-2 transition-colors ${
                  isLiked 
                    ? 'text-red-600' 
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                <Heart 
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''}`} 
                />
                <span className="text-xs sm:text-sm">
                  {likeCount > 0 ? likeCount : 'Like'}
                </span>
              </button>
              
              {isFeatureEnabled('enableReactions') && (
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  React
                </button>
              )}
              
              {isFeatureEnabled('enableReactions') && showReactions && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-full shadow-lg p-2 flex space-x-2 z-10">
                  {reactions.map((reaction) => (
                    <button
                      key={reaction}
                      onClick={() => reactionMutation.mutate(reaction)}
                      className={`text-lg sm:text-2xl hover:scale-110 transition-transform ${
                        userReaction === reaction ? 'scale-110 ring-2 ring-blue-300 rounded-full' : ''
                      }`}
                    >
                      {reactionEmojis[reaction]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => toast('Share feature coming soon!', {
                icon: '🔗',
                duration: 3000,
              })}
              className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 hover:text-green-600 transition-colors"
            >
              <Share className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm hidden sm:inline">Share</span>
            </button>
          </div>
          
          {/* Bookmark Button - Only show for other users' posts */}
          {!isOwnPost && (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isLoading}
              className={`transition-colors ${
                isBookmarked 
                  ? 'text-yellow-600 hover:text-yellow-700' 
                  : 'text-gray-600 hover:text-yellow-600'
              } ${saveMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
            >
              <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Comment Section */}
      <CommentSection 
        postId={post._id} 
        showComments={showComments}
        onToggleComments={() => setShowComments(!showComments)}
        maxCommentsToShow={2}
      />
    </div>
  );
};

export default PostCard;