'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Users,
  Building2,
  Search,
  X,
  Trash2,
  UserPlus,
  Crown,
  Shield,
  User as UserIcon,
  CheckCircle,
  Mail,
  Clock,
  ChevronDown,
  ChevronUp,
  Settings,
  Check,
  FolderPlus,
  ListPlus,
  Eye,
  Tag,
  Timer,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface Organization {
  id: number;
  name: string;
  description: string;
  member_count: number;
  user_role: 'owner' | 'admin' | 'moderator' | 'member';
  owner_email: string;
  created_at: string;
}

interface Member {
  user_email: string;
  user_name: string;
  role: string;
  role_display: string;
}

interface Invitation {
  id: number;
  organization: number;
  organization_name: string;
  invited_user_email: string;
  invited_user_username: string;
  invited_by_email: string;
  role: string;
  role_display: string;
  status: string;
  status_display: string;
  created_at: string;
}

interface OrgPermissions {
  id: number;
  organization: number;
  admin_create_project: boolean;
  admin_delete_project: boolean;
  admin_create_task: boolean;
  admin_delete_task: boolean;
  admin_assign_task: boolean;
  admin_view_all_tasks: boolean;
  admin_view_unassigned_tasks: boolean;
  admin_create_label: boolean;
  admin_delete_label: boolean;
  admin_manage_timer: boolean;
  admin_invite_members: boolean;
  admin_remove_members: boolean;
  admin_change_member_roles: boolean;
  mod_create_project: boolean;
  mod_delete_project: boolean;
  mod_create_task: boolean;
  mod_delete_task: boolean;
  mod_assign_task: boolean;
  mod_view_all_tasks: boolean;
  mod_view_unassigned_tasks: boolean;
  mod_create_label: boolean;
  mod_delete_label: boolean;
  mod_manage_timer: boolean;
  mod_invite_members: boolean;
  mod_remove_members: boolean;
  mod_change_member_roles: boolean;
  member_create_project: boolean;
  member_delete_project: boolean;
  member_create_task: boolean;
  member_delete_task: boolean;
  member_assign_task: boolean;
  member_view_all_tasks: boolean;
  member_view_unassigned_tasks: boolean;
  member_create_label: boolean;
  member_delete_label: boolean;
  member_manage_timer: boolean;
  member_invite_members: boolean;
  member_remove_members: boolean;
  member_change_member_roles: boolean;
}

// Permission configuration for the UI
const PERMISSION_CONFIG = [
  { 
    category: 'Projects', 
    icon: FolderPlus,
    color: 'from-blue-500 to-cyan-500',
    permissions: [
      { key: 'create_project', label: 'Create Projects', desc: 'Create new projects' },
      { key: 'delete_project', label: 'Delete Projects', desc: 'Remove projects' },
    ]
  },
  { 
    category: 'Tasks', 
    icon: ListPlus,
    color: 'from-green-500 to-emerald-500',
    permissions: [
      { key: 'create_task', label: 'Create Tasks', desc: 'Add new tasks' },
      { key: 'delete_task', label: 'Delete Tasks', desc: 'Remove tasks' },
      { key: 'assign_task', label: 'Assign Tasks', desc: 'Assign to members' },
    ]
  },
  { 
    category: 'Visibility', 
    icon: Eye,
    color: 'from-purple-500 to-pink-500',
    permissions: [
      { key: 'view_all_tasks', label: 'View All Tasks', desc: 'See all project tasks' },
      { key: 'view_unassigned_tasks', label: 'View Unassigned', desc: 'See unassigned tasks' },
    ]
  },
  { 
    category: 'Labels', 
    icon: Tag,
    color: 'from-orange-500 to-amber-500',
    permissions: [
      { key: 'create_label', label: 'Create Labels', desc: 'Create sections/labels' },
      { key: 'delete_label', label: 'Delete Labels', desc: 'Remove labels' },
    ]
  },
  { 
    category: 'Timer', 
    icon: Timer,
    color: 'from-red-500 to-rose-500',
    permissions: [
      { key: 'manage_timer', label: 'Manage Timer', desc: 'Start/Stop/Pause timers' },
    ]
  },
  { 
    category: 'Members', 
    icon: Users,
    color: 'from-indigo-500 to-violet-500',
    permissions: [
      { key: 'invite_members', label: 'Invite Members', desc: 'Invite new members' },
      { key: 'remove_members', label: 'Remove Members', desc: 'Kick members out' },
      { key: 'change_member_roles', label: 'Change Roles', desc: 'Modify member roles' },
    ]
  },
];

