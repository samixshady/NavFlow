'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Clock,
  User as UserIcon,
  AlertCircle,
  Play,
  Pause,
  Square,
  Calendar,
  GripVertical,
  Timer,
  MoreHorizontal,
  Zap,
  Flag,
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette,
  Filter,
  SortAsc,
  SortDesc,
  Tag,
  CalendarDays,
  Hash,
  Users,
  RotateCcw,
  Check,
  Focus,
  MessageSquare,
  Paperclip,
  Loader2,
  Send,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface TaskSection {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  position: number;
  is_default: boolean;
  project: number;
}

interface Label {
  id: number;
  name: string;
  color: string;
  bg_color: string;
  icon?: string;
  description?: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  project: number;
  project_name: string;
  organization_id?: number;
  organization_name?: string;
  assigned_to: number | null;
  assigned_to_email: string | null;
  assigned_to_username?: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  created_at: string;
  estimated_hours: number | null;
  time_spent_minutes: number;
  time_spent_display: string;
  is_timer_running: boolean;
  timer_started_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  position: number;
  section: number | null;
  section_name: string | null;
  section_color: string | null;
  is_focused: boolean;
  focused_id?: number;
  comments_count: number;
  attachments_count: number;
  labels_data?: Label[];
}

interface Project {
  id: number;
  name: string;
  organization_id: number;
  organization_name: string;
  user_role?: string;
  sections?: TaskSection[];
}

// Default colors for sections
const SECTION_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

// Icon options for sections
const SECTION_ICONS = [
  { name: 'none', icon: null, label: 'No Icon' },
  { name: 'flag', icon: Flag, label: 'Flag' },
  { name: 'zap', icon: Zap, label: 'Lightning' },
  { name: 'check', icon: CheckSquare, label: 'Checkbox' },
  { name: 'clock', icon: Clock, label: 'Clock' },
  { name: 'star', icon: Tag, label: 'Star' },
  { name: 'users', icon: Users, label: 'Users' },
];

type SortField = 'created_at' | 'due_date' | 'priority' | 'title' | 'time_spent' | 'organization';
type SortOrder = 'asc' | 'desc';

