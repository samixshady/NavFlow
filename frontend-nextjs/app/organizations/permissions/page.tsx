'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  Crown,
  Users,
  UserIcon,
  Check,
  X,
  Search,
  Filter,
  ChevronDown,
  Save,
  RefreshCw,
  Building2,
  FolderPlus,
  FolderMinus,
  ListPlus,
  ListMinus,
  UserPlus,
  UserMinus,
  Eye,
  EyeOff,
  Tag,
  Timer,
  Settings,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface Organization {
  id: number;
  name: string;
  description: string;
  member_count: number;
  user_role: 'owner' | 'admin' | 'moderator' | 'member';
}

interface Member {
  user_email: string;
  user_name: string;
  role: string;
  role_display: string;
}

interface RolePermissions {
  create_project: boolean;
  delete_project: boolean;
  create_task: boolean;
  delete_task: boolean;
  assign_task: boolean;
  view_all_tasks: boolean;
  view_unassigned_tasks: boolean;
  create_label: boolean;
  delete_label: boolean;
  manage_timer: boolean;
  invite_members: boolean;
  remove_members: boolean;
  change_member_roles: boolean;
}

interface OrgPermissions {
  owner: RolePermissions;
  admin: RolePermissions;
  moderator: RolePermissions;
  member: RolePermissions;
}

// Permission categories for the UI
const PERMISSION_CATEGORIES = [
  {
    name: 'Projects',
    icon: FolderPlus,
    permissions: [
      { key: 'create_project', label: 'Create Projects', description: 'Allow creating new projects in this organization' },
      { key: 'delete_project', label: 'Delete Projects', description: 'Allow deleting projects from this organization' },
    ]
  },
  {
    name: 'Tasks',
    icon: ListPlus,
    permissions: [
      { key: 'create_task', label: 'Create Tasks', description: 'Allow creating new tasks' },
      { key: 'delete_task', label: 'Delete Tasks', description: 'Allow deleting tasks' },
      { key: 'assign_task', label: 'Assign Tasks', description: 'Allow assigning tasks to members' },
    ]
  },
  {
    name: 'Visibility',
    icon: Eye,
    permissions: [
      { key: 'view_all_tasks', label: 'View All Tasks', description: 'View all tasks in projects, not just assigned ones' },
      { key: 'view_unassigned_tasks', label: 'View Unassigned Tasks', description: 'View tasks that are not assigned to anyone' },
    ]
  },
  {
    name: 'Labels',
    icon: Tag,
    permissions: [
      { key: 'create_label', label: 'Create Labels', description: 'Allow creating custom labels/sections' },
      { key: 'delete_label', label: 'Delete Labels', description: 'Allow deleting labels/sections' },
    ]
  },
  {
    name: 'Timer',
    icon: Timer,
    permissions: [
      { key: 'manage_timer', label: 'Manage Timer', description: 'Allow starting, stopping, pausing and resetting task timers' },
    ]
  },
  {
    name: 'Members',
    icon: Users,
    permissions: [
      { key: 'invite_members', label: 'Invite Members', description: 'Allow inviting new members to the organization' },
      { key: 'remove_members', label: 'Remove Members', description: 'Allow removing members from the organization' },
      { key: 'change_member_roles', label: 'Change Member Roles', description: 'Allow changing other members\' roles' },
    ]
  },
];

export default function PermissionsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading permissions...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <PermissionsContent />
    </Suspense>
  );
}

function PermissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');
  
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [permissions, setPermissions] = useState<OrgPermissions | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'presets' | 'members'>('presets');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      router.push('/organizations');
      return;
    }
    fetchOrganization();
    fetchPermissions();
    fetchMembers();
  }, [orgId]);

  const fetchOrganization = async () => {
    try {
      const response = await api.get(`/orgs/${orgId}/`);
      console.log('Organization data:', response.data);
      console.log('User role:', response.data.user_role);
      setOrganization(response.data);
      
      // Check if user is owner
      if (response.data.user_role !== 'owner') {
        setError('Only organization owners can manage permissions');
      } else {
        setError(''); // Clear any existing error if user IS owner
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Failed to load organization');
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get(`/orgs/${orgId}/permissions/`);
      console.log('Permissions data:', response.data);
      setPermissions(response.data);
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      if (err.response?.status === 403) {
        setError('Only organization owners can view permissions');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get(`/orgs/${orgId}/members/`);
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const updatePermission = async (role: string, permission: string, value: boolean) => {
    const fieldKey = `${role}_${permission}`;
    console.log('Updating permission:', { role, permission, value, fieldKey });
    setSaving(fieldKey);
    
    try {
      const response = await api.post(`/orgs/${orgId}/permissions/update/`, {
        role: role,
        permission: permission,
        value: value,
      });
      
      console.log('Permission update response:', response.data);
      setPermissions(response.data.permissions);
      setSuccess(`Permission updated: ${permission.replace(/_/g, ' ')} for ${role}s`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      console.error('Error updating permission:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const getPermissionValue = (role: string, permission: string): boolean => {
    if (!permissions) return false;
    
    const rolePerms = permissions[role as keyof OrgPermissions] as RolePermissions | undefined;
    if (!rolePerms) return false;
    
    return rolePerms[permission as keyof RolePermissions] ?? false;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-purple-500" />;
      case 'moderator': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <UserIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'moderator': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading permissions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !permissions) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => router.push('/organizations')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Organizations
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/organizations')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organizations
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Manage Permissions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {organization?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-green-800 dark:text-green-200 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-800 dark:text-red-200 flex items-center gap-2">
            <X className="w-5 h-5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'presets'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Role Presets
            </div>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'members'
                ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members ({members.length})
            </div>
          </button>
        </div>

        {activeTab === 'presets' ? (
          /* Role Presets Tab */
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Role Headers */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="font-medium text-gray-700 dark:text-gray-300">Permission</div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Admin</span>
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Moderator</span>
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Member</span>
                </div>
              </div>
            </div>

            {/* Permission Categories */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {PERMISSION_CATEGORIES.map((category) => (
                <div key={category.name}>
                  {/* Category Header */}
                  <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-2">
                    <category.icon className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{category.name}</span>
                  </div>
                  
                  {/* Permissions */}
                  {category.permissions.map((perm) => (
                    <div
                      key={perm.key}
                      className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{perm.label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{perm.description}</p>
                      </div>
                      
                      {/* Admin Checkbox */}
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => updatePermission('admin', perm.key, !getPermissionValue('admin', perm.key))}
                          disabled={saving === `admin_${perm.key}`}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            getPermissionValue('admin', perm.key)
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          } ${saving === `admin_${perm.key}` ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {saving === `admin_${perm.key}` ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : getPermissionValue('admin', perm.key) ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <X className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      
                      {/* Moderator Checkbox */}
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => updatePermission('moderator', perm.key, !getPermissionValue('moderator', perm.key))}
                          disabled={saving === `moderator_${perm.key}`}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            getPermissionValue('moderator', perm.key)
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          } ${saving === `moderator_${perm.key}` ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {saving === `moderator_${perm.key}` ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : getPermissionValue('moderator', perm.key) ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <X className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      
                      {/* Member Checkbox */}
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => updatePermission('member', perm.key, !getPermissionValue('member', perm.key))}
                          disabled={saving === `member_${perm.key}`}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            getPermissionValue('member', perm.key)
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          } ${saving === `member_${perm.key}` ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {saving === `member_${perm.key}` ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : getPermissionValue('member', perm.key) ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <X className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Owner Note */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Owner permissions are not configurable
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Organization owners always have full access to all features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Members Tab */
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">👑 Owner</option>
                  <option value="admin">🛡️ Admin</option>
                  <option value="moderator">🔵 Moderator</option>
                  <option value="member">👤 Member</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Member Stats */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              {[
                { label: 'Owner', count: members.filter(m => m.role === 'owner').length, color: 'yellow' },
                { label: 'Admins', count: members.filter(m => m.role === 'admin').length, color: 'purple' },
                { label: 'Moderators', count: members.filter(m => m.role === 'moderator').length, color: 'blue' },
                { label: 'Members', count: members.filter(m => m.role === 'member').length, color: 'gray' },
              ].map((stat) => (
                <div key={stat.label} className={`p-3 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 rounded-xl text-center`}>
                  <p className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.count}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Members List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No members found</p>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.user_email}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {member.user_name?.charAt(0).toUpperCase() || member.user_email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.user_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.user_email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${getRoleBadgeClass(member.role)}`}>
                        {getRoleIcon(member.role)}
                        {member.role_display}
                      </span>
                      
                      {member.role === 'owner' ? (
                        <div className="w-10 h-10 flex items-center justify-center" title="Owner has all permissions">
                          <Crown className="w-5 h-5 text-yellow-500" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center" title={`Permissions based on ${member.role} role preset`}>
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Info Note */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Role-based permissions
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Each member's permissions are determined by their role. Configure role presets in the "Role Presets" tab to set what each role can do.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