export default function OrganizationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [orgInvitations, setOrgInvitations] = useState<Invitation[]>([]);
  
  // Permission states
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissions, setPermissions] = useState<OrgPermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermission, setSavingPermission] = useState<string | null>(null);
  
  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [memberRole, setMemberRole] = useState('member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      fetchOrganizations();
      fetchPendingInvitations();
    }
  }, [router]);

  const fetchPendingInvitations = async () => {
    try {
      const response = await api.get('/orgs/invitations/');
      setPendingInvitations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const fetchPermissions = async (orgId: number) => {
    setLoadingPermissions(true);
    try {
      const response = await api.get(`/orgs/${orgId}/permissions/`);
      setPermissions(response.data);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      if (error.response?.status === 403) {
        setPermissions(null);
      }
    } finally {
      setLoadingPermissions(false);
    }
  };

  const updatePermission = async (role: string, permission: string, value: boolean) => {
    if (!selectedOrg) return;
    
    const fieldKey = `${role}_${permission}`;
    setSavingPermission(fieldKey);
    
    try {
      const response = await api.post(`/orgs/${selectedOrg.id}/permissions/update/`, {
        role: role,
        permission: permission,
        value: value,
      });
      setPermissions(response.data.permissions);
    } catch (error: any) {
      console.error('Error updating permission:', error);
      setError(error.response?.data?.detail || 'Failed to update permission');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingPermission(null);
    }
  };

  const getPermissionValue = (role: string, permission: string): boolean => {
    if (!permissions) return false;
    const prefixMap: Record<string, string> = {
      'admin': 'admin_',
      'moderator': 'mod_',
      'member': 'member_',
    };
    const fieldName = `${prefixMap[role]}${permission}` as keyof OrgPermissions;
    return permissions[fieldName] as boolean;
  };

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching organizations from API...');
      const response = await api.get('/orgs/');
      console.log('Organizations API response:', response.data);
      console.log('Response type:', typeof response.data, 'Is Array:', Array.isArray(response.data));
      console.log('Number of organizations:', Array.isArray(response.data) ? response.data.length : 0);
      // Show all organizations the user belongs to (created as owner or invited to)
      setOrganizations(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      console.log('Creating organization with data:', { name: orgName, description: orgDescription });
      console.log('User creating org:', user);
      
      const response = await api.post('/orgs/', {
        name: orgName,
        description: orgDescription,
      });
      
      console.log('Organization created successfully:', response.data);
      console.log('Created org ID:', response.data.id);
      
      // Close modal first
      setIsCreateModalOpen(false);
      
      // Show success toast
      setSuccess(`Organization "${orgName}" created successfully!`);
      setShowSuccessToast(true);
      
      // Reset form
      setOrgName('');
      setOrgDescription('');
      
      // Fetch updated list
      await fetchOrganizations();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessToast(false);
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      console.error('Error creating organization:', err);
      console.error('Error response data:', err.response?.data);
      
      let errorMessage = 'Failed to create organization';
      const data = err.response?.data;
      
      if (data) {
        if (data.name) {
          errorMessage = Array.isArray(data.name) ? data.name[0] : data.name;
        } else if (data.description) {
          errorMessage = Array.isArray(data.description) ? data.description[0] : data.description;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object') {
          // Get the first error from any field
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            errorMessage = Array.isArray(val) ? val[0] : String(val);
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const openOrgDetail = async (org: Organization) => {
    console.log('Opening org detail:', org);
    console.log('User role:', org.user_role);
    console.log('Is owner check:', org.user_role === 'owner');
    setSelectedOrg(org);
    setIsDetailModalOpen(true);
    setError('');
    setSuccess('');
    setShowPermissions(false);
    setPermissions(null);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        api.get(`/orgs/${org.id}/members/`),
        (org.user_role === 'owner' || org.user_role === 'admin') 
          ? api.get(`/orgs/${org.id}/invitations/`)
          : Promise.resolve({ data: [] })
      ]);
      setMembers(membersRes.data);
      setOrgInvitations(invitationsRes.data);
    } catch (error) {
      console.error('Error fetching organization details:', error);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedOrg || !inviteUsername.trim()) {
      setError('Email or username is required');
      return;
    }

    try {
      await api.post(`/orgs/${selectedOrg.id}/invite/`, {
        identifier: inviteUsername,
        role: inviteRole,
      });
      setSuccess(`Invitation sent to ${inviteUsername}!`);
      setInviteUsername('');
      setInviteRole('member');
      // Refresh invitations
      const response = await api.get(`/orgs/${selectedOrg.id}/invitations/`);
      setOrgInvitations(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.identifier?.[0]
        || (typeof err.response?.data === 'object' ? JSON.stringify(err.response?.data) : '')
        || 'Failed to send invitation';
      setError(errorMessage);
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await api.post(`/orgs/invitations/${invitationId}/accept/`);
      setSuccess('Invitation accepted! You are now a member.');
      fetchOrganizations();
      fetchPendingInvitations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    try {
      await api.post(`/orgs/invitations/${invitationId}/decline/`);
      setSuccess('Invitation declined.');
      fetchPendingInvitations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to decline invitation');
    }
  };

  const handleUpdateRole = async (email: string, newRole: string) => {
    if (!selectedOrg) return;
    
    try {
      await api.post(`/orgs/${selectedOrg.id}/update_role/`, {
        user_email: email,
        role: newRole,
      });
      setSuccess('Role updated successfully!');
      const response = await api.get(`/orgs/${selectedOrg.id}/members/`);
      setMembers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedOrg || !memberEmail.trim()) {
      setError('Email is required');
      return;
    }

    try {
      await api.post(`/orgs/${selectedOrg.id}/add_member/`, {
        email: memberEmail,
        role: memberRole,
      });
      setSuccess('Member added successfully!');
      setMemberEmail('');
      setMemberRole('member');
      const response = await api.get(`/orgs/${selectedOrg.id}/members/`);
      setMembers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!selectedOrg || !confirm(`Remove ${email} from organization?`)) return;

    try {
      await api.post(`/orgs/${selectedOrg.id}/remove_member/`, { email });
      setSuccess('Member removed successfully!');
      const response = await api.get(`/orgs/${selectedOrg.id}/members/`);
      setMembers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'moderator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Success Toast */}
      {showSuccessToast && success && (
        <div className="fixed top-4 right-4 z-[100] animate-fade-in">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 max-w-md">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">{success}</p>
              <p className="text-sm text-green-100">Your organization has been saved to the database.</p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="ml-4 text-white hover:text-green-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Organizations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage organizations you own or are a member of
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchOrganizations}
            className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            title="Refresh organizations list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            New Organization
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex-shrink-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search your organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all"
          />
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Pending Invitations ({pendingInvitations.length})
          </h3>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {invitation.organization_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Invited by {invitation.invited_by_email} as {invitation.role_display}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Organizations Grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
      {filteredOrganizations.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No organizations yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first organization to get started
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => (
            <div
              key={org.id}
              onClick={() => router.push(`/organizations/${org.id}`)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg dark:hover:shadow-purple-500/10 hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(org.user_role)}`}>
                  {getRoleIcon(org.user_role)}
                  {org.user_role}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {org.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                {org.description || 'No description'}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{org.member_count} members</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      </div>

      {/* Create Organization Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Organization</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setError('');
                  setSuccess('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Enter organization name"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder="Enter organization description"
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organization Detail Modal */}
      {isDetailModalOpen && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-800 pb-2 -mt-2 pt-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedOrg.name}</h2>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setError('');
                  setSuccess('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {(error || success) && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                error 
                  ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                  : 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
              }`}>
                {error || success}
              </div>
            )}

            {/* Organization Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{selectedOrg.description || 'No description'}</p>
              {/* Debug: showing raw user_role */}
              <p className="text-xs text-red-500 mb-2 font-bold">DEBUG: user_role = "{selectedOrg.user_role}" | type = {typeof selectedOrg.user_role} | is owner: {String(selectedOrg.user_role === 'owner')}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Owner: {selectedOrg.owner_email}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedOrg.user_role)}`}>
                  {getRoleIcon(selectedOrg.user_role)}
                  Your role: {selectedOrg.user_role}
                </span>
              </div>
            </div>

            {/* Manage Permissions Button - Always visible for testing */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  router.push(`/organizations/permissions?org=${selectedOrg.id}`);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                <Shield className="w-5 h-5" />
                Manage Permissions (Full Page)
              </button>
            </div>

            {/* Permission Settings - Always visible for testing */}
            <div className="mb-6">
              <button
                onClick={() => {
                  if (!showPermissions && !permissions) {
                    fetchPermissions(selectedOrg.id);
                  }
                  setShowPermissions(!showPermissions);
                }}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all group"
              >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/20">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Permission Settings</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Configure what each role can do</p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg transition-transform duration-300 ${showPermissions ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-purple-500" />
                  </div>
                </button>
                
                {/* Expandable Permissions Panel */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showPermissions ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  {loadingPermissions ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
                    </div>
                  ) : permissions ? (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg">
                      {/* Role Headers */}
                      <div className="grid grid-cols-4 gap-2 p-4 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Permission</div>
                        <div className="text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-900/40 rounded-full">
                            <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Admin</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Mod</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <UserIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">User</span>
                          </div>
                        </div>
                      </div>

                      {/* Permission Categories */}
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {PERMISSION_CONFIG.map((category, catIndex) => (
                          <div key={category.category} className="animate-in fade-in slide-in-from-left duration-300" style={{ animationDelay: `${catIndex * 50}ms` }}>
                            {/* Category Header */}
                            <div className={`px-4 py-2 bg-gradient-to-r ${category.color} bg-opacity-10`}>
                              <div className="flex items-center gap-2">
                                <category.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">{category.category}</span>
                              </div>
                            </div>
                            
                            {/* Permissions */}
                            {category.permissions.map((perm, permIndex) => (
                              <div
                                key={perm.key}
                                className="grid grid-cols-4 gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors animate-in fade-in duration-200"
                                style={{ animationDelay: `${(catIndex * 50) + (permIndex * 30)}ms` }}
                              >
                                <div className="flex flex-col justify-center">
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{perm.label}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{perm.desc}</span>
                                </div>
                                
                                {/* Admin Toggle */}
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={() => updatePermission('admin', perm.key, !getPermissionValue('admin', perm.key))}
                                    disabled={savingPermission === `admin_${perm.key}`}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                      getPermissionValue('admin', perm.key)
                                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    } ${savingPermission === `admin_${perm.key}` ? 'animate-pulse' : ''}`}
                                  >
                                    {savingPermission === `admin_${perm.key}` ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : getPermissionValue('admin', perm.key) ? (
                                      <Check className="w-5 h-5" />
                                    ) : (
                                      <X className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>
                                
                                {/* Mod Toggle */}
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={() => updatePermission('moderator', perm.key, !getPermissionValue('moderator', perm.key))}
                                    disabled={savingPermission === `mod_${perm.key}`}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                      getPermissionValue('moderator', perm.key)
                                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    } ${savingPermission === `mod_${perm.key}` ? 'animate-pulse' : ''}`}
                                  >
                                    {savingPermission === `mod_${perm.key}` ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : getPermissionValue('moderator', perm.key) ? (
                                      <Check className="w-5 h-5" />
                                    ) : (
                                      <X className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>
                                
                                {/* Member Toggle */}
                                <div className="flex items-center justify-center">
                                  <button
                                    onClick={() => updatePermission('member', perm.key, !getPermissionValue('member', perm.key))}
                                    disabled={savingPermission === `member_${perm.key}`}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                      getPermissionValue('member', perm.key)
                                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    } ${savingPermission === `member_${perm.key}` ? 'animate-pulse' : ''}`}
                                  >
                                    {savingPermission === `member_${perm.key}` ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
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

                      {/* Owner Info */}
                      <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-t border-yellow-200 dark:border-yellow-700/50">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-yellow-500" />
                          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                            Owners always have full permissions
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Unable to load permissions
                    </div>
                  )}
                </div>
              </div>

            {/* Add Member (only for owners and admins) */}
            {(selectedOrg.user_role === 'owner' || selectedOrg.user_role === 'admin') && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Invite Member
                </h3>
                <form onSubmit={handleInviteMember} className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="Enter email or username"
                      className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </button>
                  </div>
                </form>

                {/* Pending Org Invitations */}
                {orgInvitations.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Pending Invitations
                    </p>
                    <div className="space-y-2">
                      {orgInvitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {inv.invited_user_username} ({inv.role_display})
                          </span>
                          <span className="text-xs text-gray-500">Pending</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Members ({members.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.user_email}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{member.user_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.user_email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Role Badge or Dropdown for owner */}
                      {selectedOrg.user_role === 'owner' && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.user_email, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${getRoleColor(member.role)}`}
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {member.role_display}
                        </span>
                      )}
                      {selectedOrg.user_role === 'owner' && member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.user_email)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
