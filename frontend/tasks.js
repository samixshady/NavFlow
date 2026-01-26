/**
 * Tasks Management Frontend
 * Handles task creation, updates, and role-based task management
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';
let currentTaskId = null;
let currentProjectId = null;
let currentUserRole = null;
let allTasks = [];
let filteredTasks = [];

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', function() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    displayUserEmail();
    
    // Event listeners
    document.getElementById('createTaskForm').addEventListener('submit', handleCreateTask);
    document.getElementById('updateTaskForm').addEventListener('submit', handleUpdateTask);
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    document.querySelector('.modal-close').addEventListener('click', closeTaskModal);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterPriority').addEventListener('change', applyFilters);
    document.getElementById('filterSearch').addEventListener('input', applyFilters);
    
    // Load projects and tasks
    loadProjects();
    loadTasks();
});

function displayUserEmail() {
    const email = localStorage.getItem('userEmail');
    if (email) {
        document.getElementById('userEmail').textContent = email;
    }
}

// ===== Projects =====
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/projects/`, {
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load projects');
        
        const projects = await response.json();
        populateProjectSelect(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

function populateProjectSelect(projects) {
    const select = document.getElementById('projectSelect');
    
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = `${project.name} (${project.organization_name})`;
        select.appendChild(option);
    });
}

// ===== Tasks Management =====
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/`, {
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load tasks');
        
        allTasks = await response.json();
        filteredTasks = [...allTasks];
        displayTasks(filteredTasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Failed to load tasks');
    }
}

function displayTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<p class="no-data">No tasks found. Create one above!</p>';
        return;
    }
    
    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item" onclick="openTaskDetail(${task.id})">
            <div class="task-header">
                <h3>${escapeHtml(task.title)}</h3>
                <span class="badge badge-status-${task.status}">${getStatusLabel(task.status)}</span>
            </div>
            <p class="task-project">📋 ${escapeHtml(task.project_name)}</p>
            <p class="task-description">${escapeHtml(task.description || 'No description')}</p>
            <div class="task-meta">
                <span class="badge badge-priority-${task.priority}">${getPriorityLabel(task.priority)}</span>
                <span class="badge">${getStatusLabel(task.status)}</span>
                ${task.assigned_to_email ? `<span class="badge">👤 ${escapeHtml(task.assigned_to_email)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function getStatusLabel(status) {
    const labels = {
        'todo': 'To Do',
        'in_progress': 'In Progress',
        'review': 'In Review',
        'done': 'Done'
    };
    return labels[status] || status;
}

function getPriorityLabel(priority) {
    const labels = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'critical': 'Critical'
    };
    return labels[priority] || priority;
}

async function handleCreateTask(e) {
    e.preventDefault();
    
    const project_id = document.getElementById('projectSelect').value;
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDesc').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const status = document.getElementById('taskStatus').value;
    
    if (!project_id || !title) {
        showFieldError(document.getElementById('createTaskMessage'), 'Project and Title are required');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                project_id: parseInt(project_id),
                title,
                description,
                priority,
                status
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showFieldError(document.getElementById('createTaskMessage'), 
                data.title ? data.title[0] : 'Failed to create task');
            return;
        }
        
        showSuccess('Task created successfully!');
        document.getElementById('createTaskForm').reset();
        loadTasks();
    } catch (error) {
        console.error('Error creating task:', error);
        showError('Failed to create task');
    }
}

// ===== Task Detail =====
async function openTaskDetail(taskId) {
    currentTaskId = taskId;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/`, {
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load task');
        
        const task = await response.json();
        displayTaskDetail(task);
        displayTaskActions(task);
        
        document.getElementById('taskModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading task:', error);
        showError('Failed to load task details');
    }
}

function displayTaskDetail(task) {
    document.getElementById('taskModalTitle').textContent = escapeHtml(task.title);
    
    const taskInfo = document.getElementById('taskInfo');
    taskInfo.innerHTML = `
        <div class="task-detail">
            <p><strong>Title:</strong> ${escapeHtml(task.title)}</p>
            <p><strong>Project:</strong> ${escapeHtml(task.project_name)}</p>
            <p><strong>Description:</strong> ${escapeHtml(task.description || 'N/A')}</p>
            <p><strong>Status:</strong> <span class="badge badge-status-${task.status}">${getStatusLabel(task.status)}</span></p>
            <p><strong>Priority:</strong> <span class="badge badge-priority-${task.priority}">${getPriorityLabel(task.priority)}</span></p>
            <p><strong>Assigned To:</strong> ${task.assigned_to_email ? escapeHtml(task.assigned_to_email) : 'Unassigned'}</p>
            <p><strong>Created:</strong> ${new Date(task.created_at).toLocaleDateString()}</p>
            <p><strong>Updated:</strong> ${new Date(task.updated_at).toLocaleDateString()}</p>
        </div>
    `;
}

function displayTaskActions(task) {
    const actionsDiv = document.getElementById('taskActions');
    const editSection = document.getElementById('taskEditSection');
    let actions = '';
    
    // Check user role in the task's project
    const userRole = task.user_project_role || 'member';
    
    if (userRole === 'owner' || userRole === 'admin' || userRole === 'moderator') {
        actions += `
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="showTaskEditForm(true)">Edit Task</button>
                <button class="btn btn-danger" onclick="deleteTask(${task.id})">Delete Task</button>
            </div>
        `;
        editSection.style.display = 'block';
        populateTaskEditForm(task);
    } else {
        actions += `
            <div class="action-buttons">
                <p>Member - View only</p>
            </div>
        `;
        editSection.style.display = 'none';
    }
    
    actionsDiv.innerHTML = actions;
}

function populateTaskEditForm(task) {
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDesc').value = task.description || '';
    document.getElementById('editTaskStatus').value = task.status;
    document.getElementById('editTaskPriority').value = task.priority;
}

function showTaskEditForm(show) {
    document.getElementById('taskEditSection').style.display = show ? 'block' : 'none';
}

async function handleUpdateTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('editTaskTitle').value.trim();
    const description = document.getElementById('editTaskDesc').value.trim();
    const status = document.getElementById('editTaskStatus').value;
    const priority = document.getElementById('editTaskPriority').value;
    
    if (!title) {
        showFieldError(document.getElementById('updateTaskMessage'), 'Title is required');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${currentTaskId}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                status,
                priority
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showFieldError(document.getElementById('updateTaskMessage'),
                data.title ? data.title[0] : 'Failed to update task');
            return;
        }
        
        showSuccess('Task updated successfully!');
        closeTaskModal();
        loadTasks();
    } catch (error) {
        console.error('Error updating task:', error);
        showError('Failed to update task');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete task');
        
        showSuccess('Task deleted successfully!');
        closeTaskModal();
        loadTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task');
    }
}

// ===== Filters =====
function applyFilters() {
    const statusFilter = document.getElementById('filterStatus').value;
    const priorityFilter = document.getElementById('filterPriority').value;
    const searchFilter = document.getElementById('filterSearch').value.toLowerCase();
    
    filteredTasks = allTasks.filter(task => {
        const matchStatus = !statusFilter || task.status === statusFilter;
        const matchPriority = !priorityFilter || task.priority === priorityFilter;
        const matchSearch = !searchFilter || 
            task.title.toLowerCase().includes(searchFilter) ||
            (task.description && task.description.toLowerCase().includes(searchFilter));
        
        return matchStatus && matchPriority && matchSearch;
    });
    
    displayTasks(filteredTasks);
}

// ===== Modal =====
function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentTaskId = null;
    currentUserRole = null;
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById('taskModal');
    if (event.target === modal) {
        closeTaskModal();
    }
});

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isAuthenticated() {
    return !!getAccessToken();
}

function getAccessToken() {
    return localStorage.getItem('access_token');
}

function logoutUser() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userEmail');
    window.location.href = 'login.html';
}

function showSuccess(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-success';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showError(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-error';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showFieldError(messageDiv, message) {
    messageDiv.innerHTML = `<div class="alert alert-error">${escapeHtml(message)}</div>`;
}
