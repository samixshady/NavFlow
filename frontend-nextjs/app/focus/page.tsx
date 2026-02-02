'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Focus, 
  Loader2, 
  Plus, 
  X, 
  CheckSquare, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Paperclip,
  Tag,
  ChevronDown,
  ChevronRight,
  Target,
  Timer,
  Play,
  Pause,
  Square,
  Send,
  Trash2,
  ExternalLink,
  StickyNote,
  AlertCircle
} from 'lucide-react';
import api from '@/lib/api';

interface Task {
  id: number;
  title: string;
  description: string;
  rich_description?: string;
  project: number;
  project_name: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  assigned_to_username: string;
  assigned_to_name: string;
  assigned_to_avatar: string | null;
  due_date: string | null;
  labels_data: Label[];
  comments_count: number;
  attachments_count: number;
  is_timer_running: boolean;
  time_spent_minutes: number;
  time_spent_display: string;
}

interface FocusedTask {
  id: number;
  task: number;
  task_data: Task;
  task_title: string;
  project_name: string;
  project_id: number;
  focused_at: string;
  notes: string;
}

interface Label {
  id: number;
  name: string;
  color: string;
  bg_color: string;
  icon?: string;
}

interface Comment {
  id: number;
  author_username: string;
  author_name: string;
  author_avatar: string | null;
  author_initials: string;
  author_deleted: boolean;
  content: string;
  mentions: string[];
  created_at: string;
  time_ago: string;
  is_edited: boolean;
}

