import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ArrowRightLeft, AlertCircle, Loader2, TrendingUp, Coins } from 'lucide-react';
import { walletAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ProgressBar = ({ current, target, label, icon: Icon }) => {
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const met = current >= target;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Icon className="w-4 h-4 text-amber-500" />
          <span>{label}</span>
        </div>
        <span className={`text-xs font-semibold ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
          {current.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            met ? 'bg-emerald-500' : 'bg-amber-400'
          }`}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-label={`${label} progress`}
        />
      </div>
    </div>
  );
};

const ConversionForm = ({ balance = 0, engagementCount = 0 }) => {
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: thresholdsData, isLoading: thresholdsLoading } = useQuery(
    'walletThresholds',
    () => walletAPI.getThresholds(),
    { staleTime: 60000 }
  );

  const thresholds = thresholdsData?.data || {
    coinThreshold: 0,
    engagementThreshold: 0,
    conversionRate: 1,
  };

  const coinsMet = balance >= thresholds.coinThreshold;
  const engagementMet = engagementCount >= thresholds.engagementThreshold;
  const thresholdsMet = coinsMet && engagementMet;

  const conversionMutation = useMutation(
    (conversionAmount) => walletAPI.requestConversion(conversionAmount),
    {
      onSuccess: () => {
        toast.success('Conversion request submitted successfully!');
        setAmount('');
        queryClient.invalidateQueries('walletBalance');
        queryClient.invalidateQueries(['walletTransactions']);
      },
      onError: (err) => {
        const message = err.response?.data?.message || 'Conversion request failed. Please try again.';
        toast.error(message);
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid conversion amount.');
      return;
    }

    if (numAmount > balance) {
      toast.error('Conversion amount exceeds your current balance.');
      return;
    }

    conversionMutation.mutate(numAmount);
  };

  if (thresholdsLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-4">
          <ArrowRightLeft className="w-4 h-4 text-amber-500" />
          <span>Convert Coins</span>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-4">
        <ArrowRightLeft className="w-4 h-4 text-amber-500" />
        <span>Convert Coins</span>
      </div>

      <div className="space-y-4 mb-6">
        <ProgressBar
          current={balance}
          target={thresholds.coinThreshold}
          label="Coin Threshold"
          icon={Coins}
        />
        <ProgressBar
          current={engagementCount}
          target={thresholds.engagementThreshold}
          label="Engagement Threshold"
          icon={TrendingUp}
        />
      </div>

      {!thresholdsMet && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            {!coinsMet && !engagementMet ? (
              <p>
                You need at least {thresholds.coinThreshold.toLocaleString()} coins and{' '}
                {thresholds.engagementThreshold.toLocaleString()} engagements to convert.
              </p>
            ) : !coinsMet ? (
              <p>
                You need at least {thresholds.coinThreshold.toLocaleString()} coins to convert.
                You currently have {balance.toLocaleString()}.
              </p>
            ) : (
              <p>
                You need at least {thresholds.engagementThreshold.toLocaleString()} engagements
                to convert. You currently have {engagementCount.toLocaleString()}.
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="conversion-amount" className="block text-xs font-medium text-slate-500 mb-1">
            Amount to convert
          </label>
          <input
            id="conversion-amount"
            type="number"
            min="1"
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter coin amount"
            disabled={!thresholdsMet || conversionMutation.isLoading}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          />
          {thresholdsMet && thresholds.conversionRate > 0 && amount > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              ≈ ${(Number(amount) / thresholds.conversionRate).toFixed(2)} payout
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!thresholdsMet || conversionMutation.isLoading || !amount}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white rounded-xl shadow-sm hover:opacity-90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          {conversionMutation.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowRightLeft className="w-4 h-4" />
              Convert Coins
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ConversionForm;
