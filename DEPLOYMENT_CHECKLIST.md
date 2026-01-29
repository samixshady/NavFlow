# 🚀 Quick Deployment Checklist

## Pre-Deployment
- [ ] All code committed and pushed to Git
- [ ] Environment variables configured locally
- [ ] Application tested locally
- [ ] Database migrations created and tested

## Backend Deployment (Render)

### 1. Create Database (5 min)
- [ ] Create PostgreSQL database on Render
- [ ] Name: `navflow-db`
- [ ] Copy Internal Database URL
- [ ] Database status: Running

### 2. Deploy Backend (10 min)
- [ ] Create Web Service on Render
- [ ] Connect Git repository
- [ ] Set build command: `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate`
- [ ] Set start command: `gunicorn navflow.wsgi:application`
- [ ] Add environment variables:
  - [ ] DEBUG=False
  - [ ] SECRET_KEY (generated)
  - [ ] DATABASE_URL (from database)
  - [ ] ALLOWED_HOSTS
  - [ ] CORS_ALLOWED_ORIGINS
  - [ ] PYTHON_VERSION=3.11.0
- [ ] Deploy and wait for completion
- [ ] Copy backend URL: `https://______.onrender.com`

### 3. Verify Backend
- [ ] Visit: `https://your-backend.onrender.com/api/v1/health/`
- [ ] Visit: `https://your-backend.onrender.com/api/v1/schema/swagger-ui/`
- [ ] Create superuser (optional): In Shell run `python manage.py createsuperuser`

## Frontend Deployment (Vercel)

### 4. Deploy Frontend (5 min)
- [ ] Login to Vercel
- [ ] Import Git repository
- [ ] **⚠️ CRITICAL:** Set Root Directory to `frontend-nextjs` (not blank!)
  - This tells Vercel where package.json is located
  - Without this, you'll get "No Next.js version detected" error
- [ ] Framework should auto-detect as Next.js
- [ ] Add environment variables:
  - [ ] NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
  - [ ] NEXT_PUBLIC_API_BASE_PATH=/api/v1
- [ ] Deploy
- [ ] Copy frontend URL: `https://______.vercel.app`

## Final Configuration

### 5. Update Backend CORS (2 min)
- [ ] Go to Render → navflow-api → Environment
- [ ] Update CORS_ALLOWED_ORIGINS: `https://your-app.vercel.app,http://localhost:3000`
- [ ] Update ALLOWED_HOSTS: `your-backend.onrender.com,localhost`
- [ ] Save and redeploy

### 6. Test Everything
- [ ] Visit frontend URL
- [ ] Test user registration
- [ ] Test user login
- [ ] Create organization
- [ ] Create project
- [ ] Create task
- [ ] Check browser console (no CORS errors)
- [ ] Test API from Swagger UI

## Post-Deployment

### 7. Security & Maintenance
- [ ] Review security checklist in DEPLOYMENT_GUIDE.md
- [ ] Set up database backup schedule
- [ ] Document your URLs:
  - Frontend: _______________________
  - Backend: ________________________
  - Admin: __________________________
- [ ] Add custom domains (optional)
- [ ] Set up monitoring/alerts
- [ ] Share access with team

---

## Common URLs

After deployment, bookmark these:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend App | `https://[your-app].vercel.app` | Main application |
| Backend API | `https://[your-api].onrender.com` | REST API |
| API Docs | `https://[your-api].onrender.com/api/v1/schema/swagger-ui/` | Interactive API docs |
| Django Admin | `https://[your-api].onrender.com/admin/` | Admin panel |
| Render Dashboard | `https://dashboard.render.com` | Manage backend |
| Vercel Dashboard | `https://vercel.com/dashboard` | Manage frontend |

---

## Environment Variables Reference

### Backend (Render)
```bash
DEBUG=False
SECRET_KEY=<generated-by-render>
DATABASE_URL=<from-render-database>
ALLOWED_HOSTS=your-backend.onrender.com,localhost
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
PYTHON_VERSION=3.11.0
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_API_BASE_PATH=/api/v1
```

---

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Backend 500 error | Check Render logs, verify DATABASE_URL |
| Frontend can't connect | Update CORS_ALLOWED_ORIGINS, redeploy backend |
| Database connection fails | Wait 5 min after creation, check region matches |
| Build fails | Check logs, verify all dependencies in requirements.txt |
| CORS errors | Ensure https:// prefix, no trailing slash in CORS settings |
| Environment vars not working | Redeploy after adding variables |

---

**Total Deployment Time: ~25 minutes**

For detailed instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
