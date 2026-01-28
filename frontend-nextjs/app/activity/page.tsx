'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  User,
  FolderKanban,
  CheckSquare,
  Users,
  Clock,
  Filter,
  X,
  RefreshCw,
  Search,
  Calendar,
  ChevronDown,
  Loader2,
  Building2,
  MessageSquare,
  Bell,
  Edit,
  Plus,
  Trash2,
  Play,
  Pause,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface AuditLogEntry {
  id: number;
  action: string;
  action_display: string;
  model_type: string;
  model_type_display: string;
  object_id: number;
  object_name: string;
  changes: Record<string, any>;
  performed_by: number;
  performed_by_email: string;
  performed_by_username: string;
  performed_by_name: string;
  performed_by_initials: string;
  project: number | null;
  project_name: string | null;
  organization: number | null;
  organization_name: string | null;
  created_at: string;
  time_ago: string;
}

interface Project {
  id: number;
  name: string;
}

interface Organization {
  id: number;
  name: string;
}

interface Member {
  id: number;
  email: string;
  username: string;
  full_name: string;
}

export default function ActivityPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<AuditLogEntry[]>([]);
  
  // Filter states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterModelType, setFilterModelType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reference data
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchActivities = useCallback(async (reset = false) => {
    if (reset) {
      setPage(1);
      setIsLoading(true);
    }
    
    try {
      const params = new URLSearchParams();
      if (!reset && page > 1) {
        params.append('page', page.toString());
      }
      
      const response = await api.get(`/projects/audit-logs/?${params.toString()}`);
      const data = response.data.results || response.data || [];
      
      if (reset) {
        setActivities(data);
      } else {
        setActivities(prev => [...prev, ...data]);
      }
      
      setHasMore(response.data.next !== null);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [page]);

  const fetchReferenceData = async () => {
    try {
      const [projectsRes, orgsRes] = await Promise.all([
        api.get('/projects/'),
        api.get('/orgs/')
      ]);
      
      setProjects(projectsRes.data.results || projectsRes.data || []);
      setOrganizations(orgsRes.data.results || orgsRes.data || []);
      
      // Extract unique users from activities
      const uniqueUsers: Member[] = [];
      const seenUsers = new Set<number>();
      activities.forEach(a => {
        if (a.performed_by && !seenUsers.has(a.performed_by)) {
          seenUsers.add(a.performed_by);
          uniqueUsers.push({
            id: a.performed_by,
            email: a.performed_by_email,
            username: a.performed_by_username,
            full_name: a.performed_by_name
          });
        }
      });
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      fetchActivities(true);
      fetchReferenceData();
    }
  }, [router]);

  useEffect(() => {
    if (activities.length > 0) {
      // Update users list when activities change
      const uniqueUsers: Member[] = [];
      const seenUsers = new Set<number>();
      activities.forEach(a => {
        if (a.performed_by && !seenUsers.has(a.performed_by)) {
          seenUsers.add(a.performed_by);
          uniqueUsers.push({
            id: a.performed_by,
            email: a.performed_by_email,
            username: a.performed_by_username,
            full_name: a.performed_by_name
          });
        }
      });
      setUsers(uniqueUsers);
    }
  }, [activities]);

  // Apply filters
  useEffect(() => {
    let filtered = [...activities];
    
    // Filter by action
    if (filterAction !== 'all') {
      filtered = filtered.filter(a => a.action === filterAction);
    }
    
    // Filter by model type
    if (filterModelType !== 'all') {
      filtered = filtered.filter(a => a.model_type === filterModelType);
    }
    
    // Filter by user
    if (filterUser !== 'all') {
      filtered = filtered.filter(a => a.performed_by === parseInt(filterUser));
    }
    
    // Filter by project
    if (filterProject !== 'all') {
      filtered = filtered.filter(a => a.project === parseInt(filterProject));
    }
    
    // Filter by date range
    if (filterDateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filterDateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(a => new Date(a.created_at) >= startDate);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.object_name.toLowerCase().includes(search) ||
        a.performed_by_name.toLowerCase().includes(search) ||
        a.performed_by_username.toLowerCase().includes(search) ||
        a.action_display.toLowerCase().includes(search)
      );
    }
    
    setFilteredActivities(filtered);
  }, [activities, filterAction, filterModelType, filterUser, filterProject, filterDateRange, searchTerm]);

  const clearFilters = () => {
    setFilterAction('all');
    setFilterModelType('all');
    setFilterUser('all');
    setFilterProject('all');
    setFilterDateRange('all');
    setSearchTerm('');
  };

  const hasActiveFilters = filterAction !== 'all' || filterModelType !== 'all' || filterUser !== 'all' || filterProject !== 'all' || filterDateRange !== 'all' || searchTerm.trim() !== '';

  const getActionIcon = (action: string, modelType: string) => {
    switch (action) {
      case 'create':
        return Plus;
      case 'update':
        return Edit;
      case 'delete':
        return Trash2;
      case 'start_timer':
        return Play;
      case 'stop_timer':
        return Pause;
      case 'add_member':
        return UserPlus;
      case 'remove_member':
        return UserMinus;
      default:
        switch (modelType) {
          case 'project':
            return FolderKanban;
          case 'task':
            return CheckSquare;
          case 'organization':
            return Building2;
          case 'comment':
            return MessageSquare;
          default:
            return Activity;
        }
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'update':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'start_timer':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'stop_timer':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setPage(p => p + 1);
      fetchActivities(false);
    }
  };

  // Calculate stats
  const stats = {
    projects: activities.filter(a => a.model_type === 'project').length,
    tasks: activities.filter(a => a.model_type === 'task').length,
    collaborations: activities.filter(a => ['add_member', 'remove_member'].includes(a.action)).length,
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading activity...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-0 flex-1">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Activity Log
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track recent activities and updates across your projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchActivities(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  hasActiveFilters
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {isFilterOpen && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search activities..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Actions</option>
                  <option value="create">Created</option>
                  <option value="update">Updated</option>
                  <option value="delete">Deleted</option>
                  <option value="start_timer">Started Timer</option>
                  <option value="stop_timer">Stopped Timer</option>
                  <option value="add_member">Added Member</option>
                  <option value="remove_member">Removed Member</option>
                </select>
              </div>
              
              {/* Model Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={filterModelType}
                  onChange={(e) => setFilterModelType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  <option value="project">Projects</option>
                  <option value="task">Tasks</option>
                  <option value="organization">Organizations</option>
                  <option value="section">Sections</option>
                  <option value="comment">Comments</option>
                </select>
              </div>
              
              {/* User Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Users</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || `@${user.username}`}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Activity Timeline */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-8">
          <div className="max-w-3xl">
            {filteredActivities.length > 0 ? (
              <div className="space-y-4">
                {filteredActivities.map((activity) => {
                  const Icon = getActionIcon(activity.action, activity.model_type);
                  return (
                    <div
                      key={activity.id}
                      className="relative pl-8 pb-4 border-l-2 border-gray-200 dark:border-gray-700 last:border-l-0 last:pb-0"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-0 -translate-x-[9px]">
                        <div className={`w-4 h-4 rounded-full border-2 border-white dark:border-gray-950 ${
                          activity.action === 'create' ? 'bg-green-500' :
                          activity.action === 'update' ? 'bg-blue-500' :
                          activity.action === 'delete' ? 'bg-red-500' :
                          'bg-purple-500'
                        }`} />
                      </div>

                      {/* Activity Card */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActionColor(activity.action)}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white">
                              <span className="font-semibold">
                                {activity.performed_by_name || `@${activity.performed_by_username}`}
                              </span>
                              {' '}
                              <span className="text-gray-600 dark:text-gray-400">
                                {activity.action_display.toLowerCase()} {activity.model_type_display.toLowerCase()}
                              </span>
                              {' '}
                              <span className="font-medium text-purple-600 dark:text-purple-400">
                                "{activity.object_name}"
                              </span>
                            </p>
                            
                            {/* Context info */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                              {activity.project_name && (
                                <span className="flex items-center gap-1">
                                  <FolderKanban className="w-3 h-3" />
                                  {activity.project_name}
                                </span>
                              )}
                              {activity.organization_name && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {activity.organization_name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {activity.time_ago}
                              </span>
                            </div>
                            
                            {/* Changes */}
                            {activity.changes && Object.keys(activity.changes).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs">
                                {Object.entries(activity.changes).map(([field, change]) => (
                                  <div key={field} className="text-gray-600 dark:text-gray-400">
                                    <span className="font-medium capitalize">{field.replace('_', ' ')}</span>:{' '}
                                    {typeof change === 'object' && change !== null ? (
                                      <span>
                                        <span className="text-red-500 line-through">{String(change.old || '-')}</span>
                                        {' → '}
                                        <span className="text-green-500">{String(change.new || '-')}</span>
                                      </span>
                                    ) : (
                                      String(change)
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Load More */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Activity className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {hasActiveFilters ? 'No matching activities' : 'No activity yet'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Your recent activities will appear here'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Activity Stats */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Project Activities</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.projects}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Task Activities</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.tasks}</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Team Activities</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.collaborations}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
