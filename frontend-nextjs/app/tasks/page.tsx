'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Plus,
  CheckSquare,
  Menu,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
}

export default function TasksPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/login');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      todo: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      done: 'bg-green-500/20 text-green-300 border-green-500/30',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: Task['priority']) => {
    const colors: Record<Task['priority'], string> = {
      low: 'bg-green-500/20 text-green-300',
      medium: 'bg-yellow-500/20 text-yellow-300',
      high: 'bg-orange-500/20 text-orange-300',
      critical: 'bg-red-500/20 text-red-300',
    };
    return colors[priority];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">NF</span>
              </div>
              <h1 className="text-2xl font-bold text-white hidden sm:block">Tasks</h1>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-300 hover:text-white transition"
              >
                Dashboard
              </button>
              <button onClick={() => alert('Create task functionality coming soon')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
                <Plus className="w-4 h-4" />
                New Task
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Tasks</h2>
          <p className="text-gray-400">Track and manage your tasks</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-3 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition"
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                filterStatus === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('todo')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                filterStatus === 'todo'
                  ? 'bg-gray-500 text-white'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              To Do
            </button>
            <button
              onClick={() => setFilterStatus('in_progress')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                filterStatus === 'in_progress'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilterStatus('review')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                filterStatus === 'review'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => setFilterStatus('done')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                filterStatus === 'done'
                  ? 'bg-green-600 text-white'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              Done
            </button>
          </div>
        </div>

        {/* Empty State */}
        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-2">No tasks yet</h3>
            <p className="text-gray-400 mb-6">Create your first task to get started</p>
            <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
              <Plus className="w-5 h-5" />
              Create Task
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tasks will be rendered here */}
          </div>
        )}
      </main>
    </div>
  );
}
