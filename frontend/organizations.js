/**
 * Organizations Management Frontend
 * Handles creating organizations, viewing members, and adding members
 */

const API_BASE_URL = 'http://localhost:8000/api/v1/orgs';
let currentOrgId = null;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Set up event listeners
    document.getElementById('createOrgForm').addEventListener('submit', handleCreateOrg);
    document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    
    // Modal close button
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // Load organizations
    loadOrganizations();
});

// ===== Organization Management =====
async function loadOrganizations() {
    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load organizations');
        }
        
        const orgs = await response.json();
        displayOrganizations(orgs);
    } catch (error) {
        console.error('Error loading organizations:', error);
        showError('Failed to load organizations');
    }
}

function displayOrganizations(orgs) {
    const orgsList = document.getElementById('orgsList');
    
    if (orgs.length === 0) {
        orgsList.innerHTML = '<p class="no-data">No organizations yet. Create one above!</p>';
        return;
    }
    
    orgsList.innerHTML = orgs.map(org => `
        <div class="org-card" onclick="openOrgDetail(${org.id})">
            <h3>${escapeHtml(org.name)}</h3>
            <p class="org-desc">${escapeHtml(org.description || 'No description')}</p>
            <div class="org-meta">
                <span class="badge">${org.member_count} members</span>
                <span class="badge ${getRoleBadgeClass(org.user_role)}">${org.user_role || 'N/A'}</span>
            </div>
            <small>Owner: ${org.owner_email || 'N/A'}</small>
        </div>
    `).join('');
}

function getRoleBadgeClass(role) {
    const classes = {
        'owner': 'badge-owner',
        'admin': 'badge-admin',
        'member': 'badge-member'
    };
    return classes[role] || '';
}

async function handleCreateOrg(e) {
    e.preventDefault();
    
    const name = document.getElementById('orgName').value.trim();
    const description = document.getElementById('orgDescription').value.trim();
    
    if (!name) {
        showFieldError('Organization name is required');
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL + '/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showFieldError(data.name ? data.name[0] : 'Failed to create organization');
            return;
        }
        
        showSuccess('Organization created successfully!');
        document.getElementById('createOrgForm').reset();
        loadOrganizations();
    } catch (error) {
        console.error('Error creating organization:', error);
        showError('Failed to create organization');
    }
}

// ===== Organization Detail Modal =====
async function openOrgDetail(orgId) {
    currentOrgId = orgId;
    
    try {
        const response = await fetch(`${API_BASE_URL}/${orgId}/`, {
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load organization');
        }
        
        const org = await response.json();
        displayOrgDetail(org);
        
        // Load members
        await loadMembers(orgId);
        
        // Show modal
        document.getElementById('orgModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading organization:', error);
        showError('Failed to load organization details');
    }
}

function displayOrgDetail(org) {
    document.getElementById('modalTitle').textContent = escapeHtml(org.name);
    
    const orgInfo = document.getElementById('orgInfo');
    orgInfo.innerHTML = `
        <div class="org-detail">
            <p><strong>Name:</strong> ${escapeHtml(org.name)}</p>
            <p><strong>Description:</strong> ${escapeHtml(org.description || 'N/A')}</p>
            <p><strong>Owner:</strong> ${org.owner_email || 'N/A'}</p>
            <p><strong>Members:</strong> ${org.member_count}</p>
            <p><strong>Created:</strong> ${new Date(org.created_at).toLocaleDateString()}</p>
        </div>
    `;
    
    // Show add member section if user is admin or owner
    const userRole = org.members.find(m => m.user_email === getCurrentUserEmail())?.role;
    const addMemberSection = document.getElementById('addMemberSection');
    if (userRole === 'admin' || userRole === 'owner') {
        addMemberSection.style.display = 'block';
    } else {
        addMemberSection.style.display = 'none';
    }
}

// ===== Members Management =====
async function loadMembers(orgId) {
    try {
        const response = await fetch(`${API_BASE_URL}/${orgId}/members/`, {
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load members');
        }
        
        const members = await response.json();
        displayMembers(members);
    } catch (error) {
        console.error('Error loading members:', error);
        showError('Failed to load members');
    }
}

function displayMembers(members) {
    const membersList = document.getElementById('membersList');
    
    if (members.length === 0) {
        membersList.innerHTML = '<p>No members in this organization</p>';
        return;
    }
    
    membersList.innerHTML = members.map(member => `
        <div class="member-item">
            <div class="member-info">
                <p class="member-name">${escapeHtml(member.user_name)}</p>
                <p class="member-email">${escapeHtml(member.user_email)}</p>
            </div>
            <span class="badge ${getRoleBadgeClass(member.role)}">${escapeHtml(member.role_display)}</span>
        </div>
    `).join('');
}

async function handleAddMember(e) {
    e.preventDefault();
    
    const email = document.getElementById('memberEmail').value.trim();
    const role = document.getElementById('memberRole').value;
    
    if (!currentOrgId || !email) {
        showFieldError('Email is required');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/${currentOrgId}/add_member/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, role })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showFieldError(
                data.detail || 
                data.email ? data.email[0] : 
                data.role ? data.role[0] :
                'Failed to add member'
            );
            return;
        }
        
        showSuccess('Member added successfully!');
        document.getElementById('addMemberForm').reset();
        
        // Reload members
        await loadMembers(currentOrgId);
    } catch (error) {
        console.error('Error adding member:', error);
        showError('Failed to add member');
    }
}

function closeModal() {
    document.getElementById('orgModal').style.display = 'none';
    currentOrgId = null;
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('orgModal');
    if (event.target === modal) {
        closeModal();
    }
});

// ===== Utility Functions =====
function getCurrentUserEmail() {
    // This would need to be fetched from the API or stored during login
    // For now, we'll try to get it from localStorage if saved during auth
    return localStorage.getItem('userEmail') || '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Authentication & Messages =====
function isAuthenticated() {
    return !!getAccessToken();
}

function getAccessToken() {
    return localStorage.getItem('accessToken');
}

function setAccessToken(token) {
    localStorage.setItem('accessToken', token);
}

function logoutUser() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    window.location.href = 'login.html';
}

function showSuccess(message) {
    console.log('Success:', message);
    // Create temporary message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-success';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showError(message) {
    console.error('Error:', message);
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-error';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showFieldError(message) {
    const messageDiv = document.getElementById('createOrgMessage') || 
                       document.getElementById('addMemberMessage');
    if (messageDiv) {
        messageDiv.innerHTML = `<div class="alert alert-error">${escapeHtml(message)}</div>`;
    } else {
        showError(message);
    }
}
