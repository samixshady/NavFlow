'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Bell,
  Shield,
  Moon,
  Sun,
  Save,
  Eye,
  EyeOff,
  Bug,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DebugAPI from '@/components/DebugAPI';
import { useTheme } from '@/lib/theme-context';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance' | 'debug'>('profile');
  
  // Account deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }
    
    setDeleteError('');
    setIsDeleting(true);
    
    try {
      await api.post('/accounts/delete-account/', {
        password: deletePassword,
        confirm_text: deleteConfirmText
      });
      
      // Log out and redirect
      logout();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      router.push('/');
    } catch (error: any) {
      setDeleteError(error.response?.data?.password?.[0] || error.response?.data?.confirm_text?.[0] || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center">
          <div className="w-12 md:w-16 h-12 md:h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: theme === 'dark' ? Moon : Sun },
    { id: 'debug', name: 'Debug', icon: Bug },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-0 flex-1 px-4 md:px-0">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs - Mobile: Stack vertically, Desktop: Horizontal */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 -mx-4 md:mx-0 px-4 md:px-0">
        <div className="flex md:flex-row flex-wrap md:gap-2 gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 md:border-b-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`cursor-pointer flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 rounded-t-lg md:rounded-lg whitespace-nowrap text-xs md:text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 dark:bg-purple-600 text-white md:bg-white dark:md:bg-gray-800 md:text-purple-600 dark:md:text-purple-400 md:border-b-2 md:border-purple-600 dark:md:border-purple-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 md:w-5 h-4 md:h-5" />
                <span className="font-medium hidden md:inline">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
      <div className="w-full md:max-w-2xl pb-8">
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 space-y-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-gray-400" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-3 text-sm md:text-base bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.first_name || ''}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.last_name || ''}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button className="cursor-pointer w-full md:w-auto flex items-center justify-center md:justify-start gap-2 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-[#bb69faa1] hover:bg-[#bb69fa] text-white font-medium rounded-lg transition-colors">
                <Save className="w-4 md:w-5 h-4 md:h-5" />
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 space-y-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 md:w-5 h-4 md:h-5" /> : <Eye className="w-4 md:w-5 h-4 md:h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button className="cursor-pointer w-full md:w-auto flex items-center justify-center md:justify-start gap-2 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-[#bb69faa1] hover:bg-[#bb69fa] text-white font-medium rounded-lg transition-colors">
                <Shield className="w-4 md:w-5 h-4 md:h-5" />
                Update Password
              </button>
            </div>
            
            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-base md:text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
              <div className="p-3 md:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
                  <div>
                    <h4 className="font-medium text-sm md:text-base text-red-900 dark:text-red-200">Delete Account</h4>
                    <p className="text-xs md:text-sm text-red-700 dark:text-red-300 mt-1">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="cursor-pointer px-3 md:px-4 py-2 md:py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm md:text-base rounded-lg transition-colors flex items-center justify-center md:justify-start gap-2 flex-shrink-0 w-full md:w-auto"
                  >
                    <Trash2 className="w-4 md:w-4 h-4 md:h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 space-y-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
            
            <div className="space-y-3 md:space-y-4">
              {['Email notifications', 'Push notifications', 'Task reminders', 'Project updates'].map((item) => (
                <label key={item} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <span className="text-sm md:text-base text-gray-900 dark:text-white">{item}</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 md:w-5 h-4 md:h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              ))}
            </div>

            <button className="cursor-pointer w-full md:w-auto flex items-center justify-center md:justify-start gap-2 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-[#bb69faa1] hover:bg-[#bb69fa] text-white font-medium rounded-lg transition-colors">
              <Save className="w-4 md:w-5 h-4 md:h-5" />
              Save Preferences
            </button>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 space-y-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Appearance Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Theme Mode
                </label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button
                    onClick={() => theme === 'dark' && toggleTheme()}
                    className={`cursor-pointer p-4 md:p-6 rounded-xl border-2 transition-all ${
                      theme === 'light'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Sun className="w-6 md:w-8 h-6 md:h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-xs md:text-sm text-gray-900 dark:text-white font-medium">Light Mode</p>
                  </button>
                  <button
                    onClick={() => theme === 'light' && toggleTheme()}
                    className={`cursor-pointer p-4 md:p-6 rounded-xl border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Moon className="w-6 md:w-8 h-6 md:h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-xs md:text-sm text-gray-900 dark:text-white font-medium">Dark Mode</p>
                  </button>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                  💡 <strong>Tip:</strong> Theme preference is automatically saved and will be remembered on your next visit.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'debug' && (
          <DebugAPI />
        )}
      </div>
      </div>
      
      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-3 mb-6">
              <div className="w-10 md:w-12 h-10 md:h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex flex-shrink-0 items-center justify-center">
                <AlertTriangle className="w-5 md:w-6 h-5 md:h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Delete Account</h2>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">This action is irreversible</p>
              </div>
            </div>
            
            <div className="mb-6 p-3 md:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs md:text-sm text-red-700 dark:text-red-300">
                <strong>Warning:</strong> Deleting your account will:
              </p>
              <ul className="text-xs md:text-sm text-red-600 dark:text-red-400 mt-2 space-y-1 list-disc list-inside">
                <li>Remove your personal information</li>
                <li>Transfer ownership of your organizations</li>
                <li>Preserve your task assignments for continuity</li>
                <li>Notify organization admins of your departure</li>
              </ul>
            </div>
            
            {deleteError && (
              <div className="mb-4 p-2 md:p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-xs md:text-sm">
                {deleteError}
              </div>
            )}
            
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Enter your password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your current password"
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 mt-6">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletePassword('');
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                className="cursor-pointer w-full md:flex-1 px-3 md:px-4 py-2 md:py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE' || !deletePassword}
                className="cursor-pointer w-full md:flex-1 px-3 md:px-4 py-2 md:py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm md:text-base flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
