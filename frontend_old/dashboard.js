/**
 * Dashboard Frontend
 * Displays user profile and statistics about organizations, projects, and tasks
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', function() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    displayUserEmail();
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    
    // Load all data
    loadUserProfile();
    loadStats();
});

function displayUserEmail() {
    const email = localStorage.getItem('userEmail');
    if (email) {
        document.getElementById('userEmail').textContent = email;
    }
}

// ===== User Profile =====
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/user/`, {
            headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load user profile');
        
        const data = await response.json();
        displayUserProfile(data);
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('userInfo').innerHTML = 
            '<p class="error">Failed to load profile information</p>';
    }
}

function displayUserProfile(data) {
    const fullName = `${data.first_name} ${data.last_name}`.trim() || 'User';
    document.getElementById('welcomeMessage').textContent = 
        `Welcome back, ${fullName}! 👋`;
    
    const userInfoHtml = `
        <div class="info-row">
            <span class="label">Email:</span>
            <span class="value">${escapeHtml(data.email)}</span>
        </div>
        <div class="info-row">
            <span class="label">Name:</span>
            <span class="value">${escapeHtml(fullName)}</span>
        </div>
        <div class="info-row">
            <span class="label">Member Since:</span>
            <span class="value">${new Date(data.date_joined).toLocaleDateString()}</span>
        </div>
        <div class="info-row">
            <span class="label">Last Login:</span>
            <span class="value">${data.last_login ? new Date(data.last_login).toLocaleString() : 'N/A'}</span>
        </div>
    `;
    
    document.getElementById('userInfo').innerHTML = userInfoHtml;
}

// ===== Stats =====
async function loadStats() {
    try {
        const [orgResponse, projectResponse, taskResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/orgs/`, {
                headers: { 'Authorization': `Bearer ${getAccessToken()}` }
            }),
            fetch(`${API_BASE_URL}/projects/`, {
                headers: { 'Authorization': `Bearer ${getAccessToken()}` }
            }),
            fetch(`${API_BASE_URL}/tasks/`, {
                headers: { 'Authorization': `Bearer ${getAccessToken()}` }
            })
        ]);
        
        const orgs = await orgResponse.json();
        const projects = await projectResponse.json();
        const tasks = await taskResponse.json();
        
        displayStats(orgs, projects, tasks);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function displayStats(orgs, projects, tasks) {
    document.getElementById('orgCount').textContent = orgs.length || 0;
    document.getElementById('projectCount').textContent = projects.length || 0;
    document.getElementById('taskCount').textContent = tasks.length || 0;
    
    // Count pending tasks (not done)
    const pendingTasks = tasks.filter(task => task.status !== 'done').length;
    document.getElementById('pendingTaskCount').textContent = pendingTasks || 0;
}

// ===== Utility Functions =====
function escapeHtml(text) {
    if (!text) return '';
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
