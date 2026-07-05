import React, { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from 'react-query';
import { subscriptionsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const SubscribeButton = ({ isSubscribed: initialIsSubscribed, compact = false }) => {
  const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);
  const [isHovering, setIsHovering] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation(() => subscriptionsAPI.toggleSubscription(), {
    onSuccess: (res) => {
      const data = res.data;
      setIsSubscribed(data.isSubscribed);
      queryClient.invalidateQueries(['subscriptionStatus']);
      queryClient.invalidateQueries(['user']);
      toast.success(data.isSubscribed ? 'Subscribed!' : 'Unsubscribed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update subscription');
    },
  });

  // Sync prop changes
  React.useEffect(() => {
    setIsSubscribed(initialIsSubscribed);
  }, [initialIsSubscribed]);

  const showUnsubscribe = isSubscribed && isHovering;

  if (isSubscribed) {
    return (
      <button
        onClick={() => mutation.mutate()}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={mutation.isLoading}
        className={`
          flex items-center gap-1.5 font-semibold rounded-xl border transition-all duration-200
          ${compact ? 'py-1 px-3 text-xs' : 'py-1.5 px-5 text-sm'}
          ${showUnsubscribe
            ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100'
            : 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100'
          }
          disabled:opacity-50 shadow-sm
        `}
      >
        {mutation.isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : showUnsubscribe ? (
          <>Unsubscribe</>
        ) : (
          <><Star className="w-3.5 h-3.5 fill-amber-400" /> Subscribed</>
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
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
    >
      {mutation.isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <><Star className="w-3.5 h-3.5" /> Subscribe</>
      )}
    </button>
  );
};

export default SubscribeButton;
