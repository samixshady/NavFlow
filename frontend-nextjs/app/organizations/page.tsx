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
    } catch (error) {
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
      console.error('Error response:', err.response);
      console.error('Error request:', err.config);
      
      const errorMessage = err.response?.data?.name?.[0] 
        || err.response?.data?.detail 
        || err.response?.data?.error
        || (err.response?.data ? JSON.stringify(err.response.data) : '')
        || err.message
        || 'Failed to create organization';
      setError(errorMessage);
    }
  };

  const openOrgDetail = async (org: Organization) => {
    setSelectedOrg(org);
    setIsDetailModalOpen(true);
    setError('');
    setSuccess('');
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
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
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

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
      <div className="mb-8">
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
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
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
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Owner: {selectedOrg.owner_email}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedOrg.user_role)}`}>
                  {getRoleIcon(selectedOrg.user_role)}
                  Your role: {selectedOrg.user_role}
                </span>
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
