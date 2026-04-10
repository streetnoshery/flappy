import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import ShareModal from './ShareModal';
import UserAvatar from './UserAvatar';
import { getChipStyle } from '../utils/profileColors';
import Linkify from '../utils/linkify';
import toast from 'react-hot-toast';

const relativeTime = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(date).toLocaleDateString();
};

const ProfilePostCard = ({ post }) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const [showShareModal, setShowShareModal] = useState(false);

  const isLiked     = post.userReaction === 'love' || post.isLiked;
  const likeCount   = post.likeCount   || 0;
  const commentCount= post.commentCount|| 0;

  return (
    <article className="card overflow-hidden animate-fade-up hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Link to={`/profile/${post.userId?.userId}`} className="flex items-center gap-3 group">
          <UserAvatar user={post.userId} size="sm" ring />
          <div>
            <p className="text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors leading-tight">
              {post.userId?.username}
            </p>
            <p className="text-xs text-slate-400">{relativeTime(post.createdAt)}</p>
          </div>
        </Link>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap"><Linkify>{post.content}</Linkify></p>

        {post.mediaUrl && (
          <div className="mt-3 rounded-xl overflow-hidden bg-slate-100">
            <img src={post.mediaUrl} alt="Post media" className="w-full max-h-80 object-cover" />
          </div>
        )}

        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {post.hashtags.map((tag, i) => (
              <span key={i} className="chip text-xs" style={getChipStyle(post.userId?.userId)}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-50">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-sm ${isLiked ? 'text-red-500' : 'text-slate-500'}`}>
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <MessageCircle className="w-4 h-4" />
            <span>{commentCount}</span>
          </div>
        </div>

        <button
          onClick={() => isFeatureEnabled('enableShare') ? setShowShareModal(true) : toast('Share coming soon!', { icon: '🔗' })}
          className="action-btn text-xs"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} post={post} />
    </article>
  );
};

export default ProfilePostCard;
