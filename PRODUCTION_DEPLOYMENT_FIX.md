# Production Deployment Setup - Render + Vercel + PostgreSQL

## ❌ Current Issues

**Symptoms**: Login/Register returns "Registration failed. Please try again."

**Root Causes**:
1. ❌ `DATABASE_URL` environment variable not set on Render
2. ❌ Database migrations not run on Render
3. ❌ CORS not configured for Vercel domain
4. ❌ Frontend doesn't know Render backend URL

---

## ✅ STEP-BY-STEP FIX

### STEP 1: Set Environment Variables on Render Backend

**Go to**: Render Dashboard → Your Backend Service → Environment

**Add these variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://navflow_user:4BryUd8fugxkVXMwFFLHUPCZhdHtiBOL@dpg-d5tbb9vgi27c73f3n82g-a/navflow_db_pkkd` |
| `DEBUG` | `False` |
| `SECRET_KEY` | Generate secure key: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `CORS_ALLOWED_ORIGINS` | `https://nav-flow.vercel.app` |
| `ALLOWED_HOSTS` | `your-backend-service.onrender.com` |

**Click "Save" and wait for redeploy** ✅

---

### STEP 2: Verify Backend Service Name

**Go to**: Render Dashboard → Your Backend Service → Settings

**Copy your service URL**, example:
```
https://navflow-api.onrender.com
```

You'll need this for STEP 4.

---

### STEP 3: Run Database Migrations on Render

**Two Options**:

#### Option A: Via Render Console (Recommended)
1. Go to Backend Service → Shell
2. Run these commands:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser  # Optional: create admin account
   ```

#### Option B: Via Git Deployment Hook
1. Add to root directory file named `render.yaml`:
   ```yaml
   services:
     - type: web
       name: navflow-backend
       env: python
       region: singapore
       plan: free
       buildCommand: pip install -r requirements.txt && python manage.py migrate
       startCommand: gunicorn navflow.wsgi:application
   ```
2. Push to GitHub
3. Render automatically runs migrations

**After migrations run**: ✅ Database tables are created

---

### STEP 4: Update Vercel Frontend with Backend URL

**Go to**: Vercel Dashboard → Project Settings → Environment Variables

**Update/Add**:

| Variable | Value | Scopes |
|----------|-------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend-service.onrender.com/api/v1` | Production, Preview, Development |

**Example** (replace with your actual Render URL):
```
NEXT_PUBLIC_API_BASE_URL=https://navflow-api.onrender.com/api/v1
```

**Then**: Click "Save" and trigger a redeploy

---

### STEP 5: Update Local .env.example

Your `.env.example` is already updated with correct format:

```bash
# For Production (Render)
DATABASE_URL=postgresql://navflow_user:4BryUd8fugxkVXMwFFLHUPCZhdHtiBOL@dpg-d5tbb9vgi27c73f3n82g-a/navflow_db_pkkd

# For Local Development
# DATABASE_URL=postgresql://navflow_user:password@localhost:5432/navflow_db
```

---

## 🧪 Testing Checklist

After completing steps 1-5, test each endpoint:

### Test 1: Backend Health Check
```bash
curl https://your-backend-service.onrender.com/api/v1/
```
**Expected**: 200 OK or 404 (if no root endpoint)

### Test 2: Create Account
1. Go to https://nav-flow.vercel.app
2. Click "Create Account"
3. Fill in:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `TestPassword123!`
4. Click Register
5. **Expected**: Success! Or clear error message

### Test 3: Login
1. Use credentials from Test 2
2. **Expected**: Redirected to dashboard

### Test 4: API Documentation
```
https://your-backend-service.onrender.com/api/docs/
```
**Expected**: Swagger documentation loads

---

## 🔍 Debugging: If Still Getting "Registration failed"

### Check Backend Logs:
**On Render**: Your Service → Logs