export default function TasksPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterOrganization, setFilterOrganization] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingSection, setEditingSection] = useState<TaskSection | null>(null);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<number | null>(null);
  
  // Timer state
  const [timerTick, setTimerTick] = useState(0);
  
  // Tab scroll state
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  
  // Project members for assignee selection
  const [projectMembers, setProjectMembers] = useState<{id: number; email: string; name: string}[]>([]);
  const [taskAssignee, setTaskAssignee] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  
  // Labels
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [taskLabels, setTaskLabels] = useState<number[]>([]);
  
  // Comments
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [taskSection, setTaskSection] = useState<number | null>(null);
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Section form states
  const [sectionName, setSectionName] = useState('');
  const [sectionColor, setSectionColor] = useState(SECTION_COLORS[0]);
  const [sectionIcon, setSectionIcon] = useState('none');
  const [sectionProjectId, setSectionProjectId] = useState('');

  // Check for scroll buttons
  const checkScroll = useCallback(() => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  // Scroll tabs
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Timer tick for running timers
  useEffect(() => {
    const interval = setInterval(() => {
      const hasRunningTimer = tasks.some(t => t.is_timer_running);
      if (hasRunningTimer) {
        setTimerTick(t => t + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/');
    } else {
      fetchTasks();
      fetchProjects();
    }
  }, [router]);

  // Handle URL parameter for opening task from notification
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('task');
    
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === parseInt(taskId));
      if (task) {
        openTaskDetail(task);
        // Clear the URL parameter after opening the task
        window.history.replaceState({}, '', '/tasks');
      }
    }
  }, [tasks]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [sections, checkScroll]);

  // When project filter changes, fetch sections for that project
  useEffect(() => {
    if (filterProject && filterProject !== 'all') {
      fetchSections(parseInt(filterProject));
    } else {
      setSections([]);
      setActiveSection(null);
    }
  }, [filterProject]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/');
      const data = response.data;
      if (data && data.results) {
        setProjects(data.results);
      } else {
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchSections = async (projectId: number) => {
    try {
      const response = await api.get(`/sections/?project=${projectId}`);
      const data = response.data;
      const sectionList = data.results || data || [];
      setSections(sectionList);
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    }
  };

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/tasks/');
      const data = response.data;
      let taskList: Task[] = [];
      if (data && data.results) {
        taskList = data.results;
      } else {
        taskList = Array.isArray(data) ? data : [];
      }
      taskList.sort((a, b) => a.position - b.position);
      setTasks(taskList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Section CRUD
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sectionName.trim() || !sectionProjectId) {
      setError('Section name and project are required');
      return;
    }

    try {
      // Generate slug from name
      const slug = sectionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      console.log('Creating section with data:', {
        name: sectionName,
        slug: slug,
        color: sectionColor,
        icon: sectionIcon !== 'none' ? sectionIcon : null,
        project_id: parseInt(sectionProjectId),
      });
      
      const response = await api.post('/sections/', {
        name: sectionName,
        slug: slug,
        color: sectionColor,
        icon: sectionIcon !== 'none' ? sectionIcon : null,
        project_id: parseInt(sectionProjectId),
      });
      
      console.log('Section created successfully:', response.data);
      setSuccess('Section created successfully!');
      resetSectionForm();
      setIsSectionModalOpen(false);
      if (filterProject !== 'all') {
        fetchSections(parseInt(filterProject));
      }
    } catch (err: any) {
      console.error('Section creation error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.detail 
        || err.response?.data?.name?.[0] 
        || err.response?.data?.error
        || JSON.stringify(err.response?.data)
        || 'Failed to create section';
      setError(errorMsg);
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setError('');

    try {
      await api.patch(`/sections/${editingSection.id}/`, {
        name: sectionName,
        color: sectionColor,
        icon: sectionIcon !== 'none' ? sectionIcon : null,
      });
      setSuccess('Section updated successfully!');
      resetSectionForm();
      setIsSectionModalOpen(false);
      setEditingSection(null);
      if (filterProject !== 'all') {
        fetchSections(parseInt(filterProject));
      }
      fetchTasks(); // Refresh tasks to get updated section info
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] || 'Failed to update section');
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm('Are you sure you want to delete this section? Tasks will be moved to the default section.')) return;

    try {
      await api.delete(`/sections/${sectionId}/`);
      setSuccess('Section deleted successfully!');
      if (filterProject !== 'all') {
        fetchSections(parseInt(filterProject));
      }
      if (activeSection === sectionId) {
        setActiveSection(null);
        setShowAllTasks(true);
      }
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete section');
    }
  };

  const resetSectionForm = () => {
    setSectionName('');
    setSectionColor(SECTION_COLORS[0]);
    setSectionIcon('none');
    setSectionProjectId('');
    setEditingSection(null);
  };

  const openEditSection = (section: TaskSection) => {
    setEditingSection(section);
    setSectionName(section.name);
    setSectionColor(section.color);
    setSectionIcon(section.icon || 'none');
    setSectionProjectId(section.project.toString());
    setIsSectionModalOpen(true);
  };

  // Task CRUD
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!taskTitle.trim() || !selectedProjectId) {
      setError('Task title and project are required');
      return;
    }

    try {
      const taskData: any = {
        title: taskTitle,
        description: taskDescription,
        project: parseInt(selectedProjectId),  // For serializer validation
        project_id: parseInt(selectedProjectId),  // For view's project lookup
        priority: taskPriority,
      };
      
      if (taskSection) {
        taskData.section = taskSection;
      }
      if (taskDueDate) {
        taskData.due_date = new Date(taskDueDate).toISOString();
      }
      if (taskEstimatedHours) {
        taskData.estimated_hours = parseFloat(taskEstimatedHours);
      }

      await api.post('/tasks/', taskData);
      setSuccess('Task created successfully!');
      resetForm();
      setIsCreateModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.title?.[0] || err.response?.data?.detail || 'Failed to create task');
    }
  };

  const resetForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setSelectedProjectId('');
    setTaskSection(null);
    setTaskPriority('medium');
    setTaskDueDate('');
    setTaskEstimatedHours('');
  };

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskSection(task.section);
    setTaskPriority(task.priority);
    setTaskDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setTaskEstimatedHours(task.estimated_hours?.toString() || '');
    setTaskAssignee(task.assigned_to);
    setTaskLabels(task.labels_data?.map(l => l.id) || []);
    setIsDetailModalOpen(true);
    
    // Fetch project members for assignee dropdown
    try {
      const response = await api.get(`/projects/${task.project}/members/`);
      console.log('Raw project members:', response.data);
      const members = response.data
        .map((m: any) => ({
          id: m.user_id || m.user?.id || m.id,
          email: m.user_email || m.user?.email || m.email,
          name: m.user_name || m.user?.username || m.user?.email || m.email
        }))
        .filter((m: any) => m.id !== undefined && m.id !== null); // Filter out invalid members
      
      console.log('Processed project members:', members);
      setProjectMembers(members);
    } catch (err) {
      console.error('Error fetching project members:', err);
      setProjectMembers([]);
    }
    
    // Fetch available labels for the project
    try {
      const response = await api.get(`/labels/?project_id=${task.project}`);
      setAvailableLabels(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error fetching labels:', err);
      setAvailableLabels([]);
    }
    
    // Fetch comments for the task
    fetchTaskComments(task.id);
  };
  
  const fetchTaskComments = async (taskId: number) => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/comments/?task_id=${taskId}`);
      setTaskComments(response.data.results || response.data || []);
    } catch (err: any) {
      // Silently handle missing comments endpoint - it's not critical
      if (err?.response?.status !== 404) {
        console.error('Error fetching comments:', err);
      }
      setTaskComments([]);
    } finally {
      setLoadingComments(false);
    }
  };
  
  const handleSubmitComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const response = await api.post('/comments/', {
        task: selectedTask.id,
        content: newComment
      });
      setTaskComments([...taskComments, response.data]);
      setNewComment('');
      setSuccess('Comment added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      setError('Failed to add comment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedTask || !taskTitle.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      const taskData: any = {
        title: taskTitle,
        description: taskDescription,
        priority: taskPriority,
        section: taskSection,
        assigned_to: taskAssignee,
        labels: taskLabels,
      };
      
      if (taskDueDate) {
        taskData.due_date = new Date(taskDueDate).toISOString();
      } else {
        taskData.due_date = null;
      }
      if (taskEstimatedHours) {
        taskData.estimated_hours = parseFloat(taskEstimatedHours);
      }

      const response = await api.patch(`/tasks/${selectedTask.id}/`, taskData);
      
      // Send notification if assignee changed
      if (taskAssignee && taskAssignee !== selectedTask.assigned_to) {
        try {
          await api.post('/notifications/', {
            user: taskAssignee,
            type: 'task_assigned',
            title: 'Task Assigned',
            message: `You have been assigned to task: ${taskTitle}`,
            link: `/tasks?task=${selectedTask.id}`,
            related_task_id: selectedTask.id
          });
        } catch (notifErr) {
          console.error('Failed to send notification:', notifErr);
        }
      }
      
      setSuccess('Task updated successfully!');
      setIsDetailModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.title?.[0] || 'Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask || !confirm(`Are you sure you want to delete "${selectedTask.title}"?`)) return;

    try {
      await api.delete(`/tasks/${selectedTask.id}/`);
      setSuccess('Task deleted successfully!');
      setIsDetailModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete task');
    }
  };

  // Timer functions
  const handleStartTimer = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await api.post(`/tasks/${task.id}/start_timer/`);
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask(response.data);
      }
    } catch (err) {
      console.error('Failed to start timer:', err);
    }
  };

  const handleStopTimer = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await api.post(`/tasks/${task.id}/stop_timer/`);
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask(response.data);
      }
    } catch (err) {
      console.error('Failed to stop timer:', err);
    }
  };

  const handlePauseTimer = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await api.post(`/tasks/${task.id}/pause_timer/`);
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask(response.data);
      }
    } catch (err) {
      console.error('Failed to pause timer:', err);
    }
  };

  const handleResetTimer = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to reset the timer? All tracked time will be lost.')) return;
    try {
      const response = await api.post(`/tasks/${task.id}/reset_timer/`);
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask(response.data);
      }
    } catch (err) {
      console.error('Failed to reset timer:', err);
    }
  };

  // Focus mode functions
  const handleFocusTask = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await api.post('/focus/', { task: task.id });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_focused: true, focused_id: response.data.id } : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...task, is_focused: true, focused_id: response.data.id });
      }
      setSuccess('Task added to Focus Mode');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to focus task:', err);
      console.error('Error response:', err.response?.data);
      if (err.response?.status === 400) {
        setError('Task is already in Focus Mode');
      } else {
        setError(err.response?.data?.detail || 'Failed to add task to Focus Mode');
      }
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUnfocusTask = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!task.focused_id) {
      // Try to find the focused_id first
      try {
        const response = await api.get(`/focus/?task_id=${task.id}`);
        const focusedList = response.data.results || response.data || [];
        if (focusedList.length > 0) {
          await api.post(`/focus/${focusedList[0].id}/unfocus/`);
          setTasks(tasks.map(t => t.id === task.id ? { ...t, is_focused: false, focused_id: undefined } : t));
          if (selectedTask?.id === task.id) {
            setSelectedTask({ ...task, is_focused: false, focused_id: undefined });
          }
          setSuccess('Task removed from Focus Mode');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Task is not in Focus Mode');
          setTimeout(() => setError(''), 3000);
        }
      } catch (err: any) {
        console.error('Failed to unfocus task:', err);
        setError(err.response?.data?.detail || 'Failed to remove from Focus Mode');
        setTimeout(() => setError(''), 3000);
      }
    } else {
      try {
        await api.post(`/focus/${task.focused_id}/unfocus/`);
        setTasks(tasks.map(t => t.id === task.id ? { ...t, is_focused: false, focused_id: undefined } : t));
        if (selectedTask?.id === task.id) {
          setSelectedTask({ ...task, is_focused: false, focused_id: undefined });
        }
        setSuccess('Task removed from Focus Mode');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        console.error('Failed to unfocus task:', err);
        setError(err.response?.data?.detail || 'Failed to remove from Focus Mode');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Move task to section (change label)
  const handleMoveToSection = async (task: Task, newSectionId: number | null) => {
    try {
      await api.patch(`/tasks/${task.id}/`, { section: newSectionId });
      fetchTasks();
      setSuccess(`Task moved to ${newSectionId ? sections.find(s => s.id === newSectionId)?.name : 'No Section'}`);
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTask(null);
    setDragOverTaskId(null);
    setDragOverSectionId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, taskId?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (taskId !== undefined) {
      setDragOverTaskId(taskId);
    }
  };

  const handleTabDragOver = (e: React.DragEvent, sectionId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSectionId(sectionId);
  };

  const handleTabDragLeave = () => {
    setDragOverSectionId(null);
  };

  const handleTabDrop = async (e: React.DragEvent, targetSectionId: number) => {
    e.preventDefault();
    if (!draggedTask) return;
    
    if (draggedTask.section !== targetSectionId) {
      await handleMoveToSection(draggedTask, targetSectionId);
    }
    
    setDraggedTask(null);
    setDragOverSectionId(null);
  };

  // Sorting logic
  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'due_date':
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'time_spent':
          comparison = (a.time_spent_minutes || 0) - (b.time_spent_minutes || 0);
          break;
        case 'organization':
          const orgA = a.organization_name || '';
          const orgB = b.organization_name || '';
          comparison = orgA.localeCompare(orgB);
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Filtering
  const filteredTasks = sortTasks(tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = filterProject === 'all' || task.project.toString() === filterProject;
    const matchesOrganization = filterOrganization === 'all' || task.organization_id?.toString() === filterOrganization;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    // Section filter
    const matchesSection = showAllTasks || !activeSection || task.section === activeSection;
    
    // Due date filter
    let matchesDueDate = true;
    if (filterDueDate !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      if (!task.due_date) {
        matchesDueDate = filterDueDate === 'no_date';
      } else {
        const dueDate = new Date(task.due_date);
        switch (filterDueDate) {
          case 'overdue':
            matchesDueDate = dueDate < today;
            break;
          case 'today':
            matchesDueDate = dueDate >= today && dueDate < tomorrow;
            break;
          case 'tomorrow':
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            matchesDueDate = dueDate >= tomorrow && dueDate < dayAfterTomorrow;
            break;
          case 'this_week':
            matchesDueDate = dueDate >= today && dueDate < nextWeek;
            break;
          case 'no_date':
            matchesDueDate = false;
            break;
        }
      }
    }
    
    return matchesSearch && matchesProject && matchesOrganization && matchesPriority && matchesSection && matchesDueDate;
  }));

  const getTasksForSection = (sectionId: number) => {
    return filteredTasks
      .filter(task => task.section === sectionId)
      .sort((a, b) => a.position - b.position);
  };

  const getSectionIcon = (iconName: string | null) => {
    const iconDef = SECTION_ICONS.find(i => i.name === iconName);
    if (iconDef?.icon) {
      const IconComponent = iconDef.icon;
      return <IconComponent className="w-4 h-4" />;
    }
    return null;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'high':
        return <Flag className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Flag className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Flag className="w-4 h-4 text-green-500" />;
      default:
        return null;
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
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatTimeDisplay = (task: Task) => {
    let totalMinutes = task.time_spent_minutes || 0;
    
    if (task.is_timer_running && task.timer_started_at) {
      const elapsed = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000 / 60);
      totalMinutes += elapsed;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTimerDisplay = (task: Task) => {
    let totalSeconds = (task.time_spent_minutes || 0) * 60;
    
    if (task.is_timer_running && task.timer_started_at) {
      const elapsed = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000);
      totalSeconds += elapsed;
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Check if user can manage sections (owner or admin)
  const canManageSections = () => {
    if (filterProject === 'all') return false;
    const project = projects.find(p => p.id.toString() === filterProject);
    return project?.user_role === 'owner' || project?.user_role === 'admin';
  };

  // Get unique organizations from projects
  const uniqueOrganizations = Array.from(
    new Map(
      projects
        .filter(p => p.organization_id)
        .map(p => [p.organization_id, { id: p.organization_id, name: p.organization_name || 'Unknown Organization' }])
    ).values()
  );

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterProject('all');
    setFilterOrganization('all');
    setFilterPriority('all');
    setFilterDueDate('all');
    setActiveSection(null);
    setShowAllTasks(true);
    setSortField('created_at');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchTerm || filterProject !== 'all' || filterOrganization !== 'all' || filterPriority !== 'all' || filterDueDate !== 'all';
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:gap-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1">
              My Tasks
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} 
              {hasActiveFilters && ' (filtered)'}
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-4 space-y-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm md:text-base"
            />
          </div>

          <div className="flex items-center gap-2">
          {/* Filter Toggle */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all flex-1 sm:flex-initial ${
              isFilterOpen || hasActiveFilters
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm md:text-base">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            )}
          </button>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex-1 sm:flex-initial">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2.5 bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none text-xs md:text-sm flex-1"
            >
              <option value="created_at">Date</option>
              <option value="due_date">Due</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
              <option value="time_spent">Time</option>
              <option value="organization">Org</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4 text-gray-500" />
              ) : (
                <SortDesc className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors sm:hidden"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
        </div>

        {/* Expanded Filters */}
        {isFilterOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl animate-in slide-in-from-top-2 duration-200">
            <select
              value={filterOrganization}
              onChange={(e) => {
                setFilterOrganization(e.target.value);
                setFilterProject('all');
                setActiveSection(null);
                setShowAllTasks(true);
              }}
              className="px-3 md:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
            >
              <option value="all">All Organizations</option>
              {uniqueOrganizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>

            <select
              value={filterProject}
              onChange={(e) => {
                setFilterProject(e.target.value);
                setActiveSection(null);
                setShowAllTasks(true);
              }}
              className="px-3 md:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
            >
              <option value="all">All Projects</option>
              {projects
                .filter(p => filterOrganization === 'all' || p.organization_id?.toString() === filterOrganization)
                .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 md:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>

            <select
              value={filterDueDate}
              onChange={(e) => setFilterDueDate(e.target.value)}
              className="px-3 md:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
            >
              <option value="all">Any Due Date</option>
              <option value="overdue">⚠️ Overdue</option>
              <option value="today">📅 Due Today</option>
              <option value="tomorrow">📆 Due Tomorrow</option>
              <option value="this_week">🗓️ This Week</option>
              <option value="no_date">📭 No Due Date</option>
            </select>
          </div>
        )}
      </div>

      {/* Section Tabs - Browser-like */}
      {(filterProject !== 'all' && sections.length > 0) ? (
        <div className="mb-6 relative">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-t-2xl p-1.5 relative">
            {/* Left Scroll Button */}
            {showLeftScroll && (
              <button
                onClick={() => scrollTabs('left')}
                className="absolute left-0 z-10 p-2 bg-gradient-to-r from-gray-100 dark:from-gray-800 to-transparent"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
            )}
            
            {/* Tabs Container */}
            <div 
              ref={tabsRef}
              onScroll={checkScroll}
              className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth px-1 flex-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* All Tasks Tab */}
              <button
                onClick={() => {
                  setActiveSection(null);
                  setShowAllTasks(true);
                }}
                className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap min-w-fit ${
                  showAllTasks 
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Hash className="w-4 h-4" />
                <span>All Tasks</span>
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  showAllTasks 
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {filteredTasks.length}
                </span>
              </button>

              {/* Section Tabs */}
              {sections.map((section) => {
                const isActive = !showAllTasks && activeSection === section.id;
                const taskCount = getTasksForSection(section.id).length;
                const isDragOver = dragOverSectionId === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setShowAllTasks(false);
                    }}
                    onDragOver={(e) => handleTabDragOver(e, section.id)}
                    onDragLeave={handleTabDragLeave}
                    onDrop={(e) => handleTabDrop(e, section.id)}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap min-w-fit ${
                      isActive 
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' 
                        : isDragOver
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                    }`}
                    style={{
                      borderBottom: isActive ? `3px solid ${section.color}` : '3px solid transparent',
                    }}
                  >
                    {/* Section Icon or Color Indicator */}
                    {section.icon ? (
                      <span style={{ color: section.color }}>
                        {getSectionIcon(section.icon)}
                      </span>
                    ) : (
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: section.color }}
                      />
                    )}
                    
                    {/* Section Name */}
                    <span>{section.name}</span>
                    
                    {/* Task Count */}
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      isActive 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {taskCount}
                    </span>
                    
                    {/* Edit Button (for admins) */}
                    {canManageSections() && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditSection(section);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                      >
                        <Settings className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </button>
                );
              })}
              
              {/* Add Section Button */}
              {canManageSections() && (
                <button
                  onClick={() => {
                    setSectionProjectId(filterProject);
                    setIsSectionModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Section</span>
                </button>
              )}
            </div>
            
            {/* Right Scroll Button */}
            {showRightScroll && (
              <button
                onClick={() => scrollTabs('right')}
                className="absolute right-0 z-10 p-2 bg-gradient-to-l from-gray-100 dark:from-gray-800 to-transparent"
              >
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Section Tabs
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select a project to view and manage its sections
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSectionModalOpen(true)}
              className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Section
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 min-h-0 overflow-hidden">
      <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm flex flex-col">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 flex-shrink-0">
            <CheckSquare className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No tasks found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {hasActiveFilters 
                ? 'Try adjusting your filters' 
                : 'Create your first task to get started'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Task
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onClick={() => openTaskDetail(task)}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group ${
                  draggedTask?.id === task.id ? 'opacity-50' : ''
                } ${dragOverTaskId === task.id ? 'border-t-2 border-t-purple-500' : ''}`}
              >
                {/* Mobile: Top Row */}
                <div className="flex items-start gap-3 w-full sm:flex-1">
                  {/* Drag Handle - Hidden on mobile */}
                  <GripVertical className="hidden sm:block w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />
                  
                  {/* Priority Indicator */}
                  <div className="flex-shrink-0">
                    {getPriorityIcon(task.priority)}
                  </div>
                  
                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 sm:truncate text-sm md:text-base">
                        {task.title}
                      </h4>
                      {task.section_color && (
                        <span 
                          className="px-2 py-0.5 text-xs font-medium rounded-full text-white flex items-center gap-1 w-fit"
                          style={{ backgroundColor: task.section_color }}
                          title={task.section_name || 'Section'}
                        >
                          {task.section_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{task.project_name}</span>
                      {task.description && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="line-clamp-1 sm:truncate sm:max-w-[200px]">{task.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Mobile: Second Row - Metadata */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
                  {/* Priority Badge - Mobile only */}
                  <span className={`sm:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  
                  {/* Due Date */}
                  {task.due_date && (
                    <div className={`flex items-center gap-1.5 text-xs md:text-sm flex-shrink-0 ${
                      isOverdue(task.due_date) 
                        ? 'text-red-600 dark:text-red-400' 
                        : isDueSoon(task.due_date) 
                          ? 'text-orange-600 dark:text-orange-400' 
                          : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                      {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  
                  {/* Timer Display */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs md:text-sm font-mono ${
                      task.is_timer_running 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      <Timer className={`w-3 h-3 md:w-4 md:h-4 ${task.is_timer_running ? 'animate-pulse' : ''}`} />
                      <span>{formatTimeDisplay(task)}</span>
                    </div>
                    
                    {/* Timer Controls */}
                    <div className="flex items-center gap-1">
                      {task.is_timer_running ? (
                        <>
                          <button
                            onClick={(e) => handlePauseTimer(task, e)}
                            className="p-1.5 md:p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-all"
                            title="Pause Timer"
                          >
                            <Pause className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={(e) => handleStopTimer(task, e)}
                            className="p-1.5 md:p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                            title="Stop Timer"
                          >
                            <Square className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => handleStartTimer(task, e)}
                          className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-all"
                          title="Start Timer"
                        >
                          <Play className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Section Selector - Desktop only */}
                {sections.length > 0 && (
                  <div className="hidden lg:block flex-shrink-0">
                    <select
                      value={task.section?.toString() || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleMoveToSection(task, e.target.value ? parseInt(e.target.value) : null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="">No Label</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Priority Badge - Desktop only */}
                <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                
                {/* Assignee */}
                {task.assigned_to_email && (
                  <div className="hidden xl:flex items-center gap-2 flex-shrink-0" title={task.assigned_to_email}>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {task.assigned_to_email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full shadow-2xl my-8 animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  Create New Task
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-400 mt-2 ml-14">Add a new task to your project</p>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setError('');
                  resetForm();
                }}
                className="p-3 hover:bg-white/50 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-xl text-red-800 dark:text-red-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base">{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-6">
                {/* Project Selection */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-purple-500" />
                    Project *
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setTaskSection(null);
                      if (e.target.value) {
                        fetchSections(parseInt(e.target.value));
                      }
                    }}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.organization_name})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Task Title */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-purple-500" />
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
                    required
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-purple-500" />
                    Description
                  </label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Add more details about this task..."
                    rows={4}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none text-base"
                  />
                </div>
                
                {/* Section/Label Selection */}
                {sections.length > 0 && (
                  <div>
                    <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-purple-500" />
                      Label / Section
                    </label>
                    <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setTaskSection(null)}
                      className={`px-4 py-2.5 rounded-xl text-base font-medium transition-all ${
                        !taskSection
                          ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      No Label
                    </button>
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setTaskSection(section.id)}
                        className={`px-4 py-2.5 rounded-xl text-base font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md ${
                          taskSection === section.id
                            ? 'text-white'
                            : 'bg-gray-100 dark:bg-gray-800 hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: taskSection === section.id ? section.color : undefined,
                          borderColor: section.color,
                          borderWidth: taskSection !== section.id ? '2px' : '0',
                        }}
                      >
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: taskSection === section.id ? 'white' : section.color }}
                        />
                        {section.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Priority and Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Flag className="w-5 h-5 text-purple-500" />
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
                  >
                    <option value="low">🟢 Low Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="high">🟠 High Priority</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
                  />
                </div>
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={taskEstimatedHours}
                  onChange={(e) => setTaskEstimatedHours(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
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
                  resetForm();
                }}
                className="flex-1 px-6 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-semibold text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleCreateTask}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl text-base"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] p-0 md:p-4 lg:pl-72 lg:pr-12">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-2xl w-full max-w-5xl h-[95vh] md:h-[88vh] shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex-shrink-0">
              <h2 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 md:gap-3">
                <div className="p-2 md:p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <CheckSquare className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                Task Details
              </h2>
              <div className="flex items-center gap-2">
                {/* Focus Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (selectedTask.is_focused) {
                      handleUnfocusTask(selectedTask, e);
                    } else {
                      handleFocusTask(selectedTask, e);
                    }
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    selectedTask.is_focused 
                      ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50' 
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400'
                  }`}
                  title={selectedTask.is_focused ? 'Remove from Focus Mode' : 'Add to Focus Mode'}
                >
                  <Focus className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDeleteTask}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setError('');
                    setSelectedTask(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 md:gap-6 p-4 md:p-6 lg:p-8">
              {/* Left Column - Task Form */}
              <div className="flex-1 overflow-y-auto lg:pr-4 space-y-4 md:space-y-6">
                {/* Timer Section */}
                <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Time Tracked</p>
                  <p className={`text-2xl md:text-3xl font-bold font-mono ${
                    selectedTask.is_timer_running 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {formatTimerDisplay(selectedTask)}
                  </p>
                  {selectedTask.estimated_hours && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Estimated: {selectedTask.estimated_hours}h
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTask.is_timer_running ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handlePauseTimer(selectedTask, e)}
                        className="px-3 md:px-4 py-2 md:py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-xl transition-all flex items-center gap-2 text-sm md:text-base"
                        title="Pause timer (saves time)"
                      >
                        <Pause className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden sm:inline">Pause</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleStopTimer(selectedTask, e)}
                        className="px-3 md:px-4 py-2 md:py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all flex items-center gap-2 text-sm md:text-base"
                        title="Stop timer"
                      >
                        <Square className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden sm:inline">Stop</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleStartTimer(selectedTask, e)}
                      className="px-3 md:px-4 py-2 md:py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all flex items-center gap-2 text-sm md:text-base"
                    >
                      <Play className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Start</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleResetTimer(selectedTask, e)}
                    className="p-2 md:p-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl transition-all"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned To</p>
                  {selectedTask.assigned_to ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {selectedTask.assigned_to_email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedTask.assigned_to_username || selectedTask.assigned_to_email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-base md:text-lg font-semibold text-gray-500 dark:text-gray-400 italic">
                      Not assigned
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg text-sm md:text-base"
                >
                  <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
                  {selectedTask.assigned_to ? 'Reassign' : 'Assign Task'}
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Section/Label Selection */}
              {sections.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Label / Section
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTaskSection(null)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        !taskSection
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      None
                    </button>
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setTaskSection(section.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                          taskSection === section.id
                            ? 'text-white'
                            : 'bg-gray-100 dark:bg-gray-800 hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: taskSection === section.id ? section.color : undefined,
                          borderColor: section.color,
                          borderWidth: taskSection !== section.id ? '1px' : '0',
                        }}
                      >
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: taskSection === section.id ? 'white' : section.color }}
                        />
                        {section.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              


              {/* Label Selection */}
              {availableLabels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Labels
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableLabels.map((label) => {
                      const isSelected = taskLabels.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setTaskLabels(taskLabels.filter(id => id !== label.id));
                            } else {
                              setTaskLabels([...taskLabels, label.id]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-gray-800'
                              : 'hover:opacity-80'
                          }`}
                          style={{
                            backgroundColor: isSelected ? label.color : label.bg_color,
                            color: isSelected ? 'white' : label.color,
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {label.icon && <Tag className="w-3 h-3" />}
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={taskEstimatedHours}
                  onChange={(e) => setTaskEstimatedHours(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Task Metadata */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedTask.organization_name && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Organization:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedTask.organization_name}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Project:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedTask.project_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {new Date(selectedTask.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedTask.assigned_to_email && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Assigned:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{selectedTask.assigned_to_email}</span>
                    </div>
                  )}
                  {selectedTask.completed_at && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {new Date(selectedTask.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setError('');
                    setSelectedTask(null);
                  }}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
              </div>

              {/* Right Column - Comments & Activity */}
              <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 pt-6 lg:pt-0 lg:pl-6">
                {/* Inline Assignment UI */}
                {showAssignModal && (
                  <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-2 border-purple-300 dark:border-purple-700 shadow-lg animate-in slide-in-from-top duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-purple-600" />
                        Assign Task
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignModal(false);
                          setAssigneeSearch('');
                        }}
                        className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Current Assignment */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        Currently Assigned
                      </p>
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        {selectedTask.assigned_to ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {selectedTask.assigned_to_email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {selectedTask.assigned_to_username || selectedTask.assigned_to_email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">Not assigned</p>
                        )}
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
                      {/* Unassign Option */}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const response = await api.patch(`/tasks/${selectedTask.id}/`, {
                              assigned_to: null
                            });
                            
                            // Update local state
                            setSelectedTask({...selectedTask, assigned_to: null, assigned_to_email: null, assigned_to_username: null});
                            setTaskAssignee(null);
                            await fetchTasks();
                            
                            setSuccess('Task unassigned successfully!');
                            setTimeout(() => setSuccess(''), 3000);
                          } catch (err: any) {
                            console.error('Unassign error:', err);
                            setError(err.response?.data?.detail || 'Failed to unassign task');
                            setTimeout(() => setError(''), 3000);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-lg transition-all text-sm border-2 ${
                          !selectedTask.assigned_to
                            ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500'
                            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">Unassigned</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Remove assignment</p>
                      </button>

                      {/* Member List */}
                      {projectMembers
                        .filter(member => 
                          assigneeSearch === '' || 
                          member.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                          member.email.toLowerCase().includes(assigneeSearch.toLowerCase())
                        )
                        .filter(member => member.id !== undefined && member.id !== null) // Filter invalid members
                        .map((member) => (
                          <button
                            key={`member-${member.id}`}
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              if (!member.id) {
                                console.error('Invalid member - missing ID:', member);
                                setError('Invalid member selected');
                                setTimeout(() => setError(''), 3000);
                                return;
                              }
                              
                              try {
                                console.log('Assigning task to:', member);
                                
                                // Update the task
                                const response = await api.patch(`/tasks/${selectedTask.id}/`, {
                                  assigned_to: member.id
                                });
                                
                                console.log('Task updated:', response.data);
                                
                                // Send notification only if this is a new assignment or reassignment
                                if (member.id !== selectedTask.assigned_to) {
                                  try {
                                    const notificationPayload = {
                                      user: member.id, // The user who will receive the notification
                                      type: 'task_assigned',
                                      title: 'New Task Assigned',
                                      message: `You have been assigned to: ${selectedTask.title}`,
                                      link: `/tasks?task=${selectedTask.id}`,
                                      related_task_id: selectedTask.id,
                                      related_project_id: selectedTask.project
                                    };
                                    
                                    console.log('Sending notification with payload:', notificationPayload);
                                    const notifResponse = await api.post('/accounts/notifications/', notificationPayload);
                                    console.log('Notification sent successfully:', notifResponse.data);
                                  } catch (notifErr: any) {
                                    console.error('Failed to send notification:', notifErr.response?.data || notifErr.message);
                                    // Don't fail the assignment if notification fails
                                  }
                                }
                                
                                // Update local state
                                setSelectedTask({
                                  ...selectedTask, 
                                  assigned_to: member.id, 
                                  assigned_to_email: member.email,
                                  assigned_to_username: member.name
                                });
                                setTaskAssignee(member.id);
                                
                                // Refresh tasks list
                                await fetchTasks();
                                
                                setSuccess(`Task assigned to ${member.name}!`);
                                setTimeout(() => setSuccess(''), 3000);
                              } catch (err: any) {
                                console.error('Assignment error:', err.response?.data || err);
                                setError(err.response?.data?.detail || 'Failed to assign task');
                                setTimeout(() => setError(''), 3000);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-lg transition-all text-sm border-2 ${
                              selectedTask.assigned_to === member.id
                                ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500'
                                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {member.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                              </div>
                              {selectedTask.assigned_to === member.id && (
                                <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      
                      {projectMembers.filter(member => 
                        assigneeSearch === '' || 
                        member.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                        member.email.toLowerCase().includes(assigneeSearch.toLowerCase())
                      ).length === 0 && assigneeSearch && (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No members found matching "{assigneeSearch}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Comments ({taskComments.length})
                  </h3>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {loadingComments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                  ) : taskComments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No comments yet</p>
                      <p className="text-sm">Be the first to comment!</p>
                    </div>
                  ) : (
                    taskComments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {comment.author_initials || comment.author_name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                {comment.author_name || comment.author_username}
                              </p>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {comment.time_ago}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap break-words">
                              {comment.content}
                            </p>
                            {comment.is_edited && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic mt-1 block">
                                (edited)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleSubmitComment();
                      }
                    }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Ctrl+Enter to submit
                    </span>
                    <button
                      type="button"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {submittingComment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Comment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error/Success Messages - Fixed at bottom */}
            {error && (
              <div className="px-6 pb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Modal (Create/Edit) */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingSection ? 'Edit Section' : 'Create Section'}
              </h2>
              <button
                onClick={() => {
                  setIsSectionModalOpen(false);
                  setError('');
                  resetSectionForm();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={editingSection ? handleUpdateSection : handleCreateSection} className="space-y-4">
              {!editingSection && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project *
                  </label>
                  <select
                    value={sectionProjectId}
                    onChange={(e) => setSectionProjectId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} {project.organization_name && `(${project.organization_name})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g., In Progress, Quality Check, Production Ready"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {SECTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSectionColor(color)}
                      className={`w-9 h-9 rounded-xl transition-all hover:scale-110 ${
                        sectionColor === color 
                          ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-800 scale-110' 
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icon (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SECTION_ICONS.map((iconOption) => {
                    const IconComponent = iconOption.icon;
                    return (
                      <button
                        key={iconOption.name}
                        type="button"
                        onClick={() => setSectionIcon(iconOption.name)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          sectionIcon === iconOption.name 
                            ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500' 
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        title={iconOption.label}
                      >
                        {IconComponent ? (
                          <IconComponent className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Preview</p>
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: sectionColor }}
                >
                  {sectionIcon !== 'none' && getSectionIcon(sectionIcon)}
                  <span>{sectionName || 'Section Name'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                {editingSection && !editingSection.is_default && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteSection(editingSection.id);
                      setIsSectionModalOpen(false);
                      resetSectionForm();
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSectionModalOpen(false);
                      setError('');
                      resetSectionForm();
                    }}
                    className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all"
                  >
                    {editingSection ? 'Save Changes' : 'Create Section'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-2 duration-200 flex items-center gap-2 z-[100]">
          <Check className="w-5 h-5" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
