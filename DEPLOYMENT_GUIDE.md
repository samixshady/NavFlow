# 🚀 NavFlow Deployment Guide

Complete guide to deploy NavFlow to **Render** (Backend + PostgreSQL) and **Vercel** (Frontend).

---

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
4. **Git** - Ensure all changes are committed

---

## 🎯 Deployment Overview

```
┌─────────────────────────────────────────┐
│         User Browser                     │
└──────────────┬──────────────────────────┘
               │
               ├─────────► Vercel (Frontend - Next.js)
               │           https://your-app.vercel.app
               │
               └─────────► Render (Backend - Django API)
                           https://navflow-api.onrender.com
                           │
                           └──► PostgreSQL Database
                                (Render Free Tier)
```

---

## 🔧 PART 1: Deploy Backend to Render

### Step 1: Push Code to GitHub

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → Select **"PostgreSQL"**
3. Configure:
   - **Name**: `navflow-db`
   - **Database**: `navflow_db`
   - **User**: `navflow_user`
   - **Region**: Choose closest to you (e.g., Oregon)
   - **Plan**: **Free**
4. Click **"Create Database"**
5. ⏳ Wait 2-3 minutes for database to be ready
6. 📋 **Copy the Internal Database URL** - You'll need this!

### Step 3: Deploy Django Backend

1. Click **"New +"** → Select **"Web Service"**
2. Connect your **GitHub repository**
3. Configure:
   - **Name**: `navflow-api`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate
     ```
   - **Start Command**: 
     ```bash
     gunicorn navflow.wsgi:application --bind 0.0.0.0:$PORT
     ```
   - **Plan**: **Free**

### Step 4: Configure Environment Variables

In the **Environment** section, add these variables:

```bash
# Required Variables
PYTHON_VERSION=3.12.0
DEBUG=False
SECRET_KEY=<click "Generate" button>

# Database - Use Internal Database URL from Step 2
DATABASE_URL=<paste your Internal Database URL>

# Allowed Hosts - will be auto-filled after creation
ALLOWED_HOSTS=navflow-api.onrender.com

# CORS - Update after deploying frontend
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

4. Click **"Create Web Service"**
5. ⏳ Wait 5-10 minutes for deployment
6. ✅ Once deployed, you'll see: `Your service is live 🎉`

### Step 5: Update CORS After Getting Backend URL

1. Note your backend URL: `https://navflow-api.onrender.com`
2. You'll update `CORS_ALLOWED_ORIGINS` after deploying frontend

### Step 6: Create Test User (Optional but Recommended)

1. Go to your Render service
2. Click **"Shell"** tab (terminal access)
3. Run:
   ```bash
   python manage.py createsuperuser
   ```
4. Follow prompts to create admin user

---

## 🌐 PART 2: Deploy Frontend to Vercel

### Step 1: Update Environment File

Update `frontend-nextjs/.env.production` with your actual backend URL:

```bash
NEXT_PUBLIC_API_URL=https://navflow-api.onrender.com
NEXT_PUBLIC_API_BASE_PATH=/api/v1
```

Commit and push:
```bash
git add frontend-nextjs/.env.production
git commit -m "Update production API URL"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. **Import** your GitHub repository
4. Configure:
   - **Framework Preset**: `Next.js` (should auto-detect)
   - **Root Directory**: `frontend-nextjs`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Step 3: Configure Environment Variables

In **Environment Variables** section, add:

```bash
NEXT_PUBLIC_API_URL=https://navflow-api.onrender.com
NEXT_PUBLIC_API_BASE_PATH=/api/v1
```

5. Click **"Deploy"**
6. ⏳ Wait 2-3 minutes
7. ✅ Your app will be live at `https://your-app.vercel.app`

### Step 4: Update CORS on Backend

Now that you have your Vercel URL, update Render:

1. Go back to **Render Dashboard**
2. Select your `navflow-api` service
3. Go to **Environment** tab
4. Update `CORS_ALLOWED_ORIGINS`:
   ```
   https://your-app.vercel.app
   ```
5. Click **"Save Changes"**
6. Service will automatically redeploy

---

## ✅ PART 3: Verify Deployment

### Test Backend API

1. Visit: `https://navflow-api.onrender.com/api/v1/accounts/health/`
2. Should return: `{"status": "healthy"}`

3. Visit: `https://navflow-api.onrender.com/api/docs/`
4. Should show **Swagger API Documentation**

### Test Frontend

1. Visit: `https://your-app.vercel.app`
2. Should see **NavFlow login page**
3. Try registering a new account
4. Try logging in
5. Create a project and task

### Check Database

1. Go to Render → Your Database → **Metrics**
2. Should see connection activity

---

## 🐛 Troubleshooting

### Backend Issues

**Build Failed**
- Check Render logs in **Logs** tab
- Verify all dependencies in `requirements.txt`
- Ensure Python version is 3.12 (required for Django 6.0.1)

