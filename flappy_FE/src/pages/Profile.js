import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { usersAPI, postsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import PostCard from '../components/PostCard';

const Profile = () => {
  const { userId } = useParams();
  
  const { data: userData, isLoading: userLoading, error: userError } = useQuery(
    ['user', userId],
    () => usersAPI.getUser(userId),
    {
      enabled: !!userId,
    }
  );

  // Extract the actual userId from user data
  const actualUserId = userData?.data?.userId;

  const { data: postsData, isLoading: postsLoading, error: postsError } = useQuery(
    ['userPosts', actualUserId],
    () => postsAPI.getPostsByUserId(actualUserId),
    {
      enabled: !!actualUserId, // Only fetch when we have the actual userId
    }
  );

  if (userLoading) return <LoadingSpinner />;
  if (userError) return <div className="text-center text-red-600">Error loading profile</div>;

  const user = userData?.data;
  
  // Safely extract posts with multiple fallbacks
  let posts = [];
  try {
    if (postsData && postsData.data && Array.isArray(postsData.data)) {
      posts = postsData.data;
    } else if (postsData && Array.isArray(postsData)) {
      posts = postsData;
    } else {
      posts = [];
    }
  } catch (error) {
    console.error('Error processing posts data:', error);
    posts = [];
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
            {user?.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user.username}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
              />
            ) : (
              <span className="text-xl sm:text-2xl text-gray-600 font-medium">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user?.username}</h1>
            <p className="text-gray-600 text-sm sm:text-base">{user?.email}</p>
            {user?.bio && (
              <p className="mt-2 text-gray-700 text-sm sm:text-base">{user.bio}</p>
            )}
            {user?.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-primary-600 hover:underline block text-sm sm:text-base"
              >
                {user.website}
              </a>
            )}
            
            {/* Posts count */}
            <div className="mt-3 text-sm text-gray-600">
              <span className="font-medium">{posts.length}</span> {posts.length === 1 ? 'post' : 'posts'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Posts</h2>
        
        {postsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : postsError ? (
          <div className="text-center text-red-600 py-8">
            Error loading posts
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No posts yet
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;