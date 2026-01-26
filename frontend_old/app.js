/**
 * NavFlow Frontend - Main Application JavaScript
 * 
 * Core utilities:
 * - JWT token management (localStorage)
 * - API communication with Bearer tokens
 * - Authentication & authorization
 * - Message display
 * - Page routing & initialization
 */

// ============================================
// Configuration
// ============================================

const API_BASE_URL = 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

let ACTIVE_ORG_ID = null;
let CURRENT_USER = null;

// ============================================
// Token Management
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
    localStorage.removeItem('user_id');
}

function isAuthenticated() {
    return !!getAccessToken();
}

// ============================================
// API Communication
// ============================================

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

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        
        if (response.status === 401) {
            clearTokens();
            window.location.href = '/login.html';
            return null;
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || responseData.message || `API Error: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// Registration
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
        showFieldError('passwordError', 'Password must be at least 8 characters');
        return;
    }

    if (password !== passwordConfirm) {
        showFieldError('confirmPasswordError', 'Passwords do not match');
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

        if (data.access) {
            setAccessToken(data.access);
            setRefreshToken(data.refresh);
            localStorage.setItem('user_email', email);
            showSuccess('Registration successful! Redirecting...');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
        }
    } catch (error) {
        showError(error.message || 'Registration failed');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ============================================
// Login
// ============================================

/**
 * Register a new user
 * Collects form data, validates it, and sends to backend
 */
function registerUser() {
    // Clear previous messages
    hideAllMessages();

    // Get form elements
    const form = document.getElementById('registerForm');
    const email = document.getElementById('regEmail').value.trim();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('confirmPassword').value;

    // Basic client-side validation
    if (!email || !firstName || !lastName || !password || !passwordConfirm) {
        showError('All fields are required');
        return;
    }

    if (password.length < 8) {
        showFieldError('passwordError', 'Password must be at least 8 characters');
        return;
    }

    if (password !== passwordConfirm) {
        showFieldError('confirmPasswordError', 'Passwords do not match');
        return;
    }

    // Disable submit button to prevent multiple clicks
    document.getElementById('registerBtn').disabled = true;

    // Prepare request payload
    const payload = {
        email: email,
        first_name: firstName,
        last_name: lastName,
        password: password,
        password_confirm: passwordConfirm
    };

    // Send registration request to backend
    fetch(`${API_AUTH_URL}/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.tokens && data.tokens.access) {
            // Registration successful - store tokens
            setAccessToken(data.tokens.access);
            setRefreshToken(data.tokens.refresh);
            
            // Store user email for use in other pages
            localStorage.setItem('userEmail', email);

            // Show success message
            showSuccess('Registration successful! Redirecting to dashboard...');

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else if (data.email || data.password || data.password_confirm) {
            // Show field-specific errors
            if (data.email) {
                showFieldError('emailError', Array.isArray(data.email) ? data.email[0] : data.email);
            }
            if (data.password) {
                showFieldError('passwordError', Array.isArray(data.password) ? data.password[0] : data.password);
            }
            if (data.password_confirm) {
                showFieldError('confirmPasswordError', Array.isArray(data.password_confirm) ? data.password_confirm[0] : data.password_confirm);
            }
        } else {
            // Generic error
            showError('Registration failed. Please try again.');
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        showError('An error occurred during registration. Please try again.');
    })
    .finally(() => {
        // Re-enable submit button
        document.getElementById('registerBtn').disabled = false;
    });
}

/**
 * Login user with email and password
 * Sends credentials to backend and stores JWT tokens
 */
function loginUser() {
    // Clear previous messages
    hideAllMessages();

    // Get form elements
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Basic validation
    if (!email || !password) {
        showError('Email and password are required');
        return;
    }

    // Disable submit button to prevent multiple clicks
    document.getElementById('loginBtn').disabled = true;

    // Prepare request payload
    const payload = {
        email: email,
        password: password
    };

    // Send login request to backend
    fetch(`${API_AUTH_URL}/login/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.access && data.refresh) {
            // Login successful - store tokens
            setAccessToken(data.access);
            setRefreshToken(data.refresh);
            
            // Store user email for use in other pages
            localStorage.setItem('userEmail', email);

            // Show success message
            showSuccess('Login successful! Redirecting to dashboard...');

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else if (data.detail) {
            // API returned an error detail
            showError(data.detail);
        } else {
            // Generic error
            showError('Login failed. Please try again.');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showError('An error occurred during login. Please try again.');
    })
    .finally(() => {
        // Re-enable submit button
        document.getElementById('loginBtn').disabled = false;
    });
}

// ============================================
// Logout
// ============================================

/**
 * Logout user by clearing tokens and redirecting to home
 */
function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear tokens from storage
        clearTokens();
        
        // Clear user email
        localStorage.removeItem('userEmail');

        // Show message
        alert('You have been logged out successfully.');

        // Redirect to home page
        window.location.href = 'index.html';
    }
}

// ============================================
// Authentication Status
// ============================================

/**
 * Check authentication status and update UI
 * - Show logout button if authenticated
 * - Hide logout button if not authenticated
 */
function checkAuthStatus() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    if (isAuthenticated()) {
        logoutBtn.style.display = 'inline-block';
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
        });
    } else {
        logoutBtn.style.display = 'none';
    }
}

// ============================================
// API Status Check
// ============================================

/**
 * Check if the backend API is running
 * Fetches the homepage endpoint and displays status
 */
function checkAPIStatus() {
    const statusBox = document.getElementById('apiStatus');
    if (!statusBox) return;

    fetch(`${API_BASE_URL}/`)
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                statusBox.innerHTML = `
                    <p style="color: green;">✅ ${data.message}</p>
                    <p style="font-size: 0.9em; color: #666;">API Version: ${data.version}</p>
                `;
            }
        })
        .catch(error => {
            console.error('API status check failed:', error);
            statusBox.innerHTML = `
                <p style="color: red;">❌ API is not responding</p>
                <p style="font-size: 0.9em; color: #666;">Make sure the backend is running: python manage.py runserver</p>
            `;
        });
}

// ============================================
// Message Display Functions
// ============================================

/**
 * Show success message
 * @param {string} message - Success message text
 */
function showSuccess(message) {
    const successBox = document.getElementById('successMessage');
    const successText = document.getElementById('successText');

    if (successBox && successText) {
        successText.textContent = message;
        successBox.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            successBox.style.display = 'none';
        }, 5000);
    }
}

/**
 * Show error message
 * @param {string} message - Error message text
 */
function showError(message) {
    const errorBox = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (errorBox && errorText) {
        errorText.textContent = message;
        errorBox.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorBox.style.display = 'none';
        }, 5000);
    }
}

/**
 * Show field-specific error
 * @param {string} fieldId - HTML ID of the error span
 * @param {string} message - Error message text
 */
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

/**
 * Clear all error messages
 */
function hideAllMessages() {
    // Hide main alert messages
    const successBox = document.getElementById('successMessage');
    const errorBox = document.getElementById('errorMessage');

    if (successBox) successBox.style.display = 'none';
    if (errorBox) errorBox.style.display = 'none';

    // Clear field error messages
    const fieldErrors = document.querySelectorAll('.field-error');
    fieldErrors.forEach(error => {
        error.textContent = '';
    });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format date for display
 * @param {string} dateString - ISO date string from API
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

/**
 * Check if email is valid format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
