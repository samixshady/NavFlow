'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Menu, 
  Search, 
  Bell, 
  Moon, 
  Sun, 
  X,
  CheckSquare,
  FolderKanban,
  Building2,
  Settings,
  LogOut,
  User as UserIcon,
  Briefcase,
  MapPin,
  Github,
  Linkedin,
  Globe,
  ChevronRight,
  Check
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

interface NavbarProps {
  onMenuClick: () => void;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  time_ago: string;
  actor_name: string | null;
}

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  initials: string;
  avatar: string | null;
  bio: string | null;
  job_title: string | null;
  department: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  notification_email: boolean;
  notification_push: boolean;
  theme_preference: string;
  unread_notifications_count: number;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuthStore();
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  
  // Edit profile form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    avatar: '',
    bio: '',
    job_title: '',
    department: '',
    phone: '',
    location: '',
    linkedin_url: '',
    github_url: '',
    website_url: '',
    notification_email: true,
    notification_push: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/profile/');
        setProfile(response.data);
        setUnreadCount(response.data.unread_notifications_count || 0);
        setEditForm({
          first_name: response.data.first_name || '',
          last_name: response.data.last_name || '',
          avatar: response.data.avatar || '',
          bio: response.data.bio || '',
          job_title: response.data.job_title || '',
          department: response.data.department || '',
          phone: response.data.phone || '',
          location: response.data.location || '',
          linkedin_url: response.data.linkedin_url || '',
          github_url: response.data.github_url || '',
          website_url: response.data.website_url || '',
          notification_email: response.data.notification_email ?? true,
          notification_push: response.data.notification_push ?? true,
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    fetchProfile();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/auth/notifications/unread/');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const response = await api.get('/auth/notifications/unread/');
      setNotifications(response.data.results || []);
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      await api.post(`/auth/notifications/${id}/mark_read/`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/auth/notifications/mark_all_read/');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markNotificationRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setIsNotificationsOpen(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await api.patch('/auth/profile/', editForm);
      setProfile(response.data);
      setIsEditProfileOpen(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <CheckSquare className="w-4 h-4 text-blue-500" />;
      case 'project_invite':
        return <FolderKanban className="w-4 h-4 text-purple-500" />;
      case 'org_invite':
        return <Building2 className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 transition-colors duration-300">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects, tasks..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 group"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-180 transition-transform duration-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 group-hover:rotate-180 transition-transform duration-500" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                if (!isNotificationsOpen) fetchNotifications();
              }}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="p-8 text-center">
                      <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
                          !notification.is_read ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''
                        }`}
                      >
                        <div className="mt-0.5 p-2 rounded-full bg-gray-100 dark:bg-gray-700">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {notification.time_ago}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <button
                    onClick={() => {
                      router.push('/activity');
                      setIsNotificationsOpen(false);
                    }}
                    className="w-full text-center text-sm text-purple-600 dark:text-purple-400 hover:underline py-1"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              {profile?.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt={profile.full_name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-purple-500 transition-all"
                />
              ) : (
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ring-2 ring-transparent group-hover:ring-purple-300">
                  <span className="text-white font-semibold text-sm">
                    {profile?.initials || 'U'}
                  </span>
                </div>
              )}
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Profile Header */}
                <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500">
                  <div className="flex items-center gap-3">
                    {profile?.avatar ? (
                      <img 
                        src={profile.avatar} 
                        alt={profile.full_name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-white/50"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {profile?.initials || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">
                        {profile?.full_name || 'User'}
                      </h4>
                      <p className="text-sm text-white/80 truncate">
                        {profile?.email}
                      </p>
                      {profile?.job_title && (
                        <p className="text-xs text-white/60 truncate">
                          {profile.job_title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  {profile?.department && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{profile.department}</span>
                    </div>
                  )}
                  {profile?.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {!profile?.department && !profile?.location && (
                    <p className="text-sm text-gray-400 italic">Complete your profile</p>
                  )}
                </div>

                {/* Actions */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsEditProfileOpen(true);
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Edit Profile</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                  <button
                    onClick={() => {
                      router.push('/settings');
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                </div>

                {/* Logout */}
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                {editForm.avatar ? (
                  <img 
                    src={editForm.avatar} 
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {editForm.first_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Profile Picture URL
                  </label>
                  <input
                    type="url"
                    value={editForm.avatar}
                    onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Work Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={editForm.job_title}
                    onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                    placeholder="Software Engineer"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    placeholder="Engineering"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Social Links</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-5 h-5 text-[#0077b5]" />
                    <input
                      type="url"
                      value={editForm.linkedin_url}
                      onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Github className="w-5 h-5 text-gray-800 dark:text-white" />
                    <input
                      type="url"
                      value={editForm.github_url}
                      onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                      placeholder="https://github.com/username"
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-600" />
                    <input
                      type="url"
                      value={editForm.website_url}
                      onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
                      placeholder="https://your-website.com"
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Notification Preferences</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.notification_email}
                      onChange={(e) => setEditForm({ ...editForm, notification_email: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Email notifications</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.notification_push}
                      onChange={(e) => setEditForm({ ...editForm, notification_push: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Push notifications</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
