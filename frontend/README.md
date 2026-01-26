# NavFlow Frontend - Minimal Authentication UI

A clean, minimal frontend for the NavFlow Django REST API authentication system. Built with vanilla HTML, CSS, and JavaScript (no frameworks).

## 🎯 Overview

This frontend provides:
- ✅ User registration form
- ✅ User login form
- ✅ Dashboard (protected page)
- ✅ JWT token management
- ✅ Error handling and validation
- ✅ Success/error messages
- ✅ Responsive design
- ✅ No password logging
- ✅ Secure token storage

## 📁 File Structure

```
frontend/
├── index.html           # Homepage with API status
├── register.html        # Registration form
├── login.html           # Login form
├── dashboard.html       # Protected dashboard (after login)
├── app.js              # Main JavaScript logic
├── styles.css          # CSS styling
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Start Backend Server
```bash
cd e:\.Projects\NavFlow
python manage.py runserver
```

The backend will run at `http://localhost:8000`

### 2. Open Frontend
Simply open the HTML files in your browser:

```bash
# Open index.html in browser
start frontend/index.html
```

Or use any local server:

```bash
# Python 3
cd frontend
python -m http.server 8001

# Then open: http://localhost:8001
```

## 📖 Pages & Flows

### Homepage (index.html)
- Displays API status
- Shows available endpoints
- Links to registration and login
- Navigation menu

**Flow:**
```
User visits homepage
     ↓
Checks API status
     ↓
Shows links to register/login
```

### Registration Page (register.html)
- Email field
- First name field
- Last name field
- Password field (min 8 chars)
- Confirm password field
- Success/error messages
- Link to login page

**Registration Flow:**
```
User fills registration form
     ↓
Clicks "Create Account"
     ↓
Frontend validates form
     ↓
Sends POST /api/v1/auth/register/
     ↓
Backend validates & creates user
     ↓
Backend returns tokens
     ↓
Frontend stores tokens in localStorage
     ↓
Redirects to dashboard
```

### Login Page (login.html)
- Email field
- Password field
- Success/error messages
- Link to registration page

**Login Flow:**
```
User fills login form
     ↓
Clicks "Login"
     ↓
Frontend validates form
     ↓
Sends POST /api/v1/auth/login/
     ↓
Backend authenticates user
     ↓
Backend returns tokens
     ↓
Frontend stores tokens in localStorage
     ↓
Redirects to dashboard
```

### Dashboard Page (dashboard.html)
- Welcome message with user name
- User profile information (email, name, member since, last login)
- Quick actions (refresh profile, copy token)
- Logout button
- Only accessible if authenticated

**Dashboard Flow:**
```
User navigates to dashboard
     ↓
Check if access token exists
     ↓
If no token → redirect to login
     ↓
If token exists → load user profile
     ↓
Send GET /api/v1/auth/user/ with token
     ↓
Display user information
```

## 🔐 Security Features

### Token Storage
- Access token stored in `localStorage`
- Refresh token stored in `localStorage`
- Tokens automatically included in requests

### Security Practices
- ✅ Passwords never logged to console
- ✅ Tokens validated before use
- ✅ Error messages don't expose sensitive info
- ✅ Redirect to login if token missing
- ✅ Logout clears tokens

### Data Validation
- Email format validation
- Password minimum length (8 characters)
- Password confirmation check
- Required field validation

## 💻 API Integration

### Registration
```javascript
POST /api/v1/auth/register/

Request Body:
{
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!"
}

Response (201):
{
    "user": {...},
    "tokens": {
        "access": "eyJ0eXAi...",
        "refresh": "eyJ0eXAi..."
    }
}
```

### Login
```javascript
POST /api/v1/auth/login/

Request Body:
{
    "email": "user@example.com",
    "password": "SecurePass123!"
}

Response (200):
{
    "access": "eyJ0eXAi...",
    "refresh": "eyJ0eXAi...",
    "user": {...}
}
```

### Get User Profile
```javascript
GET /api/v1/auth/user/

Headers:
Authorization: Bearer {access_token}

Response (200):
{
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "date_joined": "2026-01-26T...",
    "last_login": "2026-01-26T..."
}
```

## 🛠️ JavaScript Functions

### Token Management
```javascript
// Store access token
setAccessToken(token)

// Get access token
getAccessToken()

// Store refresh token
setRefreshToken(token)

// Get refresh token
getRefreshToken()

// Clear all tokens (logout)
clearTokens()

// Check if authenticated
isAuthenticated()
```

### User Functions
```javascript
// Register new user
registerUser()

// Login user
loginUser()

// Logout user
logoutUser()
```

### Utility Functions
```javascript
// Show success message
showSuccess(message)

// Show error message
showError(message)

// Show field-specific error
showFieldError(fieldId, message)

// Hide all messages
hideAllMessages()

// Check API status
checkAPIStatus()

// Check authentication status
checkAuthStatus()
```

