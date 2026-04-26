import React from 'react';
import { Coins } from 'lucide-react';

const CoinBalanceDisplay = ({ balance = 0 }) => {
  const formattedBalance = balance.toLocaleString();

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-3">
        <Coins className="w-4 h-4 text-amber-500" />
        <span>Coin Balance</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-slate-800">{formattedBalance}</span>
        <span className="text-sm text-slate-400 font-medium">coins</span>
      </div>
    </div>
  );
};

export default CoinBalanceDisplay;
