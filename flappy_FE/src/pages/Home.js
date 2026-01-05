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
  if (error) return <div className="text-center text-red-600 p-4">Error loading feed</div>;

  const posts = feedData?.data?.posts || [];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mx-2 sm:mx-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Home Feed</h1>
        <p className="text-gray-600 text-sm sm:text-base">Welcome back! Here's what's happening.</p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center mx-2 sm:mx-0">
            <p className="text-gray-500 text-sm sm:text-base">No posts yet. Start following people or create your first post!</p>
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