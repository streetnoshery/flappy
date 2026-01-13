import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, PlusSquare, User, Search, Bookmark, X, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Debug: Log user object to help troubleshoot
  console.log('🔍 [SIDEBAR] Current user object:', user);

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: PlusSquare, label: 'Create', path: '/create' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { 
      icon: User, 
      label: 'Profile', 
      path: user?.userId ? `/profile/${user.userId}` : '#',
      disabled: !user?.userId
    },
  ];

  // Add admin panel for admin users
  if (user?.role === 'admin') {
    menuItems.push({ icon: Shield, label: 'Admin Panel', path: '/admin' });
  }

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:block min-h-screen
      `}>
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isDisabled = item.disabled;
            
            if (isDisabled) {
              return (
                <div
                  key={item.path}
                  className="flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-400 cursor-not-allowed opacity-50"
                  onClick={() => console.warn('⚠️ [SIDEBAR] Cannot navigate: userId is undefined')}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-sm sm:text-base">{item.label}</span>
                </div>
              );
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;