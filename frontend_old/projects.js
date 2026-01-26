/**
 * Projects Management Frontend
 * Handles project creation, member management, and role-based UI
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';
let currentProjectId = null;
let currentUserRole = null;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', function() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Event listeners
    document.getElementById('createProjectForm').addEventListener('submit', handleCreateProject);
    document.getElementById('addProjectMemberForm').addEventListener('submit', handleAddMember);
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // Load organizations and projects
    loadOrganizations();
    loadProjects();
});

// ===== Organizations =====
async function loadOrganizations() {
    try {
        const response = await fetch(`${API_BASE_URL}/orgs/`, {
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load organizations');
        
        const orgs = await response.json();
        populateOrgSelect(orgs);
    } catch (error) {
        console.error('Error loading organizations:', error);
    }
}

function populateOrgSelect(orgs) {
    const select = document.getElementById('orgSelect');
    orgs.forEach(org => {
        const option = document.createElement('option');
        option.value = org.id;
        option.textContent = org.name;
        select.appendChild(option);
    });
}

// ===== Projects Management =====
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/projects/`, {
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load projects');
        
        const projects = await response.json();
        displayProjects(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
        showError('Failed to load projects');
    }
}

function displayProjects(projects) {
    const projectsList = document.getElementById('projectsList');
    
    if (projects.length === 0) {
        projectsList.innerHTML = '<p class="no-data">No projects yet. Create one above!</p>';
        return;
    }
    
    projectsList.innerHTML = projects.map(project => `
        <div class="project-card" onclick="openProjectDetail(${project.id})">
            <h3>${escapeHtml(project.name)}</h3>
            <p class="project-org">📦 ${escapeHtml(project.organization_name)}</p>
            <p class="project-desc">${escapeHtml(project.description || 'No description')}</p>
            <div class="project-meta">
                <span class="badge badge-${project.user_role}">${project.user_role || 'N/A'}</span>
                <span class="badge">${project.member_count} members</span>
                <span class="badge">${project.task_count} tasks</span>
            </div>
            <small>Owner: ${project.owner_email || 'N/A'}</small>
        </div>
    `).join('');
}

async function handleCreateProject(e) {
    e.preventDefault();
    
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDesc').value.trim();
    const org_id = document.getElementById('orgSelect').value;
    
    if (!name || !org_id) {
        showFieldError('Organization and Project name are required');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description,
                organization_id: parseInt(org_id)
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showFieldError(data.name ? data.name[0] : 'Failed to create project');
            return;
        }
        
        showSuccess('Project created successfully!');
        document.getElementById('createProjectForm').reset();
        loadProjects();
    } catch (error) {
        console.error('Error creating project:', error);
        showError('Failed to create project');
    }
}

// ===== Project Detail =====
async function openProjectDetail(projectId) {
    currentProjectId = projectId;
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/`, {
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load project');
        
        const project = await response.json();
        currentUserRole = project.user_role;
        displayProjectDetail(project);
        displayProjectActions(project);
        await loadProjectMembers(projectId);
        
        document.getElementById('projectModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading project:', error);
        showError('Failed to load project details');
    }
}

function displayProjectDetail(project) {
    document.getElementById('modalTitle').textContent = escapeHtml(project.name);
    
    const projectInfo = document.getElementById('projectInfo');
    projectInfo.innerHTML = `
        <div class="project-detail">
            <p><strong>Name:</strong> ${escapeHtml(project.name)}</p>
            <p><strong>Organization:</strong> ${escapeHtml(project.organization_name)}</p>
            <p><strong>Description:</strong> ${escapeHtml(project.description || 'N/A')}</p>
            <p><strong>Owner:</strong> ${project.owner_email || 'N/A'}</p>
            <p><strong>Your Role:</strong> <span class="badge badge-${project.user_role}">${project.user_role}</span></p>
            <p><strong>Members:</strong> ${project.member_count}</p>
            <p><strong>Tasks:</strong> ${project.task_count}</p>
            <p><strong>Status:</strong> ${project.status}</p>
            <p><strong>Created:</strong> ${new Date(project.created_at).toLocaleDateString()}</p>
        </div>
    `;
}

function displayProjectActions(project) {
    const actionsDiv = document.getElementById('projectActions');
    let actions = '';
    
    if (currentUserRole === 'owner') {
        actions += `
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="showAddMemberSection(true)">+ Add Member</button>
                <button class="btn btn-secondary" onclick="editProject(${project.id})">Edit Project</button>
                <button class="btn btn-danger" onclick="deleteProject(${project.id})">Delete Project</button>
            </div>
        `;
    } else if (currentUserRole === 'admin') {
        actions += `
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="showAddMemberSection(true)">+ Add Member</button>
                <button class="btn btn-secondary" onclick="editProject(${project.id})">Edit Project</button>
            </div>
        `;
    } else if (currentUserRole === 'moderator') {
        actions += `
            <div class="action-buttons">
                <button class="btn btn-secondary" onclick="goToTasks(${project.id})">Manage Tasks</button>
            </div>
        `;
    } else {
        actions += `
            <div class="action-buttons">
                <p>Member - View only</p>
            </div>
        `;
    }
    
    actionsDiv.innerHTML = actions;
    
    // Show/hide add member section
    const addMemberSection = document.getElementById('addMemberSection');
    if (currentUserRole === 'owner' || currentUserRole === 'admin') {
        addMemberSection.style.display = 'block';
    } else {
        addMemberSection.style.display = 'none';
    }
}

function showAddMemberSection(show) {
    document.getElementById('addMemberSection').style.display = show ? 'block' : 'none';
}

// ===== Project Members =====
async function loadProjectMembers(projectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members/`, {
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load members');
        
        const members = await response.json();
        displayProjectMembers(members, projectId);
    } catch (error) {
        console.error('Error loading members:', error);
        showError('Failed to load members');
    }
}

function displayProjectMembers(members, projectId) {
    const membersList = document.getElementById('membersList');
    
    if (members.length === 0) {
        membersList.innerHTML = '<p>No members in this project</p>';
        return;
    }
    
    membersList.innerHTML = members.map(member => `
        <div class="member-item">
            <div class="member-info">
                <p class="member-name">${escapeHtml(member.user_name)}</p>
                <p class="member-email">${escapeHtml(member.user_email)}</p>
            </div>
            <div class="member-actions">
                <span class="badge badge-${member.role}">${escapeHtml(member.role_display)}</span>
                ${(currentUserRole === 'owner') ? `<button class="btn btn-sm btn-danger" onclick="removeProjectMember('${member.user_email}', ${projectId})">Remove</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function handleAddMember(e) {
    e.preventDefault();
    
    const email = document.getElementById('memberEmail').value.trim();
    const role = document.getElementById('memberRole').value;
    
    if (!currentProjectId || !email) {
        showFieldError('Email is required');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${currentProjectId}/add_member/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, role })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showFieldError(data.detail || data.email?.[0] || 'Failed to add member');
            return;
        }
        
        showSuccess('Member added successfully!');
        document.getElementById('addProjectMemberForm').reset();
        await loadProjectMembers(currentProjectId);
    } catch (error) {
        console.error('Error adding member:', error);
        showError('Failed to add member');
    }
}

async function removeProjectMember(email, projectId) {
    if (!confirm(`Remove ${email} from project?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/remove_member/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) throw new Error('Failed to remove member');
        
        showSuccess('Member removed successfully!');
        await loadProjectMembers(projectId);
    } catch (error) {
        console.error('Error removing member:', error);
        showError('Failed to remove member');
    }
}

// ===== Navigation Functions =====
function goToTasks(projectId) {
    window.location.href = `tasks.html?project_id=${projectId}`;
}

function editProject(projectId) {
    alert('Edit project feature coming soon!');
}

async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete project');
        
        showSuccess('Project deleted successfully!');
        closeModal();
        loadProjects();
    } catch (error) {
        console.error('Error deleting project:', error);
        showError('Failed to delete project');
    }
}

function closeModal() {
    document.getElementById('projectModal').style.display = 'none';
    currentProjectId = null;
    currentUserRole = null;
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById('projectModal');
    if (event.target === modal) {
        closeModal();
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

function showFieldError(message) {
    const messageDiv = document.getElementById('createProjectMessage') || 
                       document.getElementById('addMemberMessage');
    if (messageDiv) {
        messageDiv.innerHTML = `<div class="alert alert-error">${escapeHtml(message)}</div>`;
    } else {
        showError(message);
    }
}
