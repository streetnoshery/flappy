import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Share } from 'lucide-react';
import { postsAPI } from '../services/api';
import PostCard from '../components/PostCard';
import CommentSection from '../components/CommentSection';
import ShareModal from '../components/ShareModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import toast from 'react-hot-toast';

const PostDetail = () => {
  const { postId } = useParams();
  const { isFeatureEnabled } = useFeatureFlags();
  const [showShareModal, setShowShareModal] = useState(false);
  
  const { data: postData, isLoading: postLoading } = useQuery(
    ['post', postId],
    () => postsAPI.getPost(postId),
    {
      enabled: !!postId,
    }
  );

  if (postLoading) return <LoadingSpinner />;

  const post = postData?.data;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
      {post && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Post Content (without the comment section from PostCard) */}
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
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
                  <h3 className="font-medium text-gray-900">{post.userId?.username}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Share Button */}
              <button
                onClick={() => {
                  if (isFeatureEnabled('enableShare')) {
                    setShowShareModal(true);
                  } else {
                    toast('Share feature coming soon!', {
                      icon: '🔗',
                      duration: 3000,
                    });
                  }
                }}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Share post"
              >
                <Share className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-900 mb-3 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              
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
          </div>

          {/* Enhanced Comment Section - Always Expanded */}
          <CommentSection 
            postId={post._id} 
            showComments={true}
            onToggleComments={() => {}} // No toggle on detail page
          />
        </div>
      )}

      {/* Share Modal */}
      {post && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          post={post}
        />
      )}
    </div>
  );
};

export default PostDetail;