## 📝 Code Comments

Each JavaScript function includes detailed comments:
- Purpose description
- Parameter documentation
- Return value documentation
- Usage examples

Example:
```javascript
/**
 * Store access token in localStorage
 * @param {string} token - JWT access token
 */
function setAccessToken(token) {
    if (token) {
        localStorage.setItem('access_token', token);
    }
}
```

## 🎨 Styling

### CSS Features
- Clean, minimal design
- Responsive layout (mobile, tablet, desktop)
- Color scheme:
  - Primary: #007bff (blue)
  - Secondary: #6c757d (gray)
  - Danger: #dc3545 (red)
  - Success: #28a745 (green)
  - Error: #721c24 (dark red)

### Responsive Breakpoints
- Desktop: > 768px
- Tablet: 481px - 768px
- Mobile: ≤ 480px

## 🧪 Testing

### Test Registration
1. Open `register.html`
2. Fill in all fields:
   - Email: `test@example.com`
   - First Name: `Test`
   - Last Name: `User`
   - Password: `TestPass123!`
   - Confirm: `TestPass123!`
3. Click "Create Account"
4. See success message
5. Redirected to dashboard

### Test Login
1. Open `login.html`
2. Fill in credentials:
   - Email: `test@example.com`
   - Password: `TestPass123!`
3. Click "Login"
4. See success message
5. Redirected to dashboard

### Test Dashboard
1. After login, view user profile
2. Click "Refresh Profile" to reload
3. Click "Copy Access Token" to copy token
4. Click "Logout" to logout

### Test Error Handling
1. Try registering with duplicate email
2. Try logging in with wrong password
3. Try submitting form with missing fields
4. See field-specific error messages

## 🌐 Browser Compatibility

Works on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

Requires:
- localStorage support
- fetch API support
- ES6 JavaScript support

## ⚙️ Configuration

Edit the `app.js` file to configure:

```javascript
// Line 8-9: Change API URL if running on different port
const API_BASE_URL = 'http://localhost:8000';
const API_AUTH_URL = `${API_BASE_URL}/api/v1/auth`;
```

If running backend on different URL:
```javascript
const API_BASE_URL = 'http://192.168.1.100:8000';
```

## 📱 Features in Detail

### Message Display
- Auto-hide messages after 5 seconds
- Different styling for success/error
- Slide-in animation
- Field-specific error display

### Form Validation
- Client-side validation before sending
- Email format check
- Password length check (minimum 8)
- Password confirmation match
- Required field check
- Server response error handling

### User Experience
- Disable submit button while processing
- Loading state indicators
- Clear error messages
- Success confirmations
- Auto-redirect after successful login
- Logout confirmation dialog

### Token Management
- Automatic token inclusion in requests
- Token extraction from responses
- Token validation before use
- Token clearing on logout
- Token storage in localStorage

## 🐛 Troubleshooting

### "API is not responding"
- Ensure backend is running: `python manage.py runserver`
- Check if backend is on `http://localhost:8000`
- Check browser console for CORS errors

### Registration fails
- Ensure email doesn't exist
- Ensure password meets requirements
- Check backend logs for details

### Login fails
- Verify email is registered
- Verify password is correct
- Check if user is active (admin check)

### Dashboard shows "Failed to load profile"
- Verify token is stored in localStorage
- Check if token is expired
- Try logging in again

### Token not working
- Clear localStorage: `localStorage.clear()`
- Close browser tab and reopen
- Log in again to get fresh token

## 📚 Documentation Files

- [AUTH_DOCUMENTATION.md](../AUTH_DOCUMENTATION.md) - Backend API docs
- [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - Quick start guide
- [TEST_SCENARIOS.md](../TEST_SCENARIOS.md) - Testing examples

## 🚀 Deployment

### Production Deployment
1. Build frontend (if using build tool)
2. Serve static files from web server (Nginx, Apache)
3. Configure CORS on backend
4. Use HTTPS only
5. Store tokens securely

### CORS Configuration (Backend)
Add to `navflow/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://yourdomain.com",
]
```

### Frontend Host Configuration
Change in `app.js`:
```javascript
const API_BASE_URL = 'https://api.yourdomain.com';
```

## 📋 Checklist

- [x] Registration form working
- [x] Login form working
- [x] Dashboard protected
- [x] Token storage implemented
- [x] Error handling implemented
- [x] Responsive design
- [x] Comments in code
- [x] Security best practices
- [x] Validation working
- [x] Messages display correctly

## 💡 Future Enhancements

- Add password reset
- Add email verification
- Add OAuth2 (Google, GitHub)
- Add refresh token rotation
- Add session timeout
- Add user profile edit
- Add password change
- Add two-factor authentication
- Add remember me
- Add dark mode

## 📄 License

This frontend is part of the NavFlow project.

---

**Created**: January 26, 2026  
**Status**: ✅ Production-Ready  
**Last Updated**: January 26, 2026
