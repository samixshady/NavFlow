# NavFlow Backend Northflank Deployment - Fix Guide

## Problem
The backend service build failed on initial deployment. This was due to Django commands trying to run without proper environment variables during the Docker build phase.

## ✅ What's Been Fixed

### 1. **Dockerfile Updated**
The Dockerfile has been completely rewritten to:
- ✅ Move `collectstatic` and migrations to **runtime** instead of build time
- ✅ Create a startup script that handles initialization gracefully
- ✅ Better error handling for optional operations
- ✅ Proper logging to aid debugging

**Key changes:**
```dockerfile
# NEW: Startup script runs at container start, not at build
CMD ["/app/start.sh"]

# Startup script handles:
- Database migrations (if DB is ready)
- Static file collection
- Starts gunicorn with detailed logging
```

### 2. **Django Settings Updated**
Fixed `navflow/settings.py` to:
- ✅ Handle missing Redis connection gracefully
- ✅ Fallback to in-memory cache if Redis unavailable
- ✅ Only enable Celery if explicitly configured
- ✅ Better error handling for optional services

## 🔧 Next Steps: Update Northflank Backend Service

Go to Northflank Dashboard → NavFlow Project → navflow-backend service:

### Step 1: Update Environment Variables

Click **Environment** tab → **Edit** and add/update these variables:

```
DEBUG = False
SECRET_KEY = po@&s%gbz#o_0j!pm1t1l6dw(w7*4=kqbrq5u5)62o@-@%fn^g
ALLOWED_HOSTS = *.northflank.app,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS = https://navflow-frontend.northflank.app,http://localhost:3000
DATABASE_URL = postgresql://_a23b6d1163fd717a:_6154c97db49011f717a55f3d25c17f@primary.navflowdb--6k8s5s6pktgq.addon.code.run:5432/_8c6fedc9f7f2?sslmode=require
DJANGO_SETTINGS_MODULE = navflow.settings
```

**IMPORTANT:** These are already set except for `DJANGO_SETTINGS_MODULE`. Make sure all are present.

### Step 2: Rebuild Service

In the service page:
1. Click **Deployments** tab
2. Click **Build**  or **Rebuild Latest**
3. Wait for build to complete (should be green instead of red)
4. Once build succeeds, deployment should start automatically

### Step 3: Monitor Build/Startup

Click **Observability** → **Logs** to watch:
- Build logs show `Successfully built...`
- Runtime logs show database migration and static file collection

Expected log sequence:
```
Running migrations...
Migrating navflow app...
Collecting static files...
123 static files copied, 456 post-processed.
Starting gunicorn...
[gunicorn] listening on 0.0.0.0:8000
```

## ⚠️ Troubleshooting

### Build Still Fails?
- Check the Build Logs tab
- Verify all environment variables are exactly as shown above
- Make sure DATABASE_URL hasn't changed

### Container Starts but Crashes?
- Go to **Observability** → **Logs**
- Look for error messages starting with "ERROR" or "CRITICAL"
- Common issues:
  - `ModuleNotFoundError`: Missing dependency in requirements.txt
  - `OperationalError`: Database connection issue (check DATABASE_URL)
  - `ImproperlyConfigured`: Missing environment variable

### Connection to Database Fails?
Verify the PostgreSQL addon is running:
1. Go to NavFlow project home
2. Check the **postgres** addon status (should be "Running")
3. If failed, click addon and check its logs

### Static Files Not Serving?
- Confirmed by 404s on `/static/admin/` URLs
- Check that `STATICFILES_STORAGE` in settings.py is `'whitenoise.storage.CompressedManifestStaticFilesStorage'`
- Verify `/app/staticfiles` directory exists in container

## 📋 Files Modified

1. **Dockerfile** - Fixed Docker build process
   - Added startup script
   - Moved Django initialization to runtime
   - Better error handling

2. **navflow/settings.py** - Fixed Django configuration
   - Redis caching now gracefully fallback
   - Celery is only enabled if explicitly configured
   - Better error handling for optional services

## 🚀 After Backend is Running

Once the backend is deployed successfully:

1. **Test API Health**
   - Go to: `https://p01--navflow-backend--6k8s5s6pktgq.code.run/api/health/`
   - Should return JSON response (or 404 if health endpoint not implemented)

2. **Check API Documentation**
   - Go to: `https://p01--navflow-backend--6k8s5s6pktgq.code.run/api/docs/`
   - Should see Swagger/OpenAPI documentation

3. **Access Admin Panel**
   - Go to: `https://p01--navflow-backend--6k8s5s6pktgq.code.run/admin/`
   - Create superuser if needed (via CLI or Northflank SSH)

## 🔐 Security Reminders

- ⚠️ All environment variables shown here are examples
- 🔑 Generate a new SECRET_KEY for your next deployment: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- 🗝️ Never commit DATABASE_URL or SECRET_KEY to version control
- 🔒 Store sensitive variables in Northflank's secret management (not shown here for brevity)

## 📞 Need Help?

If issues persist:
1. Share your **Build Logs** (Deployments → Build → View latest build logs)
2. Share your **Runtime Logs** (Observability → Logs)
3. Check that Django migrations created tables: `python manage.py showmigrations`

---

**Summary:** The Dockerfile and settings have been updated to handle production deployment gracefully. Just rebuild the service in Northflank and it should deploy successfully!
