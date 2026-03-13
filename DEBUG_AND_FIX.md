# Backend Debug & Fix - Complete Guide

## Problem Found
Your backend container is **running** but returning **400 Bad Request** because:

**ALLOWED_HOSTS is incomplete:**
- Current (wrong): `*.northflank.app,localhost,127.0.0.1`
- Your domain: `p01--navflow-backend--6k8s5s6pktgq.code.run`
- Missing: `.code.run` in ALLOWED_HOSTS

Django rejects requests from domains not in ALLOWED_HOSTS (security check).

## Solution: Update Environment Variables

### Step 1: Go to Northflank Dashboard
1. Navigate to: NavFlow Project → navflow-backend service
2. Click **Environment** tab

### Step 2: Update ALLOWED_HOSTS

Find the `ALLOWED_HOSTS` variable and update it to:
```
*.northflank.app,.code.run,*.onrender.com,localhost,127.0.0.1,testserver
```

### Step 3: Also Update CORS_ALLOWED_ORIGINS

Set it to:
```
https://*.northflank.app,https://*.code.run,http://localhost:3000,http://127.0.0.1:3000
```

### Step 4: Verify All Environment Variables

Make sure ALL these are set correctly:

| Variable | Value |
|----------|-------|
| `DEBUG` | `False` |
| `SECRET_KEY` | `po@&s%gbz#o_0j!pm1t1l6dw(w7*4=kqbrq5u5)62o@-@%fn^g` |
| `ALLOWED_HOSTS` | `*.northflank.app,.code.run,*.onrender.com,localhost,127.0.0.1,testserver` |
| `CORS_ALLOWED_ORIGINS` | `https://*.northflank.app,https://*.code.run,http://localhost:3000,http://127.0.0.1:3000` |
| `DATABASE_URL` | `postgresql://_a23b6d1163fd717a:_6154c97db49011f717a55f3d25c17f@primary.navflowdb--6k8s5s6pktgq.addon.code.run:5432/_8c6fedc9f7f2?sslmode=require` |
| `DJANGO_SETTINGS_MODULE` | `navflow.settings` |

### Step 5: Save & Rebuild

1. Click **Save** after updating variables
2. Go to **Deployments** tab
3. Click **Rebuild Latest**
4. Wait for build to finish (2-3 minutes)

### Step 6: Test

Once rebuilt, test:
```
https://p01--navflow-backend--6k8s5s6pktgq.code.run/health/
```

Should return:
```json
{"status": "healthy", ...}
```

## What Was Updated in Your Code

These files were already updated to handle wildcards:

1. **navflow/settings.py**
   - Updated ALLOWED_HOSTS to use `*.northflank.app,.code.run` patterns
   - Updated CORS to use wildcard patterns
   - Added CSRF_TRUSTED_ORIGINS

2. **Dockerfile**
   - Uses Python 3.12 (required for Django 6.0.1)
   - Startup script handles migrations and static files
   - Non-root user (security)

## Key Issue Was:
The environment variable in Northflank service config was **outdated**. The code was updated but the Northflank service env vars weren't.

## Next Steps After Backend Works:

1. **Deploy Frontend Service** with backend URL
2. **Configure custom domains** (optional)
3. **Create Django superuser** (for admin access)
4. **Test all endpoints**:
   - `/health/` - Health check
   - `/api/docs/` - Swagger UI
   - `/admin/` - Admin panel
   - `/api/v1/accounts/` - API endpoints

## Troubleshooting

If still getting 400:
1. Clear browser cache
2. Check ALLOWED_HOSTS includes ALL these: `*.northflank.app`, `.code.run`, `localhost`, `127.0.0.1`
3. Verify rebuild completed successfully (check Deployments → Build logs)
4. Check runtime logs (Observability → Logs) for errors

---

**Status:** Container running ✅ | Settings updated ✅ | Waiting for env vars sync ⏳
