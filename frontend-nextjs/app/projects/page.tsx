'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Folder,
  Users,
  Search,
  X,
  Trash2,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  User as UserIcon,
  Edit,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface Project {
  id: number;
  name: string;
  description: string;
  organization_id: number;
  organization_name: string;
  member_count: number;
  task_count: number;
  user_role: 'owner' | 'admin' | 'moderator' | 'member';
  owner_email: string;
  status: string;
  created_at: string;
}

interface Organization {
  id: number;
  name: string;
}

interface Member {
  user_email: string;
  user_name: string;
  role: string;
  role_display: string;
}

interface OrgMember {
  user_email: string;
  user_name: string;
  role: string;
  role_display: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Member assignment states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRemoveMembersModalOpen, setIsRemoveMembersModalOpen] = useState(false);
  const [isManageRolesModalOpen, setIsManageRolesModalOpen] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedMemberEmail, setSelectedMemberEmail] = useState('');
  const [assignMemberRole, setAssignMemberRole] = useState('member');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manageRolesSearchTerm, setManageRolesSearchTerm] = useState('');
  
  // Form states
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      fetchProjects();
      fetchOrganizations();
    }
  }, [router]);

  const fetchOrganizations = async () => {
    try {
      const response = await api.get('/orgs/');
      setOrganizations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/projects/');
      // Handle paginated response (DRF returns {count, results} for paginated data)
      const data = response.data;
      if (data && data.results) {
        setProjects(data.results);
      } else {
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!projectName.trim() || !selectedOrgId) {
      setError('Project name and organization are required');
      return;
    }

    try {
      await api.post('/projects/', {
        name: projectName,
        description: projectDescription,
        organization_id: parseInt(selectedOrgId),
      });
      setSuccess('Project created successfully!');
      setProjectName('');
      setProjectDescription('');
      setSelectedOrgId('');
      setIsCreateModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] || 'Failed to create project');
    }
  };

  const openProjectDetail = async (project: Project) => {
    setSelectedProject(project);
    setIsDetailModalOpen(true);
    try {
      const response = await api.get(`/projects/${project.id}/members/`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const openAssignMemberModal = async () => {
    if (!selectedProject) {
      setError('No project selected');
      return;
    }
    
    setIsAssignModalOpen(true);
    setMemberSearchTerm('');
    setSelectedMemberEmail('');
    setAssignMemberRole('member');
    setShowSuggestions(false);
    setError('');
    
    try {
      // Fetch organization members
      console.log('Fetching members for organization:', selectedProject.organization_id);
      const response = await api.get(`/orgs/${selectedProject.organization_id}/members/`);
      console.log('Organization members response:', response.data);
      
      // Filter out members already in the project
      const currentMemberEmails = members.map(m => m.user_email);
      const availableMembers = response.data.filter((m: OrgMember) => !currentMemberEmails.includes(m.user_email));
      
      console.log('Available members after filtering:', availableMembers);
      setOrgMembers(availableMembers);
    } catch (error: any) {
      console.error('Error fetching organization members:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      setError(error.response?.data?.detail || 'Failed to load organization members');
      setOrgMembers([]);
    }
  };

  const handleAssignMember = async () => {
    if (!selectedProject || !selectedMemberEmail) {
      setError('Please select a member');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.post(`/projects/${selectedProject.id}/add_member/`, {
        identifier: selectedMemberEmail,
        role: assignMemberRole,
      });
      setSuccess('Member assigned successfully!');
      setIsAssignModalOpen(false);
      setMemberSearchTerm('');
      setSelectedMemberEmail('');
      
      // Refresh members list
      const response = await api.get(`/projects/${selectedProject.id}/members/`);
      setMembers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.identifier?.[0] || 'Failed to assign member');
    }
  };

  const filteredOrgMembers = orgMembers.filter(member =>
    member.user_name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    member.user_email.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  const handleRemoveMember = async (email: string) => {
    if (!selectedProject) return;

    setError('');
    setSuccess('');

    try {
      await api.post(`/projects/${selectedProject.id}/remove_member/`, { email });
      setSuccess(`Member removed from project successfully!`);
      
      // Refresh members list
      const response = await api.get(`/projects/${selectedProject.id}/members/`);
      setMembers(response.data);
      
      // Also refresh org members list if assign modal is open
      if (isAssignModalOpen) {
        const orgResponse = await api.get(`/orgs/${selectedProject.organization_id}/members/`);
        const currentMemberEmails = response.data.map((m: Member) => m.user_email);
        const availableMembers = orgResponse.data.filter((m: OrgMember) => !currentMemberEmails.includes(m.user_email));
        setOrgMembers(availableMembers);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (email: string, newRole: string) => {
    if (!selectedProject) return;

    setError('');
    setSuccess('');

    try {
      await api.post(`/projects/${selectedProject.id}/update-member-role/`, { 
        email: email,
        role: newRole 
      });
      setSuccess(`Member role updated successfully!`);
      
      // Refresh members list
      const response = await api.get(`/projects/${selectedProject.id}/members/`);
      setMembers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update member role');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || !confirm(`Are you sure you want to delete "${selectedProject.name}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/projects/${selectedProject.id}/`);
      setSuccess('Project deleted successfully!');
      setIsDetailModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete project');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and organize your projects
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex-shrink-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Folder className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No projects yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get started by creating your first project
          </p>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => openProjectDetail(project)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg dark:hover:shadow-purple-500/10 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Folder className="w-6 h-6 text-white" />
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(project.user_role)}`}>
                  {getRoleIcon(project.user_role)}
                  {project.user_role}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                📦 {project.organization_name}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{project.member_count} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Folder className="w-4 h-4" />
                  <span>{project.task_count} tasks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  Create New Project
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-400 mt-2 ml-14">Add a new project to your organization</p>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setError('');
                  setSuccess('');
                }}
                className="p-3 hover:bg-white/50 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl text-red-800 dark:text-red-200 animate-in fade-in slide-in-from-top-1 duration-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-6">
                {/* Organization Selection */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-500" />
                    Organization *
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
                    required
                  >
                    <option value="">Select an organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project Name */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-purple-500" />
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
                    required
                  />
                </div>

                {/* Project Description */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-purple-500" />
                    Description
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Enter project description"
                    rows={5}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none text-base"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setError('');
                  setSuccess('');
                }}
                className="flex-1 px-6 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-semibold text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleCreateProject}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl text-base"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {isDetailModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProject.name}</h2>
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

            {/* Project Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Organization:</strong> {selectedProject.organization_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {selectedProject.description || 'No description'}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Owner: {selectedProject.owner_email}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedProject.user_role)}`}>
                  {getRoleIcon(selectedProject.user_role)}
                  Your role: {selectedProject.user_role}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                <span>{selectedProject.member_count} members</span>
                <span>{selectedProject.task_count} tasks</span>
                <span>Status: {selectedProject.status}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {(selectedProject.user_role === 'owner' || selectedProject.user_role === 'admin') && (
                <>
                  <button
                    onClick={openAssignMemberModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    <UserPlus className="w-5 h-5" />
                    Assign Members
                  </button>
                  <button
                    onClick={() => setIsManageRolesModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    <Shield className="w-5 h-5" />
                    Manage Roles
                  </button>
                  <button
                    onClick={() => setIsRemoveMembersModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    <UserMinus className="w-5 h-5" />
                    Remove Members
                  </button>
                </>
              )}
            </div>

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
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                      {getRoleIcon(member.role)}
                      {member.role_display}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Member Modal */}
      {isAssignModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Assign Members</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Add organization members to {selectedProject.name}</p>
              </div>
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
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

            {/* Search Input with Autocomplete */}
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Members
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={memberSearchTerm}
                  onChange={(e) => {
                    setMemberSearchTerm(e.target.value);
                    setShowSuggestions(true);
                    setSelectedMemberEmail('');
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && memberSearchTerm && filteredOrgMembers.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {filteredOrgMembers.map((member, index) => (
                    <button
                      key={member.user_email}
                      onClick={() => {
                        setSelectedMemberEmail(member.user_email);
                        setMemberSearchTerm(`${member.user_name} (${member.user_email})`);
                        setShowSuggestions(false);
                      }}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all duration-200 ${
                        index > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''
                      } ${
                        index === 0 ? 'rounded-t-xl' : ''
                      } ${
                        index === filteredOrgMembers.length - 1 ? 'rounded-b-xl' : ''
                      } group`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                        {member.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {member.user_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.user_email}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                        {getRoleIcon(member.role)}
                        {member.role_display}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results Message */}
              {showSuggestions && memberSearchTerm && filteredOrgMembers.length === 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 text-center animate-in fade-in slide-in-from-top-2 duration-200">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-400 opacity-50" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {orgMembers.length === 0 ? 'All organization members are already in this project' : 'No members found matching your search'}
                  </p>
                </div>
              )}
            </div>

            {/* Selected Member Preview */}
            {selectedMemberEmail && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl animate-in fade-in slide-in-from-top-1 duration-300">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Member:</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {orgMembers.find(m => m.user_email === selectedMemberEmail)?.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {orgMembers.find(m => m.user_email === selectedMemberEmail)?.user_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedMemberEmail}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Role
              </label>
              <select
                value={assignMemberRole}
                onChange={(e) => setAssignMemberRole(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="member">Member</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setError('');
                  setSuccess('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignMember}
                disabled={!selectedMemberEmail}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl ${
                  selectedMemberEmail
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                Assign Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Members Modal */}
      {isRemoveMembersModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Remove Members</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Remove members from {selectedProject.name}</p>
              </div>
              <button
                onClick={() => {
                  setIsRemoveMembersModalOpen(false);
                  setError('');
                  setSuccess('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-800 dark:text-green-200 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                {success}
              </div>
            )}

            {/* Members List */}
            <div className="space-y-3">
              {members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className="text-gray-600 dark:text-gray-400">No members in this project yet</p>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.user_email}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                        {member.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{member.user_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.user_email}</p>
                      </div>
                      
                      {/* Role Dropdown or Badge */}
                      {(selectedProject.user_role === 'owner' || selectedProject.user_role === 'admin') && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMemberRole(member.user_email, e.target.value)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${getRoleColor(member.role)}`}
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${getRoleColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {member.role_display}
                        </span>
                      )}
                    </div>
                    
                    {member.role !== 'owner' ? (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.user_name} (${member.user_email}) from this project?`)) {
                            handleRemoveMember(member.user_email);
                          }
                        }}
                        className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                      >
                        <UserMinus className="w-4 h-4" />
                        Remove
                      </button>
                    ) : (
                      <div className="ml-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium rounded-lg cursor-not-allowed">
                        Owner
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setIsRemoveMembersModalOpen(false);
                  setError('');
                  setSuccess('');
                }}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Roles Modal */}
      {isManageRolesModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-5xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  Manage Roles
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-400 mt-2 ml-14">Change member roles in {selectedProject.name}</p>
              </div>
              <button
                onClick={() => {
                  setIsManageRolesModalOpen(false);
                  setManageRolesSearchTerm('');
                  setError('');
                  setSuccess('');
                }}
                className="p-3 hover:bg-white/50 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl text-red-800 dark:text-red-200 animate-in fade-in slide-in-from-top-1 duration-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 rounded-xl text-green-800 dark:text-green-200 animate-in fade-in slide-in-from-top-1 duration-200">
                  {success}
                </div>
              )}

              {/* Info Banner */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <span className="text-xl">💡</span>
                  <span>
                    <strong>Role Permissions:</strong> <span className="font-semibold text-purple-600 dark:text-purple-400">Member</span> (basic access), 
                    <span className="font-semibold text-blue-600 dark:text-blue-400"> Moderator</span> (manage tasks), 
                    <span className="font-semibold text-amber-600 dark:text-amber-400"> Admin</span> (full management)
                  </span>
                </p>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={manageRolesSearchTerm}
                    onChange={(e) => setManageRolesSearchTerm(e.target.value)}
                    placeholder="Search members by name or email..."
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                  />
                  {manageRolesSearchTerm && (
                    <button
                      onClick={() => setManageRolesSearchTerm('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-4">
                {members.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-20 h-20 mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-lg text-gray-600 dark:text-gray-400">No members in this project yet</p>
                  </div>
                ) : (
                  members
                    .filter(member => 
                      !manageRolesSearchTerm || 
                      member.user_name.toLowerCase().includes(manageRolesSearchTerm.toLowerCase()) ||
                      member.user_email.toLowerCase().includes(manageRolesSearchTerm.toLowerCase())
                    )
                    .map((member) => (
                      <div
                        key={member.user_email}
                        className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center gap-5 flex-1">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {member.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-lg text-gray-900 dark:text-white">{member.user_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{member.user_email}</p>
                          </div>
                        </div>
                        
                        {/* Role Dropdown or Badge */}
                        <div className="ml-6">
                          {(selectedProject.user_role === 'owner' || selectedProject.user_role === 'admin') && member.role !== 'owner' ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateMemberRole(member.user_email, e.target.value)}
                              className={`px-5 py-3 rounded-xl text-base font-semibold border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md ${getRoleColor(member.role)}`}
                            >
                              <option value="member">Member</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-base font-semibold shadow-sm ${getRoleColor(member.role)}`}>
                              {getRoleIcon(member.role)}
                              {member.role_display}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => {
                  setIsManageRolesModalOpen(false);
                  setManageRolesSearchTerm('');
                  setError('');
                  setSuccess('');
                }}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl text-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
