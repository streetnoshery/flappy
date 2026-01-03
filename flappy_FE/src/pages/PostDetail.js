import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { postsAPI, interactionsAPI } from '../services/api';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';

const PostDetail = () => {
  const { postId } = useParams();
  
  const { data: postData, isLoading: postLoading } = useQuery(
    ['post', postId],
    () => postsAPI.getPost(postId),
    {
      enabled: !!postId,
    }
  );

  const { data: commentsData, isLoading: commentsLoading } = useQuery(
    ['comments', postId],
    () => interactionsAPI.getComments(postId),
    {
      enabled: !!postId,
    }
  );

  if (postLoading) return <LoadingSpinner />;

  const post = postData?.data;
  const comments = commentsData?.data || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {post && <PostCard post={post} />}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Comments ({comments.length})
        </h2>
        
        {commentsLoading ? (
          <LoadingSpinner />
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment._id} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm text-gray-600 font-medium">
                      {comment.userId?.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {comment.userId?.username}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-700">{comment.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;