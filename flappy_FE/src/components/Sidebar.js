import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, PlusSquare, User, Search, Bookmark, X, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { icon: Home,      label: 'Home',      path: '/' },
    { icon: Search,    label: 'Search',    path: '/search' },
    { icon: Compass,   label: 'Explore',   path: '/explore' },
    { icon: PlusSquare,label: 'Create',    path: '/create' },
    { icon: Bookmark,  label: 'Bookmarks', path: '/bookmarks' },
    {
      icon: User,
      label: 'Profile',
      path: user?.userId ? `/profile/${user.userId}` : '#',
      disabled: !user?.userId,
    },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  const close = () => { if (window.innerWidth < 1024) setSidebarOpen(false); };

  return (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 lg:top-16 inset-y-0 left-0 z-50 lg:z-auto
        w-60 bg-white/90 backdrop-blur-xl border-r border-slate-100
        flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        h-screen lg:h-[calc(100vh-4rem)]
      `}>
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="font-semibold text-slate-800">Menu</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            if (item.disabled) {
              return (
                <div key={item.path} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 cursor-not-allowed text-sm">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-primary-600' : ''}`} />
                <span>{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User card at bottom */}
        {user && (
          <div className="p-3 border-t border-slate-100">
            <Link
              to={user?.userId ? `/profile/${user.userId}` : '#'}
              onClick={close}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.username}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
