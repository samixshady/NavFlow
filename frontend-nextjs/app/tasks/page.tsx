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

interface Task {
  id: number;
  title: string;
  description: string;
  project: number;
  project_name: string;
  assigned_to: number | null;
  assigned_to_email: string | null;
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
}

interface Project {
  id: number;
  name: string;
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

type SortField = 'created_at' | 'due_date' | 'priority' | 'title' | 'time_spent';
type SortOrder = 'asc' | 'desc';

export default function TasksPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [filterProject, setFilterProject] = useState<string>('all');
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
      await api.post('/sections/', {
        name: sectionName,
        color: sectionColor,
        icon: sectionIcon !== 'none' ? sectionIcon : null,
        project: parseInt(sectionProjectId),
      });
      setSuccess('Section created successfully!');
      resetSectionForm();
      setIsSectionModalOpen(false);
      if (filterProject !== 'all') {
        fetchSections(parseInt(filterProject));
      }
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create section');
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

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskSection(task.section);
    setTaskPriority(task.priority);
    setTaskDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setTaskEstimatedHours(task.estimated_hours?.toString() || '');
    setIsDetailModalOpen(true);
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
      };
      
      if (taskDueDate) {
        taskData.due_date = new Date(taskDueDate).toISOString();
      } else {
        taskData.due_date = null;
      }
      if (taskEstimatedHours) {
        taskData.estimated_hours = parseFloat(taskEstimatedHours);
      }

      await api.patch(`/tasks/${selectedTask.id}/`, taskData);
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

  const handleResetTimer = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to reset the timer? All tracked time will be lost.')) return;
    try {
      await api.patch(`/tasks/${task.id}/`, { time_spent_minutes: 0 });
      fetchTasks();
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...task, time_spent_minutes: 0, is_timer_running: false });
      }
    } catch (err) {
      console.error('Failed to reset timer:', err);
    }
  };

  // Focus mode functions
  const handleFocusTask = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await api.post('/projects/focus/', { task: task.id });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_focused: true, focused_id: response.data.id } : t));
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...task, is_focused: true, focused_id: response.data.id });
      }
      setSuccess('Task added to Focus Mode');
    } catch (err: any) {
      console.error('Failed to focus task:', err);
      if (err.response?.status === 400) {
        setError('Task is already in Focus Mode');
      }
    }
  };

  const handleUnfocusTask = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!task.focused_id) {
      // Try to find the focused_id first
      try {
        const response = await api.get(`/projects/focus/?task_id=${task.id}`);
        const focusedList = response.data.results || response.data || [];
        if (focusedList.length > 0) {
          await api.post(`/projects/focus/${focusedList[0].id}/unfocus/`);
          setTasks(tasks.map(t => t.id === task.id ? { ...t, is_focused: false, focused_id: undefined } : t));
          if (selectedTask?.id === task.id) {
            setSelectedTask({ ...task, is_focused: false, focused_id: undefined });
          }
          setSuccess('Task removed from Focus Mode');
        }
      } catch (err) {
        console.error('Failed to unfocus task:', err);
      }
    } else {
      try {
        await api.post(`/projects/focus/${task.focused_id}/unfocus/`);
        setTasks(tasks.map(t => t.id === task.id ? { ...t, is_focused: false, focused_id: undefined } : t));
        if (selectedTask?.id === task.id) {
          setSelectedTask({ ...task, is_focused: false, focused_id: undefined });
        }
        setSuccess('Task removed from Focus Mode');
      } catch (err) {
        console.error('Failed to unfocus task:', err);
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
    
    return matchesSearch && matchesProject && matchesPriority && matchesSection && matchesDueDate;
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

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterProject('all');
    setFilterPriority('all');
    setFilterDueDate('all');
    setActiveSection(null);
    setShowAllTasks(true);
    setSortField('created_at');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchTerm || filterProject !== 'all' || filterPriority !== 'all' || filterDueDate !== 'all';
  
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
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            My Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} 
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-4 space-y-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[250px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
              isFilterOpen || hasActiveFilters
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            )}
          </button>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2.5 bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none text-sm"
            >
              <option value="created_at">Date Created</option>
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
              <option value="time_spent">Time Spent</option>
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

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {isFilterOpen && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl animate-in slide-in-from-top-2 duration-200">
            <select
              value={filterProject}
              onChange={(e) => {
                setFilterProject(e.target.value);
                setActiveSection(null);
                setShowAllTasks(true);
              }}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
      {filterProject !== 'all' && sections.length > 0 && (
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
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group ${
                  draggedTask?.id === task.id ? 'opacity-50' : ''
                } ${dragOverTaskId === task.id ? 'border-t-2 border-t-purple-500' : ''}`}
              >
                {/* Drag Handle */}
                <GripVertical className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 transition-opacity" />
                
                {/* Priority Indicator */}
                <div className="flex-shrink-0">
                  {getPriorityIcon(task.priority)}
                </div>
                
                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {task.title}
                    </h4>
                    {task.section_color && (
                      <span 
                        className="px-2 py-0.5 text-xs font-medium rounded-full text-white flex items-center gap-1"
                        style={{ backgroundColor: task.section_color }}
                        title={task.section_name || 'Section'}
                      >
                        {task.section_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span>{task.project_name}</span>
                    {task.description && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">{task.description}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Section Selector (Quick Change) */}
                {sections.length > 0 && (
                  <div className="hidden md:block flex-shrink-0">
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
                
                {/* Priority Badge */}
                <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                
                {/* Due Date */}
                {task.due_date && (
                  <div className={`hidden lg:flex items-center gap-1.5 text-sm flex-shrink-0 ${
                    isOverdue(task.due_date) 
                      ? 'text-red-600 dark:text-red-400' 
                      : isDueSoon(task.due_date) 
                        ? 'text-orange-600 dark:text-orange-400' 
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <Calendar className="w-4 h-4" />
                    {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
                
                {/* Timer Display */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-mono ${
                    task.is_timer_running 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    <Timer className={`w-4 h-4 ${task.is_timer_running ? 'animate-pulse' : ''}`} />
                    <span>{formatTimeDisplay(task)}</span>
                  </div>
                  
                  {/* Timer Controls */}
                  <div className="flex items-center gap-1">
                    {task.is_timer_running ? (
                      <button
                        onClick={(e) => handleStopTimer(task, e)}
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                        title="Stop Timer"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleStartTimer(task, e)}
                        className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-all"
                        title="Start Timer"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
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
      </div>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Task</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setError('');
                  resetForm();
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

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
                  placeholder="e.g. 4"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setError('');
                    resetForm();
                  }}
                  className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Details</h2>
              <div className="flex items-center gap-2">
                {/* Focus Button */}
                <button
                  onClick={(e) => selectedTask.is_focused ? handleUnfocusTask(selectedTask, e) : handleFocusTask(selectedTask, e)}
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

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Timer Section */}
            <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Time Tracked</p>
                  <p className={`text-3xl font-bold font-mono ${
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
                <div className="flex items-center gap-2">
                  {selectedTask.is_timer_running ? (
                    <button
                      type="button"
                      onClick={(e) => handleStopTimer(selectedTask, e)}
                      className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all flex items-center gap-2"
                    >
                      <Pause className="w-5 h-5" />
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleStartTimer(selectedTask, e)}
                      className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Start
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleResetTimer(selectedTask, e)}
                    className="p-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl transition-all"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
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

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setError('');
                    setSelectedTask(null);
                  }}
                  className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
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
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-2 duration-200 flex items-center gap-2 z-50">
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
