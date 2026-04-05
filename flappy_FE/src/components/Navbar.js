import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, MessageCircle, LogOut, Menu, X, PlusSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import LogoutConfirmModal from './LogoutConfirmModal';
import Logo from './Logo';
import UserAvatar from './UserAvatar';

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutConfirm = () => { logout(); setShowLogoutModal(false); navigate('/login'); };

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">

            {/* Left — logo + hamburger */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link to="/" className="flex items-center">
                <Logo size="md" variant="bird" />
              </Link>
            </div>

            {/* Center — search bar (desktop) */}
            {isFeatureEnabled('enableAdvancedSearch') && (
              <div className="hidden sm:flex flex-1 max-w-sm mx-4">
                <div
                  className="relative w-full cursor-pointer"
                  onClick={() => navigate('/search')}
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <div className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-400 transition-colors select-none">
                    Search people, posts…
                  </div>
                </div>
              </div>
            )}

            {/* Right — actions */}
            <div className="flex items-center gap-1">
              {/* Mobile search */}
              <button
                onClick={() => navigate('/search')}
                className="sm:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Create post — desktop */}
              <Link
                to="/create"
                className="hidden sm:flex items-center gap-1.5 btn-primary py-2 px-3 text-xs"
                aria-label="Create post"
              >
                <PlusSquare className="w-4 h-4" />
                <span>Post</span>
              </Link>

              {isFeatureEnabled('enableNotifications') && (
                <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                </button>
              )}

              {isFeatureEnabled('enableChat') && (
                <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors" aria-label="Messages">
                  <MessageCircle className="w-5 h-5" />
                </button>
              )}

              {/* Avatar / profile */}
              <Link
                to={user?.userId ? `/profile/${user.userId}` : '#'}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Profile"
              >
                <UserAvatar user={user} size="sm" ring />
                <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[80px] truncate">
                  {user?.username}
                </span>
              </Link>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
};

export default Navbar;
