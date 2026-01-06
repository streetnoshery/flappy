import React from 'react';
import { useQuery } from 'react-query';
import { interactionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfilePostCard from '../components/ProfilePostCard';
import { Bookmark } from 'lucide-react';

const Bookmarks = () => {
  const { user } = useAuth();
  
  const { data: bookmarksData, isLoading, error } = useQuery(
    ['userBookmarks', user?.userId],
    () => interactionsAPI.getUserBookmarks(user?.userId),
    {
      enabled: !!user?.userId,
    }
  );

  // Safely extract bookmarks
  let bookmarks = [];
  try {
    // Check for double-nested axios response structure first (response.data.data.data)
    if (bookmarksData && bookmarksData.data && bookmarksData.data.data && Array.isArray(bookmarksData.data.data)) {
      bookmarks = bookmarksData.data.data;
    } else if (bookmarksData && bookmarksData.data && Array.isArray(bookmarksData.data)) {
      bookmarks = bookmarksData.data;
    } else if (bookmarksData && Array.isArray(bookmarksData)) {
      bookmarks = bookmarksData;
    } else {
      bookmarks = [];
    }
  } catch (error) {
    console.error('Error processing bookmarks data:', error);
    bookmarks = [];
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-600">Error loading bookmarks</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Bookmark className="w-6 h-6 text-primary-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Saved Posts</h1>
        </div>
        
        <p className="text-gray-600 text-sm sm:text-base mb-6">
          Posts you've bookmarked for later reading
        </p>

        {bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved posts yet</h3>
            <p className="text-gray-500">
              When you bookmark posts, they'll appear here for easy access later.
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {bookmarks.map((post) => (
              <div key={post._id} className="relative">
                <ProfilePostCard post={post} />
                {/* Bookmark indicator */}
                <div className="absolute top-2 right-2">
                  <div className="bg-primary-100 text-primary-600 px-2 py-1 rounded-full text-xs font-medium">
                    Saved {new Date(post.bookmarkedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookmarks;