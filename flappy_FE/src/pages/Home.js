import React from 'react';
import { useQuery } from 'react-query';
import { feedAPI } from '../services/api';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Home = () => {
  const { data: feedData, isLoading, error } = useQuery(
    'homeFeed',
    () => feedAPI.getHomeFeed(),
    {
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-600">Error loading feed</div>;

  const posts = feedData?.data?.posts || [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Home Feed</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening.</p>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No posts yet. Start following people or create your first post!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))
        )}
      </div>
    </div>
  );
};

export default Home;