**Database Connection Error**
- Verify `DATABASE_URL` is set correctly
- Check database is in same region
- Wait a few minutes if database just created

**502 Bad Gateway**
- Check start command is correct
- View logs for Python errors
- Ensure migrations ran successfully

**Static Files Not Loading**
- Verify collectstatic ran in build
- Check `STATIC_ROOT` in settings

### Frontend Issues

**API Calls Failing (CORS)**
- Verify `CORS_ALLOWED_ORIGINS` includes Vercel URL
- Check backend logs for CORS errors
- Ensure no trailing slashes in URLs

**Environment Variables Not Working**
- Must start with `NEXT_PUBLIC_` for client-side
- Redeploy after changing env vars
- Check Vercel deployment logs

**Build Failed**
- Check Node version compatibility
- Verify all dependencies in `package.json`
- Review Vercel build logs

### Database Issues

**Migrations Not Running**
- Check build logs in Render
- Manually run: `python manage.py migrate` in Shell
- Verify `DATABASE_URL` is correct

---

## 🔒 Security Checklist

- [x] `DEBUG=False` in production
- [x] Strong `SECRET_KEY` generated
- [x] `ALLOWED_HOSTS` configured
- [x] CORS origins restricted to your domain
- [x] SSL/HTTPS enabled (automatic on Render/Vercel)
- [x] Database password secure
- [x] Environment variables not in code

---

## 💰 Cost Summary

All services can run on **FREE TIER**:

- ✅ **Render PostgreSQL**: Free (1 GB storage, 1 GB RAM)
- ✅ **Render Web Service**: Free (750 hours/month, sleeps after inactivity)
- ✅ **Vercel**: Free (100 GB bandwidth, unlimited deployments)

**Note**: Free tier backends sleep after 15 minutes of inactivity. First request after sleep takes 30-60 seconds to wake up.

---

## 🚀 Continuous Deployment

Both platforms support **automatic deployments**:

**Render**:
- Auto-deploys on push to `main` branch
- Configure in Settings → Build & Deploy

**Vercel**:
- Auto-deploys on push to `main` branch
- Preview deployments for PRs
- Rollback to previous deployments in 1 click

---

## 📊 Monitoring & Logs

### Render Logs
1. Dashboard → Your Service → **Logs** tab
2. Real-time log streaming
3. Filter by date/severity

### Vercel Logs
1. Dashboard → Your Project → **Deployments**
2. Click deployment → **Logs**
3. Function logs and errors

### Database Metrics
1. Render → Your Database → **Metrics**
2. Connection count, storage, queries

---

## 🔄 Common Commands

### Render Shell Access
```bash
# Access Django shell
python manage.py shell

# Create superuser
python manage.py createsuperuser

# Run migrations
python manage.py migrate

# Check logs
# Use the Logs tab in dashboard
```

### Local Development
```bash
# Backend
python manage.py runserver

# Frontend
cd frontend-nextjs
npm run dev
```

---

## 📝 Post-Deployment Tasks

1. **Create Admin User** via Render Shell
2. **Test All Features** on production
3. **Monitor Logs** for first 24 hours
4. **Set Up Custom Domain** (optional)
   - Vercel: Project Settings → Domains
   - Render: Service Settings → Custom Domain
5. **Enable Monitoring** (optional)
   - Set up Render health checks
   - Configure Vercel Analytics

---

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Django Deployment**: https://docs.djangoproject.com/en/stable/howto/deployment/
- **Next.js Deployment**: https://nextjs.org/docs/deployment

---

## 🎉 Success!

Your NavFlow app is now deployed and running on:
- 🔵 **Backend**: https://navflow-api.onrender.com
- 🟢 **Frontend**: https://your-app.vercel.app
- 🗄️ **Database**: Managed PostgreSQL on Render

**Next Steps:**
1. Share your app with users
2. Monitor performance
3. Set up custom domain
4. Enable analytics
5. Plan for scaling (upgrade to paid tiers if needed)

---

## 📦 Files Modified for Deployment

- ✅ `render.yaml` - Render configuration
- ✅ `navflow/settings.py` - Production settings
- ✅ `requirements.txt` - Added dj-database-url
- ✅ `frontend-nextjs/.env.production` - Production env vars
- ✅ `frontend-nextjs/vercel.json` - Vercel configuration

---

## 🔐 Important URLs to Save

```bash
# Backend
Backend URL: https://navflow-api.onrender.com
API Docs: https://navflow-api.onrender.com/api/docs/
Admin: https://navflow-api.onrender.com/admin/

# Frontend
Frontend URL: https://your-app.vercel.app

# Dashboards
Render: https://dashboard.render.com/
Vercel: https://vercel.com/dashboard
```

---

**Happy Deploying! 🚀**
