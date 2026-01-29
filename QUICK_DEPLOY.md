# 🚀 Quick Deploy Commands

## Before Deployment
```bash
# 1. Commit all changes
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

## Render Environment Variables (Copy-Paste Ready)

```bash
PYTHON_VERSION=3.12.0
DEBUG=False
SECRET_KEY=<GENERATE_THIS>
DATABASE_URL=<COPY_FROM_DATABASE>
ALLOWED_HOSTS=.onrender.com
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

## Vercel Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_API_BASE_PATH=/api/v1
```

## Test URLs After Deployment

```bash
# Backend Health Check
https://your-backend.onrender.com/api/v1/accounts/health/

# Backend API Docs
https://your-backend.onrender.com/api/docs/

# Frontend
https://your-app.vercel.app
```

## Important Notes
- ✅ Django 6.0.1 requires Python 3.12+
- ✅ Database must be created BEFORE web service
- ✅ Update CORS_ALLOWED_ORIGINS after frontend is deployed
- ✅ Free tier sleeps after 15min inactivity (30-60s cold start)

## Troubleshooting

**Build fails on Render?**
- Check Python version is 3.12.0
- Verify DATABASE_URL is set
- Check build logs for specific errors

**Frontend can't connect to backend?**
- Verify CORS_ALLOWED_ORIGINS includes Vercel URL
- Check backend is awake (visit health endpoint)
- Verify environment variables in Vercel

**Database connection error?**
- Use Internal Database URL (not external)
- Ensure database and web service in same region
- Wait a few minutes after database creation
