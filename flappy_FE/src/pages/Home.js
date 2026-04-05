import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Sparkles, Users, TrendingUp, PlusSquare, RefreshCw } from 'lucide-react';
import { feedAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import SkeletonCard from '../components/SkeletonCard';

const tabs = [
  { id: 'for-you',   label: 'For You',   icon: Sparkles },
  { id: 'following', label: 'Following',  icon: Users },
  { id: 'trending',  label: 'Trending',   icon: TrendingUp },
];

const EmptyFeed = () => (
  <div className="card p-10 text-center animate-fade-up">
    <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
      <Sparkles className="w-8 h-8 text-primary-500" />
    </div>
    <h3 className="text-base font-semibold text-slate-800 mb-1">Nothing here yet</h3>
    <p className="text-sm text-slate-500 mb-5">Be the first to share something with the world.</p>
    <Link to="/create" className="btn-primary inline-flex mx-auto">
      <PlusSquare className="w-4 h-4" /> Create a post
    </Link>
  </div>
);

const ErrorFeed = ({ onRetry }) => (
  <div className="card p-10 text-center animate-fade-up">
    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
      <RefreshCw className="w-8 h-8 text-red-400" />
    </div>
    <h3 className="text-base font-semibold text-slate-800 mb-1">We'll be back soon</h3>
    <p className="text-sm text-slate-500 mb-5">Something went wrong loading your feed.</p>
    <button onClick={onRetry} className="btn-primary inline-flex mx-auto">
      <RefreshCw className="w-4 h-4" /> Try again
    </button>
  </div>
);

const Home = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('for-you');

  const { data: feedData, isLoading, error, refetch } = useQuery(
    ['homeFeed', activeTab],
    () => feedAPI.getHomeFeed(),
    { refetchOnWindowFocus: false, staleTime: 30_000 }
  );

  const posts = feedData?.data?.posts || [];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* ── Quick compose ──────────────────────────── */}
      <div className="card px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <Link
          to="/create"
          className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 transition-colors cursor-pointer select-none"
        >
          What's on your mind, {user?.username?.split(' ')[0]}?
        </Link>
        <Link to="/create" className="btn-primary py-2 px-3 text-xs flex-shrink-0">
          <PlusSquare className="w-4 h-4" />
        </Link>
      </div>

      {/* ── Tabs ───────────────────────────────────── */}
      <div className="card px-2 py-1 flex items-center gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === id
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Feed ───────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <ErrorFeed onRetry={refetch} />
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post._id} post={post} />)}
        </div>
      )}
    </div>
  );
};

export default Home;
