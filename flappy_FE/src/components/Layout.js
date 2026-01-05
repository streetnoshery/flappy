import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 w-full lg:max-w-4xl lg:mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 ml-0 lg:ml-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;