'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Folder,
  Users,
  CheckSquare,
  Calendar,
  Crown,
  Shield,
  User as UserIcon,
  Edit,
  Trash2,
  ArrowLeft,
  Save,
  X,
  UserPlus,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  Play,
  Pause,
  Flag,
  Zap,
  Settings,
  MoreHorizontal,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface ProjectDetails {
  id: number;
  name: string;
  description: string;
  organization: number;
  organization_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_role: 'owner' | 'admin' | 'moderator' | 'member';
  owner_email: string;
  member_count: number;
  task_count: number;
  roles: Member[];
  tasks: Task[];
  sections: TaskSection[];
}

interface Member {
  id: number;
  user_email: string;
  user_name: string;
  role: string;
  role_display: string;
  assigned_at: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: number | null;
  assigned_to_email: string | null;
  due_date: string | null;
  created_at: string;
  time_spent_minutes: number;
  time_spent_display: string;
  is_timer_running: boolean;
  section: number | null;
  section_name: string | null;
  section_color: string | null;
}

interface TaskSection {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  position: number;
  is_default: boolean;
  task_count: number;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'members'>('overview');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      fetchProjectDetails();
    }
  }, [router, projectId]);

  const fetchProjectDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/projects/${projectId}/`);
      setProject(response.data);
      setEditName(response.data.name);
      setEditDescription(response.data.description || '');
    } catch (error: any) {
      console.error('Error fetching project:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        router.push('/projects');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      await api.patch(`/projects/${projectId}/`, {
        name: editName,
        description: editDescription,
      });
      setSuccess('Project updated successfully!');
      setIsEditing(false);
      fetchProjectDetails();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== project?.name) {
      setError('Please type the project name to confirm deletion');
      return;
    }

    try {
      await api.delete(`/projects/${projectId}/`);
      router.push('/projects');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete project');
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      setError('Email is required');
      return;
    }

    try {
      await api.post(`/projects/${projectId}/add_member/`, {
        email: memberEmail,
        role: memberRole,
      });
      setSuccess('Member added successfully!');
      setShowAddMemberModal(false);
      setMemberEmail('');
      setMemberRole('member');
      fetchProjectDetails();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (email: string, name: string) => {
    if (!confirm(`Remove ${name} from this project?`)) return;

    try {
      await api.post(`/projects/${projectId}/remove_member/`, { email });
      setSuccess('Member removed successfully!');
      fetchProjectDetails();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      await api.post('/tasks/', {
        title: taskTitle,
        description: taskDescription,
        project: parseInt(projectId),
        project_id: parseInt(projectId),
        priority: taskPriority,
        due_date: taskDueDate || null,
      });
      setSuccess('Task created successfully!');
      setShowCreateTaskModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setTaskDueDate('');
      fetchProjectDetails();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create task');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'moderator':
        return <Shield className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
      case 'moderator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="w-3 h-3" />;
      case 'high':
        return <Flag className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOwner = project?.user_role === 'owner';
  const isAdmin = project?.user_role === 'admin' || isOwner;
  const canManage = isAdmin || project?.user_role === 'moderator';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading project...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Project not found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">The project you're looking for doesn't exist or you don't have access.</p>
              <Link
                href="/projects"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const completedTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
  const totalTasks = project.tasks?.length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-0 flex-1">
        {/* Success/Error Notifications */}
        {(success || error) && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl max-w-md animate-slide-in ${
            success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {success ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span>{success || error}</span>
              <button onClick={() => { setSuccess(''); setError(''); }} className="ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/projects" className="cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Projects
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{project.name}</span>
          </div>

          {/* Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Folder className="w-7 h-7 text-white" />
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-2xl font-bold bg-transparent border-b-2 border-purple-500 text-gray-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                )}
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <span>📦 {project.organization_name}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(project.user_role)}`}>
                    {getRoleIcon(project.user_role)}
                    {project.user_role}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="cursor-pointer px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="cursor-pointer px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </>
              ) : (
                <>
                  {canManage && (
                    <button
                      onClick={() => setShowCreateTaskModal(true)}
                      className="cursor-pointer px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Task
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="cursor-pointer p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="cursor-pointer p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Add a description..."
              className="mt-4 w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
          ) : project.description ? (
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-3xl">{project.description}</p>
          ) : null}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTasks}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tasks</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.member_count}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Members</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Complete</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedTasks}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Done</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
            {(['overview', 'tasks', 'members'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`cursor-pointer px-4 py-2 rounded-md font-medium text-sm transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Tasks */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-purple-500" />
                    Recent Tasks
                  </h3>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="cursor-pointer text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    View all
                  </button>
                </div>
                {project.tasks && project.tasks.length > 0 ? (
                  <div className="space-y-3">
                    {project.tasks.slice(0, 5).map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks?task=${task.id}`}
                        className="cursor-pointer block p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {getPriorityIcon(task.priority)}
                            {task.priority}
                          </span>
                        </div>
                        {task.due_date && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due {formatDate(task.due_date)}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No tasks yet</p>
                    {canManage && (
                      <button
                        onClick={() => setShowCreateTaskModal(true)}
                        className="cursor-pointer mt-3 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        Create first task
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Team Members */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    Team Members
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="cursor-pointer text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add
                    </button>
                  )}
                </div>
                {project.roles && project.roles.length > 0 ? (
                  <div className="space-y-3">
                    {project.roles.slice(0, 5).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {member.user_name?.charAt(0) || member.user_email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{member.user_name || 'User'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.user_email}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {member.role_display}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No members yet</p>
                  </div>
                )}
              </div>

              {/* Project Sections */}
              {project.sections && project.sections.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-500" />
                    Task Sections
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {project.sections.map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                        style={{ borderLeft: `4px solid ${section.color}` }}
                      >
                        <span className="font-medium text-gray-900 dark:text-white">{section.name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({section.task_count} tasks)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">All Tasks ({totalTasks})</h3>
                {canManage && (
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    className="cursor-pointer px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    New Task
                  </button>
                )}
              </div>
              {project.tasks && project.tasks.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {project.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks?task=${task.id}`}
                      className="cursor-pointer flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900 dark:text-white truncate">{task.title}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {getPriorityIcon(task.priority)}
                            {task.priority}
                          </span>
                          {task.section_name && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: task.section_color || '#6366f1' }}
                            >
                              {task.section_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(task.due_date)}
                            </span>
                          )}
                          {task.assigned_to_email && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {task.assigned_to_email}
                            </span>
                          )}
                          {task.time_spent_minutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.time_spent_display}
                            </span>
                          )}
                        </div>
                      </div>
                      {task.is_timer_running && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs animate-pulse">
                          <Play className="w-3 h-3" />
                          Running
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <CheckSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No tasks yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first task</p>
                  {canManage && (
                    <button
                      onClick={() => setShowCreateTaskModal(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Create Task
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Team Members ({project.member_count})</h3>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="cursor-pointer px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                )}
              </div>
              {project.roles && project.roles.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Member</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Joined</th>
                      {isOwner && <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {project.roles.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {member.user_name?.charAt(0) || member.user_email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{member.user_name || 'User'}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{member.user_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(member.role)}`}>
                            {getRoleIcon(member.role)}
                            {member.role_display}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(member.assigned_at)}
                        </td>
                        {isOwner && (
                          <td className="py-4 px-4 text-right">
                            {member.role !== 'owner' && (
                              <button
                                onClick={() => handleRemoveMember(member.user_email, member.user_name)}
                                className="cursor-pointer p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No members yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Add team members to collaborate</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <UserPlus className="w-5 h-5" />
                      Add Member
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Project</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                This will permanently delete <strong>{project.name}</strong> and all associated data including:
              </p>
              <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                <li>{totalTasks} tasks</li>
                <li>All member associations</li>
                <li>All sections and labels</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="font-bold">{project.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter project name"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteConfirmText !== project.name}
                className="cursor-pointer flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Member</h2>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberEmail('');
                  setMemberRole('member');
                  setError('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberEmail('');
                  setMemberRole('member');
                  setError('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                className="cursor-pointer flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Task</h2>
              <button
                onClick={() => {
                  setShowCreateTaskModal(false);
                  setTaskTitle('');
                  setTaskDescription('');
                  setTaskPriority('medium');
                  setTaskDueDate('');
                  setError('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Enter task description"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateTaskModal(false);
                  setTaskTitle('');
                  setTaskDescription('');
                  setTaskPriority('medium');
                  setTaskDueDate('');
                  setError('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="cursor-pointer flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </DashboardLayout>
  );
}
