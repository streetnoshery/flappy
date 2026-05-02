import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Home, Compass, PlusSquare, Search, Bookmark, Wallet } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

/* Bottom nav for mobile */
const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const items = [
    { icon: Home,       path: '/',          label: 'Home' },
    { icon: Search,     path: '/search',    label: 'Search' },
    { icon: PlusSquare, path: '/create',    label: 'Create', highlight: true },
    { icon: Wallet,     path: '/wallet',    label: 'Wallet' },
    { icon: Compass,    path: '/explore',   label: 'Explore' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-100 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map(({ icon: Icon, path, label, highlight }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150 active:scale-90 ${
                highlight
                  ? 'text-white bg-gradient-to-r from-primary-600 to-accent-500 shadow-glow -mt-3 rounded-2xl px-4 py-3'
                  : isActive
                  ? 'text-primary-600'
                  : 'text-slate-400'
              }`}
              aria-label={label}
            >
              <Icon className={`${highlight ? 'w-5 h-5' : 'w-5 h-5'}`} />
              {!highlight && <span className="text-[10px] font-medium">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex max-w-6xl mx-auto">
        {/* Sidebar — desktop only */}
        <div className="hidden lg:block w-60 flex-shrink-0">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>

        {/* Mobile sidebar */}
        <div className="lg:hidden">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-3 sm:px-5 py-5 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export default Layout;
