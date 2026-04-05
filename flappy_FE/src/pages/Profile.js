import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Grid3X3, Bookmark, Activity, Globe, Flag } from 'lucide-react';
import { usersAPI, postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfilePostCard from '../components/ProfilePostCard';
import ReportModal from '../components/ReportModal';
import SkeletonCard from '../components/SkeletonCard';

const StatBadge = ({ value, label }) => (
  <div className="text-center">
    <p className="text-lg font-bold text-slate-900">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [showReportModal, setShowReportModal] = useState(false);

  const { data: userData, isLoading: userLoading, error: userError } = useQuery(
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

  if (userLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (userError)   return <div className="card p-10 text-center text-red-500">Error loading profile</div>;

  const user = userData?.data;
  const isOwnProfile = currentUser?.userId === userId;

  let posts = [];
  try {
    if (postsData?.data?.data && Array.isArray(postsData.data.data)) posts = postsData.data.data;
    else if (postsData?.data && Array.isArray(postsData.data)) posts = postsData.data;
    else if (Array.isArray(postsData)) posts = postsData;
  } catch { posts = []; }

  const tabs = [
    { id: 'posts',  label: 'Posts',    icon: Grid3X3 },
    { id: 'saved',  label: 'Saved',    icon: Bookmark },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* ── Profile header card ─────────────────────── */}
      <div className="card overflow-hidden">
        {/* Cover gradient */}
        <div className="h-24 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-700" />

        <div className="px-5 pb-5">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl ring-4 ring-white shadow-lg overflow-hidden bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.profilePhotoUrl
                ? <img src={user.profilePhotoUrl} alt={user.username} className="w-full h-full object-cover" />
                : user?.username?.[0]?.toUpperCase()
              }
            </div>
            <div className="flex gap-2 mb-1">
              {!isOwnProfile && (
                <>
                  <button className="btn-primary py-1.5 px-4 text-xs">Follow</button>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                    title="Report issue"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name + bio */}
          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{user?.username}</h1>
              {user?.role === 'admin' && (
                <span className="chip bg-amber-100 text-amber-700">Admin</span>
              )}
            </div>
            <p className="text-sm text-slate-500">{user?.email}</p>
            {user?.bio && <p className="text-sm text-slate-700 leading-relaxed">{user.bio}</p>}
            {user?.website && (
              <a href={user.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
                <Globe className="w-3.5 h-3.5" /> {user.website}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 py-3 border-t border-slate-100">
            <StatBadge value={posts.length} label="Posts" />
            <StatBadge value="—" label="Followers" />
            <StatBadge value="—" label="Following" />
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────── */}
      <div className="card px-2 py-1 flex items-center gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === id
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
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
        <div className="card p-10 text-center">
          <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Saved posts will appear here</p>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card p-10 text-center">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Activity feed coming soon</p>
        </div>
      )}

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedUserId={userId}
        />
      )}
    </div>
  );
};

export default Profile;
