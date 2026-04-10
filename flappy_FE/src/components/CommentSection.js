import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { MessageCircle, Reply, Send, ChevronDown } from 'lucide-react';
import { interactionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import Linkify from '../utils/linkify';
import toast from 'react-hot-toast';

const relativeTime = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(date).toLocaleDateString();
};


const CommentSection = ({ postId, showComments = false, onToggleComments, maxCommentsToShow = null }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const inputRef = React.useRef(null);

  const { data: commentsData, isLoading } = useQuery(
    ['comments', postId],
    () => interactionsAPI.getComments(postId),
    { enabled: !!postId && showComments, refetchOnWindowFocus: false }
  );

  const addComment = useMutation(
    (data) => interactionsAPI.commentOnPost(postId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries('homeFeed');
        setNewComment('');
        toast.success('Comment added!');
      },
      onError: () => toast.error('Failed to add comment'),
    }
  );

  const addReply = useMutation(
    ({ commentId, replyData }) => interactionsAPI.replyToComment(postId, commentId, replyData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', postId]);
        setReplyingTo(null);
        setReplyText('');
        toast.success('Reply added!');
      },
      onError: () => toast.error('Failed to add reply'),
    }
  );

  React.useEffect(() => {
    if (showComments) {
      queryClient.invalidateQueries(['comments', postId]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showComments, queryClient, postId]);

  let comments = [];
  try {
    if (commentsData?.data?.data && Array.isArray(commentsData.data.data)) comments = commentsData.data.data;
    else if (commentsData?.data && Array.isArray(commentsData.data)) comments = commentsData.data;
    else if (Array.isArray(commentsData)) comments = commentsData;
  } catch { comments = []; }

  const visibleComments = maxCommentsToShow ? comments.slice(0, maxCommentsToShow) : comments;

  return (
    <div className="border-t border-slate-50">
      {/* Toggle row */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={onToggleComments}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{comments.length > 0 ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : 'Comment'}</span>
          {comments.length > 0 && (
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showComments ? 'rotate-180' : ''}`} />
          )}
        </button>
        {comments.length > 2 && (
          <Link to={`/post/${postId}`} className="text-xs text-slate-400 hover:text-primary-600 transition-colors">
            View all
          </Link>
        )}
      </div>

      {showComments && (
        <div className="px-4 pb-4 space-y-3">
          {/* Input */}
          {user && (
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size="xs" />
              <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment…"
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  disabled={addComment.isLoading}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && newComment.trim()) { e.preventDefault(); addComment.mutate({ text: newComment.trim() }); } }}
                />
                <button
                  type="button"
                  onClick={() => newComment.trim() && addComment.mutate({ text: newComment.trim() })}
                  disabled={!newComment.trim() || addComment.isLoading}
                  className="text-primary-500 hover:text-primary-700 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Comments list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="flex gap-2">
                  <div className="skeleton w-7 h-7 rounded-full" />
                  <div className="flex-1 skeleton h-12 rounded-xl" />
                </div>
              ))}
            </div>
          ) : visibleComments.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No comments yet. Be first!</p>
          ) : (
            <div className="space-y-3">
              {visibleComments.filter(Boolean).map(comment => (
                <div key={comment._id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <UserAvatar user={comment.userId} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="bg-slate-100 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-slate-800">{comment.userId?.username || 'User'}</span>
                          <span className="text-xs text-slate-400">{relativeTime(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700"><Linkify>{comment.text}</Linkify></p>
                      </div>
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                        className="flex items-center gap-1 mt-1 ml-2 text-xs text-slate-400 hover:text-primary-600 transition-colors"
                      >
                        <Reply className="w-3 h-3" /> Reply
                      </button>

                      {/* Reply input */}
                      {replyingTo === comment._id && user && (
                        <div className="flex items-center gap-2 mt-2 ml-2">
                          <UserAvatar user={user} size="xs" />
                          <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5">
                            <input
                              type="text"
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder={`Reply to ${comment.userId?.username}…`}
                              className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter' && replyText.trim()) { e.preventDefault(); addReply.mutate({ commentId: comment._id, replyData: { text: replyText.trim() } }); } }}
                            />
                            <button
                              onClick={() => replyText.trim() && addReply.mutate({ commentId: comment._id, replyData: { text: replyText.trim() } })}
                              disabled={!replyText.trim()}
                              className="text-primary-500 hover:text-primary-700 disabled:opacity-30"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {comment.replies?.length > 0 && (
                        <div className="mt-2 ml-4 space-y-2">
                          {comment.replies.filter(Boolean).map((reply, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <UserAvatar user={reply.userId} size="xs" />
                              <div className="bg-slate-100 rounded-xl px-3 py-2 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-semibold text-slate-800">{reply.userId?.username || 'User'}</span>
                                  <span className="text-xs text-slate-400">{relativeTime(reply.createdAt)}</span>
                                </div>
                                <p className="text-xs text-slate-700"><Linkify>{reply.text}</Linkify></p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {maxCommentsToShow && comments.length > maxCommentsToShow && (
                <Link to={`/post/${postId}`} className="block text-xs text-center text-slate-400 hover:text-primary-600 transition-colors pt-1">
                  View {comments.length - maxCommentsToShow} more comment{comments.length - maxCommentsToShow > 1 ? 's' : ''}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
