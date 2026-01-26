/**
 * NavFlow Frontend - Core Application Library
 * 
 * Provides:
 * - JWT Token Management
 * - API Communication with Bearer Authentication
 * - Authentication & User Management
 * - UI Utilities (messages, loading states)
 * - Page Initialization
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

let CURRENT_USER = null;
let ACTIVE_ORG_ID = null;

// Get and set active organization
function setActiveOrg(orgId) {
    ACTIVE_ORG_ID = orgId;
    if (orgId) {
        localStorage.setItem('active_org_id', orgId);
    }
}

function getActiveOrg() {
    if (ACTIVE_ORG_ID) return ACTIVE_ORG_ID;
    const stored = localStorage.getItem('active_org_id');
    if (stored) {
        ACTIVE_ORG_ID = stored;
    }
    return ACTIVE_ORG_ID;
}

function clearActiveOrg() {
    ACTIVE_ORG_ID = null;
    localStorage.removeItem('active_org_id');
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

function setAccessToken(token) {
    if (token) localStorage.setItem('access_token', token);
}

function getAccessToken() {
    return localStorage.getItem('access_token');
}

function setRefreshToken(token) {
    if (token) localStorage.setItem('refresh_token', token);
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

function isAuthenticated() {
    return !!getAccessToken();
}

// ============================================
// API COMMUNICATION
// ============================================

/**
 * Make an API request with JWT authentication
 * @param {string} endpoint - API endpoint path (e.g., /organizations/)
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {object} data - Request body data
 * @returns {Promise<object>} - Response JSON
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_V1}${endpoint}`;
    const token = getAccessToken();
    
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(data);
    }

    try {
        console.log(`${method} ${url}`, data);
        const response = await fetch(url, options);
        
        // Handle unauthorized - redirect to login
        if (response.status === 401) {
            clearTokens();
            window.location.href = 'login-new.html';
            return null;
        }

        const contentType = response.headers.get('content-type');
        let responseData;
        
        // Check if response is JSON or HTML
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            // If not JSON, it's likely an error page (HTML)
            const text = await response.text();
            if (!response.ok) {
                throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
            }
            responseData = { message: text };
        }
        
        console.log('Response:', responseData);

        if (!response.ok) {
            // Extract meaningful error message
            let errorMsg = 'API Error: ' + response.status;
            
            if (responseData.detail) {
                errorMsg = responseData.detail;
            } else if (responseData.error) {
                errorMsg = responseData.error;
            } else if (responseData.message) {
                errorMsg = responseData.message;
            } else if (typeof responseData === 'object') {
                // Handle validation errors (e.g., email already exists)
                const firstKey = Object.keys(responseData)[0];
                if (firstKey && responseData[firstKey]) {
                    const errorValue = responseData[firstKey];
                    errorMsg = Array.isArray(errorValue) ? errorValue[0] : errorValue;
                }
            }
            
            throw new Error(errorMsg);
        }

        return responseData;
    } catch (error) {
        console.error(`API Error (${method} ${url}):`, error);
        throw error;
    }
}

// ============================================
// AUTHENTICATION
// ============================================

async function registerUser() {
    hideAllMessages();

    const email = document.getElementById('regEmail')?.value.trim();
    const firstName = document.getElementById('firstName')?.value.trim();
    const lastName = document.getElementById('lastName')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const passwordConfirm = document.getElementById('confirmPassword')?.value;

    if (!email || !firstName || !lastName || !password || !passwordConfirm) {
        showError('All fields are required');
        return;
    }

    if (password.length < 8) {
        showFieldError('regPassword', 'Password must be at least 8 characters');
        return;
    }

    if (password !== passwordConfirm) {
        showFieldError('confirmPassword', 'Passwords do not match');
        return;
    }

    const btn = document.getElementById('registerBtn');
    if (btn) btn.disabled = true;

    try {
        const data = await apiRequest('/auth/register/', 'POST', {
            email,
            first_name: firstName,
            last_name: lastName,
            password,
            password_confirm: passwordConfirm
        });

        // Handle nested token structure from registration
        const accessToken = data.tokens?.access || data.access;
        const refreshToken = data.tokens?.refresh || data.refresh;
        
        if (!accessToken) {
            throw new Error('No access token in response');
        }

        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        localStorage.setItem('user_email', email);
        showSuccess('Registration successful! Redirecting...');
        setTimeout(() => { window.location.href = 'dashboard-new.html'; }, 1500);
    } catch (error) {
        showError(error.message || 'Registration failed');
        console.error('Registration error:', error);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function loginUser() {
    hideAllMessages();

    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
        showError('Email and password required');
        return;
    }

    const btn = document.getElementById('loginBtn');
    if (btn) btn.disabled = true;

    try {
        const data = await apiRequest('/auth/login/', 'POST', { email, password });
        setAccessToken(data.access);
        setRefreshToken(data.refresh);
        localStorage.setItem('user_email', email);
        showSuccess('Login successful! Redirecting...');
        setTimeout(() => { window.location.href = 'dashboard-new.html'; }, 1500);
    } catch (error) {
        showError(error.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function logoutUser() {
    if (!confirm('Logout?')) return;
    clearTokens();
    clearActiveOrg();
    localStorage.removeItem('user_email');
    window.location.href = 'index-new.html';
}

async function getCurrentUser() {
    if (!isAuthenticated()) return null;
    try {
        CURRENT_USER = await apiRequest('/auth/user/', 'GET');
        return CURRENT_USER;
    } catch (error) {
        console.error('Failed to get user:', error);
        return null;
    }
}

// ============================================
// PAGE PROTECTION
// ============================================

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login-new.html';
        return false;
    }
    return true;
}

// ============================================
// UI UTILITIES
// ============================================

function showSuccess(message) {
    const box = document.getElementById('successMessage');
    const text = document.getElementById('successText');
    if (box && text) {
        text.textContent = message;
        box.style.display = 'block';
        box.classList.add('show');
        console.log('Success:', message);
        setTimeout(() => { 
            box.style.display = 'none'; 
            box.classList.remove('show');
        }, 5000);
    }
}

function showError(message) {
    const box = document.getElementById('errorMessage');
    const text = document.getElementById('errorText');
    if (box && text) {
        text.textContent = message;
        box.style.display = 'block';
        box.classList.add('show');
        console.error('Error:', message);
        setTimeout(() => { 
            box.style.display = 'none'; 
            box.classList.remove('show');
        }, 5000);
    }
}

function showFieldError(fieldId, message) {
    const el = document.getElementById(fieldId);
    if (el) el.textContent = message;
}

function hideAllMessages() {
    const successBox = document.getElementById('successMessage');
    const errorBox = document.getElementById('errorMessage');
    if (successBox) successBox.style.display = 'none';
    if (errorBox) errorBox.style.display = 'none';
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '<p class="loading">Loading...</p>';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ============================================
// SIDEBAR & NAVIGATION
// ============================================

function initSidebar() {
    if (!isAuthenticated()) return;

    // Display user email
    const userEmail = localStorage.getItem('user_email');
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl && userEmail) {
        userEmailEl.textContent = userEmail;
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }

    // Mark active nav item
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard-new.html';
    document.querySelectorAll('.nav-item, .sidebar-nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-close')) {
            closeModal(e.target.closest('.modal').id);
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ============================================
// PAGE INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();

    const protectedPages = ['dashboard-new.html', 'dashboard.html', 'organizations-new.html', 'organizations.html', 'projects-new.html', 'projects.html', 'tasks-new.html', 'tasks.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        if (!requireAuth()) return;
    }

    // Call page-specific init
    if (typeof initPage === 'function') {
        initPage();
    }
});
