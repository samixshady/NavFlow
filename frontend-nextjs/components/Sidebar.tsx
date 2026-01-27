'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Activity, 
  Settings, 
  LogOut,
  X,
  Menu,
  Building2
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'My Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Activity Log', href: '/activity', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 lg:z-30
          w-64 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
          border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-xl lg:shadow-none
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section - h-16 matches Navbar height exactly */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                NavFlow
              </span>
            </Link>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg
                    transition-all duration-200 group
                    ${isActive
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon 
                    className={`w-5 h-5 ${
                      isActive 
                        ? 'text-white' 
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400'
                    }`}
                  />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full
                text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
