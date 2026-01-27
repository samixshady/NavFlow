'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  User,
  FolderKanban,
  CheckSquare,
  Users,
  Clock,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface ActivityItem {
  id: number;
  type: 'project' | 'task' | 'team';
  action: string;
  user: string;
  time: string;
  icon: any;
  color: string;
}

export default function ActivityPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activities] = useState<ActivityItem[]>([
    // Mock data - replace with actual API data
    {
      id: 1,
      type: 'project',
      action: 'created a new project "Website Redesign"',
      user: 'You',
      time: '2 hours ago',
      icon: FolderKanban,
      color: 'purple',
    },
    {
      id: 2,
      type: 'task',
      action: 'completed task "Setup development environment"',
      user: 'You',
      time: '5 hours ago',
      icon: CheckSquare,
      color: 'green',
    },
    {
      id: 3,
      type: 'team',
      action: 'joined team "Design Squad"',
      user: 'You',
      time: '1 day ago',
      icon: Users,
      color: 'blue',
    },
  ]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading activity...</p>
        </div>
      </div>
    );
  }

  const getColorClasses = (color: string) => {
    const colors = {
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    };
    return colors[color as keyof typeof colors] || colors.purple;
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Activity Log
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track recent activities and updates across your projects
        </p>
      </div>

      {/* Activity Timeline */}
      <div className="max-w-3xl">
        {activities.length > 0 ? (
          <div className="space-y-6">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="relative pl-8 pb-6 border-l-2 border-gray-200 dark:border-gray-700 last:border-l-0 last:pb-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-0 -translate-x-[9px]">
                    <div className={`w-4 h-4 rounded-full border-2 border-white dark:border-gray-950 ${
                      activity.color === 'purple' ? 'bg-purple-500' :
                      activity.color === 'green' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`} />
                  </div>

                  {/* Activity Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getColorClasses(activity.color)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white">
                          <span className="font-semibold">{activity.user}</span>
                          {' '}
                          <span className="text-gray-600 dark:text-gray-400">{activity.action}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Activity className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No activity yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your recent activities will appear here
            </p>
          </div>
        )}
      </div>

      {/* Activity Stats */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Projects</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">3</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">activities this week</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Tasks</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">8</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">activities this week</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Collaborations</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">5</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">activities this week</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
