'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        setIsMobileOpen={setIsMobileSidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-0">
        {/* Navbar */}
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />

        {/* Page Content - fills remaining height */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="h-full p-4 sm:p-6 lg:p-8">
            <div className="h-full max-w-7xl mx-auto relative">
              {/* Animated gradient background effects */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
              </div>
              
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
