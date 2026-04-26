import React from 'react';
import { useQuery } from 'react-query';
import { Wallet as WalletIcon, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { walletAPI, subscriptionsAPI } from '../services/api';
import CoinBalanceDisplay from '../components/wallet/CoinBalanceDisplay';
import TransactionList from '../components/wallet/TransactionList';
import ConversionForm from '../components/wallet/ConversionForm';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: subscriptionData, isLoading: subLoading } = useQuery(
    ['subscriptionStatus', user?.userId],
    () => subscriptionsAPI.getSubscriptionStatus(user?.userId),
    { enabled: !!user?.userId, staleTime: 10000 }
  );

  const isSubscribed = subscriptionData?.data?.isSubscribed ?? false;

  const { data: balanceData, isLoading: balanceLoading } = useQuery(
    'walletBalance',
    () => walletAPI.getBalance(),
    { enabled: isSubscribed, staleTime: 10000 }
  );

  const balance = balanceData?.data?.balance ?? 0;
  const engagementCount = balanceData?.data?.engagementCount ?? 0;

  if (subLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-10 text-center">
          <Lock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Subscription Required</h2>
          <p className="text-sm text-slate-500 mb-6">
            Subscribe to the rewards program to access your wallet, view transaction history, and convert coins to real money.
          </p>
          <button
            onClick={() => navigate(`/profile/${user?.userId}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm hover:opacity-90 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            Go to Profile to Subscribe
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <WalletIcon className="w-6 h-6 text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">Wallet</h1>
      </div>

      {balanceLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <CoinBalanceDisplay balance={balance} />
          <ConversionForm balance={balance} engagementCount={engagementCount} />
          <TransactionList />
        </>
      )}
    </div>
  );
};

export default Wallet;
