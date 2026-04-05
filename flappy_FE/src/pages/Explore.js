import React from 'react';
import { useQuery } from 'react-query';
import { Compass, RefreshCw } from 'lucide-react';
import { feedAPI } from '../services/api';
import PostCard from '../components/PostCard';
import SkeletonCard from '../components/SkeletonCard';

const Explore = () => {
  const { data, isLoading, error, refetch } = useQuery(
    'exploreFeed',
    () => feedAPI.getExploreFeed(),
    { refetchOnWindowFocus: false, staleTime: 60_000 }
  );

  const posts = data?.data?.posts || [];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="card px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">Explore</h1>
          <p className="text-xs text-slate-500">Discover trending content</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      ) : error ? (
        <div className="card p-10 text-center">
          <RefreshCw className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-4">Failed to load explore feed</p>
          <button onClick={refetch} className="btn-primary inline-flex mx-auto text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="card p-10 text-center">
          <Compass className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nothing to explore yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post._id} post={post} />)}
        </div>
      )}
    </div>
  );
};

export default Explore;
