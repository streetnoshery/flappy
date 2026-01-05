import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { MessageCircle, Reply, Send } from 'lucide-react';
import { interactionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const CommentSection = ({ postId, showComments = false, onToggleComments }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const { data: commentsData, isLoading: commentsLoading, error: commentsError } = useQuery(
    ['comments', postId],
    () => interactionsAPI.getComments(postId),
    {
      enabled: !!postId && showComments,
      onError: (error) => {
        console.error('Error fetching comments:', error);
        toast.error('Failed to load comments');
      },
      onSuccess: (data) => {
        console.log('Comments fetched successfully:', data);
      }
    }
  );

  const createCommentMutation = useMutation(
    (commentData) => interactionsAPI.commentOnPost(postId, commentData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', postId]);
        setNewComment('');
        toast.success('Comment added!');
      },
      onError: (error) => {
        toast.error('Failed to add comment');
        console.error('Comment error:', error);
      }
    }
  );

  const createReplyMutation = useMutation(
    ({ commentId, replyData }) => interactionsAPI.replyToComment(postId, commentId, replyData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', postId]);
        setReplyingTo(null);
        setReplyText('');
        toast.success('Reply added!');
      },
      onError: (error) => {
        toast.error('Failed to add reply');
        console.error('Reply error:', error);
      }
    }
  );

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    createCommentMutation.mutate({
      text: newComment.trim()
    });
  };

  const handleSubmitReply = (e, commentId) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;

    createReplyMutation.mutate({
      commentId,
      replyData: { text: replyText.trim() }
    });
  };

  // Safely extract comments with multiple fallbacks
  let comments = [];
  try {
    if (commentsData && commentsData.data && Array.isArray(commentsData.data)) {
      comments = commentsData.data;
    } else if (commentsData && Array.isArray(commentsData)) {
      // Fallback in case the API returns comments directly without wrapping in data
      comments = commentsData;
    } else if (commentsData) {
      console.warn('Unexpected comments data structure:', commentsData);
      comments = [];
    }
  } catch (error) {
    console.error('Error processing comments data:', error);
    comments = [];
  }

  // Debug logging to understand the data structure
  console.log('CommentSection - commentsData:', commentsData);
  console.log('CommentSection - comments:', comments);
  console.log('CommentSection - comments type:', typeof comments);
  console.log('CommentSection - is array:', Array.isArray(comments));

  return (
    <div className="border-t border-gray-200">
      {/* Comment Toggle Button */}
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between">
        <button
          onClick={onToggleComments}
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          <span>
            {Array.isArray(comments) && comments.length > 0 
              ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`
              : 'Comment'
            }
          </span>
        </button>
        
        {Array.isArray(comments) && comments.length > 2 && (
          <Link
            to={`/post/${postId}`}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            View all comments
          </Link>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          {/* Add Comment Form */}
          {user && (
            <form onSubmit={handleSubmitComment} className="mb-4">
              <div className="flex space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  {user.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt={user.username}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      {user.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      disabled={createCommentMutation.isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || createCommentMutation.isLoading}
                      className="px-3 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : commentsError ? (
            <div className="text-center text-red-600 py-4 text-sm">
              Error loading comments. Please try again.
            </div>
          ) : !Array.isArray(comments) ? (
            <div className="text-center text-red-600 py-4 text-sm">
              Error loading comments: Invalid data format
            </div>
          ) : comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">
              {user ? 'Be the first to comment!' : 'No comments yet'}
            </p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {comments.map((comment) => {
                // Safety check for each comment
                if (!comment || !comment._id) {
                  console.warn('Invalid comment object:', comment);
                  return null;
                }
                
                return (
                <div key={comment._id} className="space-y-2">
                  {/* Main Comment */}
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      {comment.userId?.profilePhotoUrl ? (
                        <img
                          src={comment.userId.profilePhotoUrl}
                          alt={comment.userId.username}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">
                          {comment.userId?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {comment.userId?.username || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Unknown date'}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{comment.text || ''}</p>
                      </div>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center space-x-4 mt-1 ml-3">
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                        >
                          <Reply className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                        {comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>

                      {/* Reply Form */}
                      {replyingTo === comment._id && user && (
                        <form onSubmit={(e) => handleSubmitReply(e, comment._id)} className="mt-2 ml-3">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to ${comment.userId?.username || 'user'}...`}
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              disabled={createReplyMutation.isLoading}
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={!replyText.trim() || createReplyMutation.isLoading}
                              className="px-2 py-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Replies */}
                      {comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0 && (
                        <div className="mt-2 ml-6 space-y-2">
                          {comment.replies.map((reply, index) => {
                            // Safety check for each reply
                            if (!reply) {
                              console.warn('Invalid reply object:', reply);
                              return null;
                            }
                            
                            return (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                {reply.userId?.profilePhotoUrl ? (
                                  <img
                                    src={reply.userId.profilePhotoUrl}
                                    alt={reply.userId.username}
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-600 font-medium">
                                    {reply.userId?.username?.[0]?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-gray-900 text-xs sm:text-sm">
                                      {reply.userId?.username || 'Unknown User'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString() : 'Unknown date'}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 text-xs sm:text-sm">{reply.text || ''}</p>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              }).filter(Boolean)}
            </div>
          )}

          {/* Login Prompt */}
          {!user && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-2">Please log in to comment</p>
              <button
                onClick={() => window.location.href = '/login'}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Log in
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;