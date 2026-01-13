import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, MessageCircle, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import LogoutConfirmModal from './LogoutConfirmModal';
import Logo from './Logo';

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Debug: Log user object to help troubleshoot
  console.log('🔍 [NAVBAR] Current user object:', user);
  console.log('🔍 [NAVBAR] Profile URL will be:', `/profile/${user?.userId}`);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left side - Logo and Mobile Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <Link to="/" className="flex items-center">
              <Logo size="md" variant="bird" />
            </Link>
          </div>

          {/* Center - Search (hidden on mobile, only show desktop search if advanced search is enabled) */}
          {isFeatureEnabled('enableAdvancedSearch') && (
            <div className="hidden sm:flex flex-1 max-w-lg mx-4 lg:mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-8 sm:pl-10 pr-4 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  onClick={() => navigate('/search')}
                />
              </div>
            </div>
          )}

          {/* Right side - Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Mobile search button - always show but may redirect to coming soon */}
            <button 
              onClick={() => navigate('/search')}
              className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* Desktop actions */}
            {isFeatureEnabled('enableNotifications') && (
              <button className="hidden sm:block p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
            {isFeatureEnabled('enableChat') && (
              <button className="hidden sm:block p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
            
            {/* Profile - always visible */}
            <Link
              to={user?.userId ? `/profile/${user.userId}` : '#'}
              className={`p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full ${!user?.userId ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => {
                if (!user?.userId) {
                  e.preventDefault();
                  console.warn('⚠️ [NAVBAR] Cannot navigate to profile: userId is undefined');
                }
              }}
            >
              <User className="w-5 h-5 sm:w-6 sm:h-6" />
            </Link>
            
            {/* Logout - always visible */}
            <button
              onClick={handleLogoutClick}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </nav>
  );
};

export default Navbar;