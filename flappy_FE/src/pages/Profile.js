import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Grid3X3, Bookmark, Activity, Globe, Flag, Pencil } from 'lucide-react';
import { usersAPI, postsAPI, interactionsAPI, subscriptionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfilePostCard from '../components/ProfilePostCard';
import ReportModal from '../components/ReportModal';
import SkeletonCard from '../components/SkeletonCard';
import UserAvatar from '../components/UserAvatar';
import FollowButton from '../components/FollowButton';
import SubscribeButton from '../components/subscription/SubscribeButton';
import FollowListModal from '../components/FollowListModal';
import EditProfileModal from '../components/EditProfileModal';
import { getHeaderStyle, getAccentColor, getChipStyle } from '../utils/profileColors';

const StatBadge = ({ value, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`text-center ${onClick ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
  >
    <p className="text-lg font-bold text-slate-900">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </button>
);

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followModal, setFollowModal] = useState({ open: false, type: 'followers' });

  const { data: userData, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery(
    ['user', userId],
    () => usersAPI.getUser(userId),
    { enabled: !!userId }
  );

  const actualUserId = userData?.data?.userId;

  const { data: postsData, isLoading: postsLoading } = useQuery(
    ['userPosts', actualUserId],
    () => postsAPI.getPostsByUserId(actualUserId),
    { enabled: !!actualUserId }
  );

  // Fetch follow stats from cache-backed endpoint
  const { data: statsData } = useQuery(
    ['profileStats', actualUserId],
    () => usersAPI.getProfileStats(actualUserId),
    { enabled: !!actualUserId, staleTime: 10000 }
  );

  // Fetch current user's subscription status for SubscribeButton
  const { data: subscriptionData } = useQuery(
    ['subscriptionStatus', currentUser?.userId],
    () => subscriptionsAPI.getSubscriptionStatus(currentUser?.userId),
    { enabled: !!currentUser?.userId, staleTime: 10000 }
  );

  // Fetch bookmarked posts for the "Saved" tab (own profile only)
  const { data: bookmarksData, isLoading: bookmarksLoading } = useQuery(
    ['userBookmarks', currentUser?.userId],
    () => interactionsAPI.getUserBookmarks(currentUser?.userId),
    {
      enabled: !!currentUser?.userId && currentUser?.userId === userId && activeTab === 'saved',
    }
  );

  if (userLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (userError)   return <div className="card p-10 text-center text-red-500">Error loading profile</div>;

  const user = userData?.data;
  const isOwnProfile = currentUser?.userId === userId;
  const stats = statsData?.data || { followerCount: 0, followingCount: 0, isFollowing: false };
  const currentUserIsSubscribed = subscriptionData?.data?.isSubscribed ?? false;

  let posts = [];
  try {
    if (postsData?.data?.data && Array.isArray(postsData.data.data)) posts = postsData.data.data;
    else if (postsData?.data && Array.isArray(postsData.data)) posts = postsData.data;
    else if (Array.isArray(postsData)) posts = postsData;
  } catch { posts = []; }

  let bookmarks = [];
  try {
    if (bookmarksData?.data?.data && Array.isArray(bookmarksData.data.data)) bookmarks = bookmarksData.data.data;
    else if (bookmarksData?.data && Array.isArray(bookmarksData.data)) bookmarks = bookmarksData.data;
    else if (Array.isArray(bookmarksData)) bookmarks = bookmarksData;
  } catch { bookmarks = []; }

  const tabs = [
    { id: 'posts',  label: 'Posts',    icon: Grid3X3 },
    { id: 'saved',  label: 'Saved',    icon: Bookmark },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* ── Profile header card ─────────────────────── */}
      <div className="card overflow-hidden">
        <div className="relative" style={{ paddingBottom: '50px' }}>
          <div className="h-28" style={getHeaderStyle(user?.userId)} />

          <div className="absolute left-5" style={{ bottom: '0px' }}>
            <div className="p-[3px] bg-white rounded-2xl shadow-lg">
              <div
                className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
                style={user?.profilePhotoUrl ? {} : { background: getHeaderStyle(user?.userId).background }}
              >
                {user?.profilePhotoUrl
                  ? <img src={user.profilePhotoUrl} alt={user.username} className="w-full h-full object-cover" />
                  : user?.username?.[0]?.toUpperCase()
                }
              </div>
            </div>
          </div>

          {!isOwnProfile && (
            <div className="absolute right-3 sm:right-4 flex gap-1.5 sm:gap-2 flex-wrap justify-end" style={{ bottom: '10px' }}>
              <SubscribeButton
                isSubscribed={currentUserIsSubscribed}
                compact
              />
              <FollowButton
                targetUserId={actualUserId}
                isFollowing={stats.isFollowing}
                accentBg={getHeaderStyle(user?.userId).background}
              />
              <button
                onClick={() => setShowReportModal(true)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                title="Report issue"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="px-5 pt-3 pb-5">
          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 min-w-0 truncate">{user?.username}</h1>
              {user?.role === 'admin' && (
                <span className="chip bg-amber-100 text-amber-700">Admin</span>
              )}
              {/* Desktop: show buttons inline next to username */}
              {isOwnProfile && (
                <div className="hidden sm:flex items-center gap-2 ml-auto shrink-0">
                  <SubscribeButton
                    isSubscribed={currentUserIsSubscribed}
                    compact
                  />
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Edit Profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {isOwnProfile && <p className="text-sm text-slate-500">{user?.email}</p>}
            {/* Mobile: show buttons below username and email */}
            {isOwnProfile && (
              <div className="flex sm:hidden items-center gap-2 pt-2">
                <SubscribeButton
                  isSubscribed={currentUserIsSubscribed}
                  compact
                />
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Edit Profile"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            {user?.bio && <p className="text-sm text-slate-700 leading-relaxed">{user.bio}</p>}
            {user?.website && (
              <a href={user.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
                <Globe className="w-3.5 h-3.5" /> {user.website}
              </a>
            )}
          </div>

          <div className="flex items-center gap-6 py-3 border-t border-slate-100">
            <StatBadge value={posts.length} label="Posts" />
            <StatBadge
              value={stats.followerCount}
              label="Followers"
              onClick={() => setFollowModal({ open: true, type: 'followers' })}
            />
            <StatBadge
              value={stats.followingCount}
              label="Following"
              onClick={() => setFollowModal({ open: true, type: 'following' })}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────── */}
      <div className="card px-2 py-1 flex items-center gap-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              style={isActive ? { background: getHeaderStyle(user?.userId).background } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Posts tab ──────────────────────────────── */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {postsLoading ? (
            [1, 2].map(i => <SkeletonCard key={i} />)
          ) : posts.length === 0 ? (
            <div className="card p-10 text-center">
              <Grid3X3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No posts yet</p>
            </div>
          ) : (
            posts.map(post => <ProfilePostCard key={post._id} post={post} />)
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="space-y-4">
          {!isOwnProfile ? (
            <div className="card p-10 text-center">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Saved posts are private</p>
            </div>
          ) : bookmarksLoading ? (
            [1, 2].map(i => <SkeletonCard key={i} />)
          ) : bookmarks.length === 0 ? (
            <div className="card p-10 text-center">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No saved posts yet</p>
              <p className="text-xs text-slate-400 mt-1">Bookmark posts to see them here</p>
            </div>
          ) : (
            bookmarks.map(post => (
              <div key={post._id} className="relative">
                <ProfilePostCard post={post} />
                {post.bookmarkedAt && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-primary-100 text-primary-600 px-2 py-1 rounded-full text-xs font-medium">
                      Saved {new Date(post.bookmarkedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card p-10 text-center">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Activity feed coming soon</p>
        </div>
      )}

      {/* Modals */}
      <FollowListModal
        isOpen={followModal.open}
        onClose={() => setFollowModal({ ...followModal, open: false })}
        userId={actualUserId}
        type={followModal.type}
      />

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedUserId={userId}
        />
      )}

      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onProfileUpdated={refetchUser}
      />
    </div>
  );
};

export default Profile;
