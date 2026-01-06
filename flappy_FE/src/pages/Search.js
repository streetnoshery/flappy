import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Search as SearchIcon, User, Hash, AlertCircle } from 'lucide-react';
import { searchAPI } from '../services/api';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Search = () => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const { isFeatureEnabled, loading: flagsLoading } = useFeatureFlags();

  // Check if advanced search is enabled
  const isAdvancedSearchEnabled = isFeatureEnabled('enableAdvancedSearch');

  const { data: usersData, isLoading: usersLoading } = useQuery(
    ['searchUsers', query],
    () => searchAPI.searchUsers(query),
    {
      enabled: query.length > 0 && activeTab === 'users' && isAdvancedSearchEnabled,
    }
  );

  const { data: postsData, isLoading: postsLoading } = useQuery(
    ['searchPosts', query],
    () => searchAPI.searchPosts(query),
    {
      enabled: query.length > 0 && activeTab === 'posts' && isAdvancedSearchEnabled,
    }
  );

  const { data: trendingData } = useQuery(
    'trendingTags',
    () => searchAPI.getTrendingTags(),
    {
      enabled: isAdvancedSearchEnabled,
    }
  );

  const users = usersData?.data || [];
  const posts = postsData?.data || [];
  const trendingTags = trendingData?.data || [];

  const tabs = [
    { id: 'users', label: 'Users', icon: User },
    { id: 'posts', label: 'Posts', icon: Hash },
  ];

  // Show loading state while feature flags are loading
  if (flagsLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Show disabled message if advanced search is not enabled
  if (!isAdvancedSearchEnabled) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Search Coming Soon</h2>
            <p className="text-gray-600">
              Advanced search functionality is currently disabled. Check back later!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, posts, or hashtags..."
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Trending Tags */}
      {!query && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Trending Tags</h2>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((tag, index) => (
              <button
                key={index}
                onClick={() => setQuery(tag.tag)}
                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors text-xs sm:text-sm"
              >
                #{tag.tag} ({tag.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {query && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 sm:p-6">
              {activeTab === 'users' && (
                <div>
                  {usersLoading ? (
                    <LoadingSpinner />
                  ) : users.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No users found</p>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div key={user._id} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 hover:bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                            {user.profilePhotoUrl ? (
                              <img
                                src={user.profilePhotoUrl}
                                alt={user.username}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm sm:text-base text-gray-600 font-medium">
                                {user.username[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{user.username}</h3>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</p>
                            {user.bio && (
                              <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'posts' && (
                <div>
                  {postsLoading ? (
                    <LoadingSpinner />
                  ) : posts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No posts found</p>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <div key={post._id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                          <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs sm:text-sm text-gray-600 font-medium">
                                {post.userId?.username?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900 text-sm sm:text-base truncate">
                              {post.userId?.username}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm sm:text-base">{post.content}</p>
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                              {post.hashtags.map((tag, index) => (
                                <span key={index} className="text-primary-600 text-xs sm:text-sm">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Search;