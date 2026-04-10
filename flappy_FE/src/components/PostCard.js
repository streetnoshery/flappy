import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Share2, Bookmark, MoreHorizontal, Trash2, MessageCircle } from 'lucide-react';
import { interactionsAPI, reactionsAPI, postsAPI } from '../services/api';
import { useMutation, useQueryClient } from 'react-query';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { useAuth } from '../contexts/AuthContext';
import CommentSection from './CommentSection';
import ShareModal from './ShareModal';
import UserAvatar from './UserAvatar';
import { getChipStyle, getAccentColor } from '../utils/profileColors';
import Linkify from '../utils/linkify';
import toast from 'react-hot-toast';

/* Relative time helper */
const relativeTime = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d`;
  return new Date(date).toLocaleDateString();
};

const PostCard = ({ post }) => {
  const [showComments, setShowComments]     = useState(false);
  const [showMenu, setShowMenu]             = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLiked, setIsLiked]               = useState(false);
  const [likeCount, setLikeCount]           = useState(0);
  const [isBookmarked, setIsBookmarked]     = useState(false);
  const [likeAnim, setLikeAnim]             = useState(false);

  const queryClient = useQueryClient();
  const { isFeatureEnabled } = useFeatureFlags();
  const { user } = useAuth();

  const isOwnPost = user?.userId === post.userId?.userId;
  const canDelete = post.canDelete || false;

  useEffect(() => {
    setIsLiked(post.isLiked || false);
    setLikeCount(post.likeCount || 0);
    setIsBookmarked(post.isBookmarked || false);
  }, [post]);

  useEffect(() => {
    const close = (e) => { if (showMenu && !e.target.closest('.menu-container')) setShowMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMenu]);

  const likeMutation = useMutation(() => interactionsAPI.likePost(post._id), {
    onSuccess: (res) => {
      const d = res.data;
      if (d && typeof d === 'object') {
        const liked = d.isReacted === true && d.reactionType === 'love';
        setIsLiked(liked);
        setLikeCount(d.reactionCounts ? Object.values(d.reactionCounts).reduce((s, c) => s + c, 0) : 0);
        setLikeAnim(true);
        setTimeout(() => setLikeAnim(false), 400);
        queryClient.invalidateQueries('homeFeed');
      }
    },
    onError: () => toast.error('Failed to toggle like'),
  });

  const saveMutation = useMutation(() => interactionsAPI.savePost(post._id), {
    onSuccess: (res) => {
      const d = res.data;
      setIsBookmarked(d.isBookmarked);
      queryClient.invalidateQueries('homeFeed');
      queryClient.invalidateQueries('exploreFeed');
      queryClient.invalidateQueries(['userBookmarks', user?.userId]);
      toast.success(d.message);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to bookmark'),
  });

  const deleteMutation = useMutation(() => postsAPI.deletePost(post._id), {
    onSuccess: () => {
      queryClient.invalidateQueries('homeFeed');
      queryClient.invalidateQueries('exploreFeed');
      queryClient.invalidateQueries(['userPosts', user?.userId]);
      toast.success('Post deleted');
      setShowMenu(false);
    },
    onError: (err) => { toast.error(err.response?.data?.message || 'Failed to delete'); setShowMenu(false); },
  });

  return (
    <article className="card overflow-hidden animate-fade-up hover:shadow-md transition-shadow duration-200">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link to={`/profile/${post.userId?.userId}`} className="flex items-center gap-3 group">
          <UserAvatar user={post.userId} size="sm" ring />
          <div>
            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors leading-tight">
              {post.userId?.username}
            </p>
            <p className="text-xs text-slate-400">{relativeTime(post.createdAt)}</p>
          </div>
        </Link>

        {/* Menu */}
        <div className="relative menu-container">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Post options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-card py-1 z-20 min-w-[140px] animate-fade-up">
              {canDelete ? (
                <button
                  onClick={() => { if (window.confirm('Delete this post?')) deleteMutation.mutate(); }}
                  disabled={deleteMutation.isLoading}
                  className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50 flex items-center gap-2 text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteMutation.isLoading ? 'Deleting…' : 'Delete post'}
                </button>
              ) : (
                <div className="px-4 py-2 text-slate-400 text-sm">No actions</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div className="px-4 pb-3">
        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap"><Linkify>{post.content}</Linkify></p>

        {post.mediaUrl && (post.type === 'image' || post.type === 'gif') && (
          <div className="mt-3 rounded-xl overflow-hidden bg-slate-100">
            <img src={post.mediaUrl} alt="Post media" className="w-full max-h-80 object-cover" />
          </div>
        )}

        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {post.hashtags.map((tag, i) => (
              <span key={i} className="chip text-xs cursor-pointer transition-colors"
                style={getChipStyle(post.userId?.userId)}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Actions ────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-50">
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isLoading}
            className={`action-btn ${isLiked ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : ''}`}
            aria-label="Like"
          >
            <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-current' : ''} ${likeAnim ? 'animate-like' : ''}`} />
            <span>{likeCount > 0 ? likeCount : 'Like'}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="action-btn"
            aria-label="Comment"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Comment</span>
          </button>

          {/* Share */}
          <button
            onClick={() => isFeatureEnabled('enableShare') ? setShowShareModal(true) : toast('Share coming soon!', { icon: '🔗' })}
            className="action-btn"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Bookmark */}
        {!isOwnPost && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isLoading}
            className={`action-btn ${isBookmarked ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : ''}`}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* ── Comments ───────────────────────────────── */}
      <CommentSection
        postId={post._id}
        showComments={showComments}
        onToggleComments={() => setShowComments(!showComments)}
        maxCommentsToShow={2}
      />

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} post={post} />
    </article>
  );
};

export default PostCard;
