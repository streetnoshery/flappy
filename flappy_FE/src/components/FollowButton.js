import React, { useState } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from 'react-query';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';

const FollowButton = ({ targetUserId, isFollowing: initialIsFollowing, accentBg, compact = false }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isHovering, setIsHovering] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation(() => usersAPI.toggleFollow(targetUserId), {
    onSuccess: (res) => {
      const data = res.data;
      setIsFollowing(data.isFollowing);
      queryClient.invalidateQueries(['profileStats', targetUserId]);
      queryClient.invalidateQueries(['user', targetUserId]);
      toast.success(data.isFollowing ? 'Following' : 'Unfollowed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed');
    },
  });

  // Sync prop changes
  React.useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const showUnfollow = isFollowing && isHovering;

  if (isFollowing) {
    return (
      <button
        onClick={() => mutation.mutate()}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={mutation.isLoading}
        className={`
          flex items-center gap-1.5 font-semibold rounded-xl border transition-all duration-200
          ${compact ? 'py-1 px-3 text-xs' : 'py-1.5 px-5 text-sm'}
          ${showUnfollow
            ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }
          disabled:opacity-50 shadow-sm
        `}
      >
        {mutation.isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : showUnfollow ? (
          <>Unfollow</>
        ) : (
          <><UserCheck className="w-3.5 h-3.5" /> Following</>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isLoading}
      className={`
        flex items-center gap-1.5 text-white font-semibold rounded-xl shadow-sm
        hover:opacity-90 transition-all duration-200 disabled:opacity-50
        ${compact ? 'py-1 px-3 text-xs' : 'py-1.5 px-5 text-sm'}
      `}
      style={{ background: accentBg || 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
    >
      {mutation.isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <><UserPlus className="w-3.5 h-3.5" /> Follow</>
      )}
    </button>
  );
};

export default FollowButton;
