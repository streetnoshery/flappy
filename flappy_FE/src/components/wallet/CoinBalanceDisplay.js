import React from 'react';
import { Coins, Clock } from 'lucide-react';

const CoinBalanceDisplay = ({ summary = {} }) => {
  const {
    withdrawableBalance = 0,
    pendingBalance = 0,
    thresholdReachedPostCount = 0,
    totalPostCount = 0,
  } = summary;

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-4">
        <Coins className="w-4 h-4 text-amber-500" />
        <span>Coin Balance</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Withdrawable */}
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs font-medium text-emerald-600 mb-1">Withdrawable</p>
          <p className="text-3xl font-bold text-emerald-700">
            {withdrawableBalance.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-500 mt-1">
            {thresholdReachedPostCount} post{thresholdReachedPostCount !== 1 ? 's' : ''} ready
          </p>
        </div>

        {/* Pending */}
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <p className="text-xs font-medium text-amber-600">Pending</p>
          </div>
          <p className="text-3xl font-bold text-amber-700">
            {pendingBalance.toLocaleString()}
          </p>
          <p className="text-xs text-amber-500 mt-1">
            {totalPostCount - thresholdReachedPostCount} post{(totalPostCount - thresholdReachedPostCount) !== 1 ? 's' : ''} accumulating
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-3 text-center">
        Posts need 1,000 coins before they become withdrawable
      </p>
    </div>
  );
};

export default CoinBalanceDisplay;