export default function FocusModePage() {
  const router = useRouter();
  const [focusedTasks, setFocusedTasks] = useState<FocusedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<FocusedTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Task details
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Notes
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchFocusedTasks();
  }, []);

  const fetchFocusedTasks = async () => {
    try {
      const response = await api.get('/focus/');
      setFocusedTasks(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error fetching focused tasks:', err);
      setError('Failed to load focused tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (taskId: number) => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/projects/comments/?task_id=${taskId}`);
      setComments(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const selectTask = (focused: FocusedTask) => {
    setSelectedTask(focused);
    setNotes(focused.notes || '');
    fetchComments(focused.task);
  };

  const unfocusTask = async (focusId: number) => {
    try {
      await api.post(`/focus/${focusId}/unfocus/`);
      setFocusedTasks(focusedTasks.filter(f => f.id !== focusId));
      if (selectedTask?.id === focusId) {
        setSelectedTask(null);
      }
    } catch (err) {
      console.error('Error unfocusing task:', err);
    }
  };

  const saveNotes = async () => {
    if (!selectedTask) return;
    setSavingNotes(true);
    try {
      await api.patch(`/focus/${selectedTask.id}/update_notes/`, { notes });
      setFocusedTasks(focusedTasks.map(f => 
        f.id === selectedTask.id ? { ...f, notes } : f
      ));
      setEditingNotes(false);
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const submitComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const response = await api.post('/projects/comments/', {
        task: selectedTask.task,
        content: newComment
      });
      setComments([...comments, response.data]);
      setNewComment('');
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleTimer = async (taskId: number, isRunning: boolean) => {
    try {
      await api.post(`/projects/tasks/${taskId}/${isRunning ? 'stop_timer' : 'start_timer'}/`);
      // Refresh task data
      const response = await api.get(`/projects/tasks/${taskId}/`);
      if (selectedTask && selectedTask.task === taskId) {
        setSelectedTask({
          ...selectedTask,
          task_data: response.data
        });
      }
      setFocusedTasks(focusedTasks.map(f => 
        f.task === taskId ? { ...f, task_data: response.data } : f
      ));
    } catch (err) {
      console.error('Error toggling timer:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'review': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Focus className="w-8 h-8 text-purple-600" />
                Focus Mode
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Your personal space for focused work. No distractions.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex-shrink-0 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {focusedTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-16">
              <Focus className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No focused tasks</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Add tasks to your focus list from the Tasks page by clicking the "Focus" button on any task.
              </p>
              <button
                onClick={() => router.push('/tasks')}
                className="cursor-pointer px-6 py-3 bg-[#bb69faa1] hover:bg-[#bb69fa] text-white rounded-lg transition-all flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Browse Tasks
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            {/* Task List */}
            <div className="lg:w-80 flex-shrink-0 space-y-3 overflow-y-auto">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
                Focused Tasks ({focusedTasks.length})
              </h2>
              {focusedTasks.map((focused) => (
                <div
                  key={focused.id}
                  onClick={() => selectTask(focused)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTask?.id === focused.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {focused.task_data.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {focused.project_name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(focused.task_data.priority)}`}>
                          {focused.task_data.priority_display}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(focused.task_data.status)}`}>
                          {focused.task_data.status_display}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        unfocusTask(focused.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove from focus"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {focused.task_data.is_timer_running && (
                    <div className="mt-2 flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                      <Timer className="w-4 h-4 animate-pulse" />
                      Timer running
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Task Detail Panel */}
            {selectedTask ? (
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-0">
                {/* Task Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedTask.task_data.title}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {selectedTask.project_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTimer(selectedTask.task, selectedTask.task_data.is_timer_running)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          selectedTask.task_data.is_timer_running
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {selectedTask.task_data.is_timer_running ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Stop Timer
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Start Timer
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => router.push(`/tasks?task=${selectedTask.task}`)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        title="View in My Tasks"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    <span className={`px-3 py-1 text-sm rounded-full ${getPriorityColor(selectedTask.task_data.priority)}`}>
                      {selectedTask.task_data.priority_display} Priority
                    </span>
                    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedTask.task_data.status)}`}>
                      {selectedTask.task_data.status_display}
                    </span>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                      <Clock className="w-4 h-4" />
                      {selectedTask.task_data.time_spent_display || '0m'}
                    </div>
                    {selectedTask.task_data.due_date && (
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedTask.task_data.due_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                      <MessageSquare className="w-4 h-4" />
                      {selectedTask.task_data.comments_count} comments
                    </div>
                  </div>

                  {/* Labels */}
                  {selectedTask.task_data.labels_data?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedTask.task_data.labels_data.map((label) => (
                        <span
                          key={label.id}
                          className="px-2 py-1 text-xs rounded-full flex items-center gap-1"
                          style={{ backgroundColor: label.bg_color, color: label.color }}
                        >
                          <Tag className="w-3 h-3" />
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Description */}
                  {selectedTask.task_data.description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {selectedTask.task_data.description}
                      </p>
                    </div>
                  )}

                  {/* Personal Notes */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                        <StickyNote className="w-4 h-4" />
                        Personal Notes
                      </h3>
                      {!editingNotes && (
                        <button
                          onClick={() => setEditingNotes(true)}
                          className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {editingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add personal notes for this task..."
                          className="w-full p-3 border border-yellow-300 dark:border-yellow-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                          rows={4}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setNotes(selectedTask.notes || '');
                              setEditingNotes(false);
                            }}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveNotes}
                            disabled={savingNotes}
                            className="cursor-pointer px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-1"
                          >
                            {savingNotes && <Loader2 className="w-3 h-3 animate-spin" />}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap">
                        {notes || 'No notes yet. Click Edit to add your thoughts.'}
                      </p>
                    )}
                  </div>

                  {/* Comments */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Comments
                    </h3>

                    {loadingComments ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      <div className="space-y-4 mb-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-medium">
                                {comment.author_initials}
                              </span>
                            </div>
                            <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                  {comment.author_deleted ? `@${comment.author_username} (deleted)` : comment.author_name || `@${comment.author_username}`}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {comment.time_ago}
                                  {comment.is_edited && ' (edited)'}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New Comment */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-medium">You</span>
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment... Use @username to mention someone"
                          className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none text-sm"
                          rows={2}
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={submitComment}
                            disabled={!newComment.trim() || submittingComment}
                            className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                          >
                            {submittingComment ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <Target className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a task to start focusing
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
