import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { usersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
  const { userId } = useParams();
  
  const { data: userData, isLoading, error } = useQuery(
    ['user', userId],
    () => usersAPI.getUser(userId),
    {
      enabled: !!userId,
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-600">Error loading profile</div>;

  const user = userData?.data;

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
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Posts</h2>
        <div className="text-center text-gray-500 py-8">
          No posts yet
        </div>
      </div>
    </div>
  );
};

export default Profile;