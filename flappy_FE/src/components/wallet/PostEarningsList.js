import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ArrowRightLeft, ChevronLeft, ChevronRight, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { walletAPI } from '../../services/api';
import toast from 'react-hot-toast';

const COIN_THRESHOLD = 1000;
const ITEMS_PER_PAGE = 10;

const PostEarningsList = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery(
    ['postEarnings', page],
    () => walletAPI.getPostEarnings(page, ITEMS_PER_PAGE),
    { keepPreviousData: true }
  );

  const items = data?.data?.items || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;

  const convertMutation = useMutation(
    (postId) => walletAPI.convertPostCoins(postId),
    {
      onSuccess: (_, postId) => {
        toast.success('Coins converted successfully!');
        queryClient.invalidateQueries('walletSummary');
        queryClient.invalidateQueries(['postEarnings']);
        queryClient.invalidateQueries(['walletTransactions']);
      },
      onError: (err) => {
        const reason = err.response?.data?.message || 'Conversion failed. Please try again.';
        const messages = {
          threshold_not_reached: 'This post hasn\'t reached 1,000 coins yet.',
          already_converted: 'These coins have already been converted.',
          post_not_found: 'Post not found.',
        };
        toast.error(messages[reason] || reason);
      },
    }
  );

  if (isLoading && !data) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-4">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span>Post Earnings</span>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-4">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span>Post Earnings</span>
        </div>
        <p className="text-sm text-slate-400 text-center py-6">
          Unable to load post earnings. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span>Post Earnings</span>
        </div>
        {total > 0 && (
          <span className="text-xs text-slate-400">{total} post{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          No post earnings yet. Start posting to earn coins!
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((post) => {
              const progress = Math.min((post.coinBalance / COIN_THRESHOLD) * 100, 100);
              const isConverting = convertMutation.isLoading && convertMutation.variables === post.postId;

              return (
                <div
                  key={post.postId}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {post.thresholdReached ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                      )}
                      <span className="text-xs text-slate-500 font-mono">
                        …{post.postId.slice(-8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${post.thresholdReached ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {post.coinBalance.toLocaleString()}
                        <span className="text-xs font-normal text-slate-400 ml-1">coins</span>
                      </span>

                      {post.thresholdReached && !post.converted && (
                        <button
                          onClick={() => convertMutation.mutate(post.postId)}
                          disabled={isConverting}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                          aria-label={`Convert coins for post ${post.postId}`}
                        >
                          {isConverting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="w-3 h-3" />
                          )}
                          Convert
                        </button>
                      )}

                      {post.converted && (
                        <span className="text-xs text-slate-400 font-medium">Converted</span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar toward 1,000 coins */}
                  {!post.thresholdReached && (
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                        role="progressbar"
                        aria-valuenow={post.coinBalance}
                        aria-valuemin={0}
                        aria-valuemax={COIN_THRESHOLD}
                        aria-label={`${post.coinBalance} of ${COIN_THRESHOLD} coins`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostEarningsList;
