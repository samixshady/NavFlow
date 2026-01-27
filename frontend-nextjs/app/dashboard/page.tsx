'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  Users,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface DashboardStats {
  projectCount: number;
  taskCount: number;
  orgCount: number;
  completedTasks: number;
}

interface Project {
  id: number;
  name: string;
  description: string;
  organization: number;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    projectCount: 0,
    taskCount: 0,
    orgCount: 0,
    completedTasks: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      fetchDashboardData();
    }
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch projects (handle paginated response)
      const projectsRes = await api.get('/projects/');
      const projectsData = projectsRes.data;
      const projects = projectsData?.results 
        ? projectsData.results 
        : (Array.isArray(projectsData) ? projectsData : []);
      
      // Fetch organizations
      const orgsRes = await api.get('/orgs/');
      const orgsData = orgsRes.data;
      const orgs = Array.isArray(orgsData) ? orgsData : [];
      
      // Fetch tasks (handle paginated response)
      const tasksRes = await api.get('/tasks/');
      const tasksData = tasksRes.data;
      const tasks = tasksData?.results 
        ? tasksData.results 
        : (Array.isArray(tasksData) ? tasksData : []);
      
      const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
      
      setStats({
        projectCount: projects.length,
        taskCount: tasks.length,
        orgCount: orgs.length,
        completedTasks: completedTasks,
      });
      
      // Get recent projects (last 5)
      setRecentProjects(projects.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const completionRate = stats.taskCount > 0 ? Math.round((stats.completedTasks / stats.taskCount) * 100) : 0;

  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back{user?.first_name ? `, ${user.first_name}` : ''}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your projects today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Projects Card */}
        <div className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderKanban className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Projects</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.projectCount}</p>
        </div>

        {/* Tasks Card */}
        <div className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Tracked</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Tasks</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.taskCount}</p>
        </div>

        {/* Organizations Card */}
        <div className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Teams</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Organizations</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.orgCount}</p>
        </div>

        {/* Completion Rate Card */}
        <div className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-pink-500 dark:hover:border-pink-500 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">{completionRate}%</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Completion Rate</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completedTasks}/{stats.taskCount}</p>
        </div>
      </div>

      {/* Recent Projects & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Projects</h2>
            <Link 
              href="/projects"
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No projects yet</p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create your first project
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/projects"
              className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">New Project</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Create a new project</p>
              </div>
            </Link>
            
            <Link
              href="/tasks"
              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">New Task</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Add a new task</p>
              </div>
            </Link>
            
            <Link
              href="/organizations"
              className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">Organizations</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Manage teams</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