**Look for errors**:
- ❌ `OperationalError`: Database not connecting → Check `DATABASE_URL`
- ❌ `ProgrammingError`: Table doesn't exist → Run migrations
- ❌ `CORS error`: Wrong frontend URL → Check `CORS_ALLOWED_ORIGINS`

### Check Network Tab in Browser:
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Try to register
4. Look at failed requests:
   - **404**: Backend URL wrong → Update `NEXT_PUBLIC_API_BASE_URL`
   - **401**: Auth issue → Check tokens
   - **500**: Backend error → Check Render logs

### Test API Directly:
```bash
# From your local machine
curl -X POST https://your-backend-service.onrender.com/api/v1/accounts/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User"
  }'
```

**Expected Response**: 
```json
{
  "user": {...},
  "tokens": {"access": "...", "refresh": "..."}
}
```

---

## 📋 Configuration Summary

### On Render (Backend Service)

**Environment Variables**:
```
DATABASE_URL=postgresql://navflow_user:4BryUd8fugxkVXMwFFLHUPCZhdHtiBOL@dpg-d5tbb9vgi27c73f3n82g-a/navflow_db_pkkd
DEBUG=False
SECRET_KEY=<generate-secure-key>
CORS_ALLOWED_ORIGINS=https://nav-flow.vercel.app
ALLOWED_HOSTS=your-backend-service.onrender.com
```

**Build Command**:
```bash
pip install -r requirements.txt && python manage.py migrate
```

**Start Command**:
```bash
gunicorn navflow.wsgi:application
```

---

### On Vercel (Frontend)

**Environment Variables**:
```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-service.onrender.com/api/v1
```

**Build Command**: `npm run build` (auto-detected)
**Start Command**: `npm start` (auto-detected)
**Root Directory**: `frontend-nextjs`

---

### PostgreSQL on Render

**Connection Details**:
- **Host**: `dpg-d5tbb9vgi27c73f3n82g-a`
- **Port**: `5432`
- **Database**: `navflow_db_pkkd`
- **Username**: `navflow_user`
- **Password**: `4BryUd8fugxkVXMwFFLHUPCZhdHtiBOL`

---

## 🚀 After Everything Works

### 1. Create Test Account
```
Email: admin@navflow.com
Password: TestPass123!
```

### 2. Test Features
- [x] Login/Register
- [x] Create Organization
- [x] Create Project
- [x] Create Task
- [x] View Dashboard

### 3. Monitor Performance
- Check Render logs for errors
- Monitor database connections
- Track API response times

---

## 🆘 Still Having Issues?

### Common Fixes:

**Issue**: "Database connection refused"
- ✅ Solution: Check `DATABASE_URL` is exactly as provided
- ✅ Solution: Verify Render PostgreSQL is running (check status on dashboard)

**Issue**: "CORS error in browser console"
- ✅ Solution: Update `CORS_ALLOWED_ORIGINS` with exact Vercel domain
- ✅ Solution: Include `https://` (not `http://`)

**Issue**: "Migrations not applied"
- ✅ Solution: Go to Render Service → Shell → Run `python manage.py migrate`
- ✅ Solution: Check migration files exist in `accounts/migrations/`, `projects/migrations/`

**Issue**: "500 Internal Server Error"
- ✅ Solution: Check Render logs for traceback
- ✅ Solution: Verify all environment variables are set
- ✅ Solution: Check SECRET_KEY is set

---

## 📞 Quick Reference URLs

| Service | URL |
|---------|-----|
| Frontend | https://nav-flow.vercel.app |
| Backend API | https://your-backend-service.onrender.com |
| API Docs | https://your-backend-service.onrender.com/api/docs |
| Admin Panel | https://your-backend-service.onrender.com/admin |
| Database | Connect via: `psql <EXTERNAL_DATABASE_URL>` |

---

**Status**: 🔴 Pending - Follow steps above to fix

Once complete: ✅ Full production deployment ready!
