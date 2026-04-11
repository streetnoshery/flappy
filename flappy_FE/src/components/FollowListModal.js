import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useQuery } from 'react-query';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import FollowButton from './FollowButton';
import LoadingSpinner from './LoadingSpinner';

const FollowListModal = ({ isOpen, onClose, userId, type = 'followers' }) => {
  const { user: currentUser } = useAuth();

  const { data, isLoading } = useQuery(
    [type, userId],
    () => type === 'followers'
      ? usersAPI.getFollowers(userId)
      : usersAPI.getFollowing(userId),
    { enabled: isOpen && !!userId }
  );

  if (!isOpen) return null;

  const users = data?.data || [];
  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : users.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-10">
              {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {users.map((u) => (
                <div key={u.userId} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <Link
                    to={`/profile/${u.userId}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <UserAvatar user={u} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{u.username}</p>
                      {u.bio && <p className="text-xs text-slate-400 truncate">{u.bio}</p>}
                    </div>
                  </Link>
                  {currentUser?.userId !== u.userId && (
                    <FollowButton
                      targetUserId={u.userId}
                      isFollowing={u.isFollowing}
                      compact
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
