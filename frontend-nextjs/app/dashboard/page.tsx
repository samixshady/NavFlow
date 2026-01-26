'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  Users,
  Folder,
  CheckSquare,
  BarChart3,
  Plus,
  TrendingUp,
  Clock,
  Calendar,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

interface DashboardStats {
  projectCount: number;
  taskCount: number;
  orgCount: number;
  completedTasks: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    projectCount: 0,
    taskCount: 0,
    orgCount: 0,
    completedTasks: 0,
  });

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const completionRate = stats.taskCount > 0 ? Math.round((stats.completedTasks / stats.taskCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">NF</span>
              </div>
              <h1 className="text-2xl font-bold text-white hidden sm:block">NavFlow</h1>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-300">
                  {user?.first_name} {user?.last_name || ''}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-white/10">
              <div className="text-right py-4">
                <p className="text-sm text-gray-300">
                  {user?.first_name} {user?.last_name || ''}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome back, {user?.first_name}! 👋
          </h2>
          <p className="text-gray-400">
            Here's what's happening with your projects today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {/* Projects Card */}
          <div className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-pink-600/0 group-hover:from-purple-600/10 group-hover:to-pink-600/10 rounded-2xl transition duration-300"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl mb-4 flex items-center justify-center group-hover:bg-purple-500/30 transition">
                <Folder className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-gray-400 text-sm mb-2">Projects</p>
              <p className="text-4xl font-bold text-white mb-3">{stats.projectCount}</p>
              <div className="flex items-center text-purple-400 text-xs font-medium">
                <TrendingUp className="w-3 h-3 mr-1" />
                Active projects
              </div>
            </div>
          </div>

          {/* Tasks Card */}
          <div className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-cyan-600/0 group-hover:from-blue-600/10 group-hover:to-cyan-600/10 rounded-2xl transition duration-300"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl mb-4 flex items-center justify-center group-hover:bg-blue-500/30 transition">
                <CheckSquare className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-gray-400 text-sm mb-2">Tasks</p>
              <p className="text-4xl font-bold text-white mb-3">{stats.taskCount}</p>
              <div className="flex items-center text-blue-400 text-xs font-medium">
                <Calendar className="w-3 h-3 mr-1" />
                Total tasks
              </div>
            </div>
          </div>

          {/* Organizations Card */}
          <div className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/0 to-emerald-600/0 group-hover:from-green-600/10 group-hover:to-emerald-600/10 rounded-2xl transition duration-300"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl mb-4 flex items-center justify-center group-hover:bg-green-500/30 transition">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-gray-400 text-sm mb-2">Organizations</p>
              <p className="text-4xl font-bold text-white mb-3">{stats.orgCount}</p>
              <div className="flex items-center text-green-400 text-xs font-medium">
                <Users className="w-3 h-3 mr-1" />
                Teams joined
              </div>
            </div>
          </div>

          {/* Completion Rate Card */}
          <div className="group relative bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/0 to-rose-600/0 group-hover:from-pink-600/10 group-hover:to-rose-600/10 rounded-2xl transition duration-300"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl mb-4 flex items-center justify-center group-hover:bg-pink-500/30 transition">
                <BarChart3 className="w-6 h-6 text-pink-400" />
              </div>
              <p className="text-gray-400 text-sm mb-2">Completion Rate</p>
              <p className="text-4xl font-bold text-white mb-3">{completionRate}%</p>
              <div className="flex items-center text-pink-400 text-xs font-medium">
                <Clock className="w-3 h-3 mr-1" />
                {stats.completedTasks} completed
              </div>
            </div>
          </div>
        </div>

        {/* Action Sections */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition">
            <h3 className="text-2xl font-bold text-white mb-6">Quick Actions</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <button onClick={() => router.push('/projects')} className="group p-4 bg-gradient-to-br from-purple-600/20 to-purple-600/0 border border-purple-500/30 rounded-lg hover:border-purple-500/60 transition text-white font-medium flex items-center justify-center gap-2">
                <Plus className="w-5 h-5 group-hover:scale-110 transition" />
                <span className="hidden sm:inline">Create Project</span>
                <span className="sm:hidden">Project</span>
              </button>
              <button onClick={() => router.push('/tasks')} className="group p-4 bg-gradient-to-br from-blue-600/20 to-blue-600/0 border border-blue-500/30 rounded-lg hover:border-blue-500/60 transition text-white font-medium flex items-center justify-center gap-2">
                <Plus className="w-5 h-5 group-hover:scale-110 transition" />
                <span className="hidden sm:inline">Create Task</span>
                <span className="sm:hidden">Task</span>
              </button>
              <button onClick={() => router.push('/organizations')} className="group p-4 bg-gradient-to-br from-green-600/20 to-green-600/0 border border-green-500/30 rounded-lg hover:border-green-500/60 transition text-white font-medium flex items-center justify-center gap-2">
                <Plus className="w-5 h-5 group-hover:scale-110 transition" />
                <span className="hidden sm:inline">Create Org</span>
                <span className="sm:hidden">Org</span>
              </button>
            </div>
          </div>

          {/* User Profile Summary */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition">
            <h3 className="text-xl font-bold text-white mb-6">Profile</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-gray-400">Signed in as</p>
                  <p className="text-white font-semibold truncate">{user?.email}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 space-y-2">
                <p>✓ Email verified</p>
                <p>✓ Account active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity / Features */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition">
          <h3 className="text-2xl font-bold text-white mb-6">What You Can Do</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/30 transition">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg mb-3 flex items-center justify-center">
                <Folder className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-white font-semibold mb-2">Manage Projects</h4>
              <p className="text-gray-400 text-sm">Organize your work into projects and collaborate with your team</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/30 transition">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg mb-3 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold mb-2">Track Tasks</h4>
              <p className="text-gray-400 text-sm">Create and monitor tasks to keep your projects on track</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-green-500/30 transition">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg mb-3 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <h4 className="text-white font-semibold mb-2">Collaborate</h4>
              <p className="text-gray-400 text-sm">Work together with team members and manage permissions</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            NavFlow © {new Date().getFullYear()} • Project Management Made Simple
          </p>
        </div>
      </footer>
    </div>
  );
}
