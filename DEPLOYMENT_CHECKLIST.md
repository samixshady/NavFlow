# 🔧 NavFlow Northflank Backend Deployment - Action Checklist

## Current Status
- ❌ Backend build: FAILED (being fixed)
- ⏳ Frontend: Not yet deployed
- ✅ PostgreSQL Database: Ready & connected

## What Was Wrong & What's Fixed

### Root Causes of Build Failure
1. ❌ **OLD:** Dockerfile tried to run `python manage.py collectstatic` during build
   - ✅ **FIXED:** Now runs at container startup instead
   
2. ❌ **OLD:** Django settings imported Redis/Celery config unconditionally
   - ✅ **FIXED:** Now gracefully handles missing services
   
3. ❌ **OLD:** No startup script to handle migrations/initialization
   - ✅ **FIXED:** Added `/app/start.sh` script with proper error handling

## ✅ Files Updated (Already Done)
- [x] `Dockerfile` - New startup process
- [x] `navflow/settings.py` - Better error handling
- [x] `BACKEND_FIX_GUIDE.md` - Detailed troubleshooting guide

## 🎯 Your ACTION ITEMS (Do These Now!)

### Action 1: Verify Environment Variables (2 min)
**Go to:** Northflank Dashboard → NavFlow Project → navflow-backend service → **Environment** tab

Make sure these variables are set:
```
✓ DEBUG = False
✓ SECRET_KEY = po@&s%gbz#o_0j!pm1t1l6dw(w7*4=kqbrq5u5)62o@-@%fn^g
✓ ALLOWED_HOSTS = *.northflank.app,localhost,127.0.0.1
✓ CORS_ALLOWED_ORIGINS = https://navflow-frontend.northflank.app,http://localhost:3000
✓ DATABASE_URL = postgresql://_a23b6d1163fd717a:_6154c97db49011f717a55f3d25c17f@primary.navflowdb--6k8s5s6pktgq.addon.code.run:5432/_8c6fedc9f7f2?sslmode=require
✓ DJANGO_SETTINGS_MODULE = navflow.settings (ADD IF MISSING)
```

### Action 2: Trigger Rebuild (1 min)
**Go to:** navflow-backend service → **Deployments** tab → Click **Rebuild Latest**

Wait for green checkmark ✅ (should take 2-5 minutes)

### Action 3: Monitor Deployment (ongoing)
**Go to:** navflow-backend service → **Observability** → **Logs**

Watch for this sequence:
```
Step 1/X: ... (building Docker image)
...
Successfully built [hash]
Successfully tagged [image]

Running migrations...
Operations to perform:
  Apply all migrations: ...
Migrating ...
Collected static files in 0.0s, 123 static files copied
Starting gunicorn...
[gunicorn] listening on 0.0.0.0:8000
```

✅ When you see "listening on 0.0.0.0:8000" → BUILD SUCCESS!

### Action 4: Test Backend (2 min)
Once backend is running, test these URLs:

**Health Check:**
```
https://p01--navflow-backend--6k8s5s6pktgq.code.run/health/
```
Should return: `{"status": "healthy", ...}`

**API Documentation:**
```
https://p01--navflow-backend--6k8s5s6pktgq.code.run/api/docs/
```
Should show Swagger UI with all endpoints

**Admin Panel:**
```
https://p01--navflow-backend--6k8s5s6pktgq.code.run/admin/
```
Should show Django admin login

### Action 5: Create Superuser (if needed)
If you want to access admin, run in Northflank:
```bash
northflank exec service -p navflow -s navflow-backend

# Inside container:
python manage.py createsuperuser
```

## 📈 Next Steps After Backend Works

1. **Deploy Frontend Service**
   - Similar process to backend
   - Use `Dockerfile.frontend`
   - Set `NEXT_PUBLIC_API_URL = <backend-url>`

2. **Configure Custom Domains**
   - Each service can have custom domain
   - Add SSL/TLS (automatic on Northflank)

3. **Set Up Monitoring**
   - Configure health checks
   - Set up alerts if service goes down

## 🆘 If Build Still Fails

1. **Check Build Logs:**
   - Go to Deployments tab
   - Click "View latest build logs"
   - Look for first ERROR message

2. **Common Issues:**
   - `ERROR: Database connection failed` → DATABASE_URL not set correctly
   - `ModuleNotFoundError` → Missing package in requirements.txt
   - `SECRET_KEY not set` → SECRET_KEY variable missing from env

3. **Get Help:**
   - Share the full error from build logs
   - Verify DATABASE_URL hasn't changed
   - Check all env variables are exactly as listed above

## 📊 Architecture After Deployment

```
User Browser
    ↓
frontend.northflank.app (Next.js)
    ↓
Northflank Load Balancer
    ↓
backend.northflank.app (Django/Gunicorn)
    ↓
PostgreSQL Addon (Northflank)
```

## 💾 Quick Reference URLs

Coming soon once deployed:
- Frontend: `https://navflow-frontend.northflank.app`
- Backend: `https://navflow-backend.northflank.app`
- API Docs: `https://navflow-backend.northflank.app/api/docs/`
- Admin: `https://navflow-backend.northflank.app/admin/`

## ⏱️ Expected Timeline

- Rebuild triggered: Now
- Docker build: 2-5 minutes
- Container startup: 30 seconds
- DB migrations: 10-30 seconds
- Total: ~5 minutes

## ✨ Success Criteria

Backend is successfully deployed when:
- ✅ Service status shows "Running" (green)
- ✅ Health check endpoint returns 200 status
- ✅ API docs page loads without errors
- ✅ No errors in runtime logs

---

**Ready to proceed?** Start with Action 1 above! 🚀
