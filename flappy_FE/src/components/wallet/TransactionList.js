import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { walletAPI } from '../../services/api';

const EVENT_TYPE_LABELS = {
  engagement_earned: 'Engagement Earned',
  engagement_received: 'Engagement Received',
  engagement_reversed: 'Engagement Reversed',
  conversion: 'Conversion',
};

const formatTimestamp = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const ITEMS_PER_PAGE = 10;

const TransactionList = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery(
    ['walletTransactions', page],
    () => walletAPI.getTransactions(page, ITEMS_PER_PAGE),
    { keepPreviousData: true }
  );

  const transactions = data?.data?.transactions || [];
  const totalPages = data?.data?.totalPages || 1;
  const total = data?.data?.total || 0;

  if (isLoading && !data) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-4">
          <Receipt className="w-4 h-4 text-amber-500" />
          <span>Transaction History</span>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-4">
          <Receipt className="w-4 h-4 text-amber-500" />
          <span>Transaction History</span>
        </div>
        <p className="text-sm text-slate-400 text-center py-6">
          Unable to load transactions. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <Receipt className="w-4 h-4 text-amber-500" />
          <span>Transaction History</span>
        </div>
        {total > 0 && (
          <span className="text-xs text-slate-400">{total} transaction{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          No transactions yet. Start engaging to earn coins!
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isCredit = tx.amount > 0;
              return (
                <div
                  key={tx._id || `${tx.createdAt}-${tx.amount}`}
                  className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {isCredit ? (
                      <ArrowUpCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {EVENT_TYPE_LABELS[tx.eventType] || tx.eventType}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {tx.relatedPostId && (
                          <span>Post: {tx.relatedPostId.slice(-6)}</span>
                        )}
                        <span>{formatTimestamp(tx.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isCredit ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {isCredit ? '+' : ''}{tx.amount}
                  </span>
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
              <span className="text-xs text-slate-400">
                Page {page} of {totalPages}
              </span>
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

export default TransactionList;
