# NavFlow Deployment Guide

Complete guide to deploy NavFlow to production with Render (Backend) and Vercel (Frontend).

---

## � QUICK FIX: "Could not read package.json" Error

**If you're getting this error on Vercel:**
```
npm error path /vercel/path0/package.json
npm error enoent Could not read package.json
```

**Fix it NOW:**
1. Go to: https://vercel.com/dashboard
2. Click your project → **Settings** → **General**
3. Scroll to **"Root Directory"**
4. Click **"Edit"**
5. Type: `frontend-nextjs`
6. Click **"Save"**
7. Go to **Deployments** tab
8. Click the **"..."** menu on latest deployment → **"Redeploy"**

✅ This tells Vercel your Next.js app is in a subdirectory, not the repo root.

---

## �📋 Prerequisites

Before starting deployment, ensure you have:

1. ✅ Git repository (GitHub, GitLab, or Bitbucket)
2. ✅ Render account (https://render.com)
3. ✅ Vercel account (https://vercel.com)
4. ✅ All code committed and pushed to your repository

---

## 🗄️ Part 1: Deploy Backend to Render

### Step 1: Create PostgreSQL Database

1. **Login to Render Dashboard**
   - Go to https://dashboard.render.com
   - Click "New +" → "PostgreSQL"

2. **Configure Database**
   ```
   Name: navflow-db
   Database: navflow_db
   User: navflow_user
   Region: Oregon (or closest to you)
   PostgreSQL Version: 16
   Plan: Free
   ```

3. **Create Database**
   - Click "Create Database"
   - Wait 2-3 minutes for provisioning
   - **IMPORTANT**: Copy the "Internal Database URL" from the database page
     - Format: `postgresql://user:password@host/database`
     - You'll need this for the web service

### Step 2: Deploy Django Backend

1. **Create Web Service**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Select your NavFlow repository

2. **Configure Web Service**
   ```
   Name: navflow-api
   Region: Oregon (same as database)
   Branch: main
   Root Directory: (leave empty, root of repo)
   Runtime: Python 3
   Build Command: pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate
   Start Command: gunicorn navflow.wsgi:application
   Plan: Free
   ```

3. **Add Environment Variables**
   
   Click "Advanced" → "Add Environment Variable" and add these:

   ```bash
   # Django Core
   DEBUG=False
   SECRET_KEY=<click "Generate" button for secure random key>
   PYTHON_VERSION=3.11.0
   
   # Database - Paste your database URL from Step 1
   DATABASE_URL=<paste your Internal Database URL from navflow-db>
   
   # Allowed Hosts - Add your Render domain (will be available after deployment)
   ALLOWED_HOSTS=navflow-api.onrender.com,localhost
   
   # CORS - Will update after Vercel deployment
   CORS_ALLOWED_ORIGINS=http://localhost:3000
   ```

   **Important Notes:**
   - Replace `navflow-api` in ALLOWED_HOSTS with your actual service name
   - We'll update CORS_ALLOWED_ORIGINS after deploying the frontend

4. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for initial deployment
   - Monitor logs for any errors

5. **Verify Backend Deployment**
   
   Once deployed, your backend will be at: `https://navflow-api.onrender.com`
   
   Test these endpoints:
   ```bash
   # API Health Check
   https://navflow-api.onrender.com/api/v1/health/
   
   # API Schema/Documentation
   https://navflow-api.onrender.com/api/v1/schema/
   
   # Swagger UI
   https://navflow-api.onrender.com/api/v1/schema/swagger-ui/
   ```

6. **Create Initial Superuser** (Optional but recommended)
   
   In Render Dashboard:
   - Go to your web service → "Shell" tab
   - Run:
     ```bash
     python manage.py createsuperuser
     ```
   - Follow prompts to create admin account

---

## 🌐 Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Frontend Configuration

Before deploying, you need your backend URL from Part 1.

1. **Get Your Backend URL**
   ```
   Your backend is at: https://navflow-api.onrender.com
   (or whatever name you chose)
   ```

### Step 2: Deploy to Vercel

1. **Login to Vercel**
   - Go to https://vercel.com
   - Click "Add New" → "Project"

2. **Import Repository**
   - Select your Git provider (GitHub, GitLab, etc.)
   - Select your NavFlow repository
   - Click "Import"

3. **Configure Project**
   
   **⚠️ STEP-BY-STEP - DO NOT SKIP:**
   
   a. **Framework Preset:** Should auto-detect as "Next.js" ✅
   
   b. **Root Directory:** Click **"Edit"** and enter: `frontend-nextjs`
      - This is THE most critical setting
      - Your package.json is in frontend-nextjs/ folder, not repo root
      - Without this, build will fail with "Could not read package.json"
      
   c. **Build Settings:** Leave as default (Vercel auto-configures for Next.js)
      ```
      Build Command: (auto: npm run build)
      Output Directory: (auto: .next)
      Install Command: (auto: npm install)
      Development Command: (auto: npm run dev)
      ```
   
   d. **Visual Check:** Your settings should look like:
      ```
      Framework Preset: Next.js
      Root Directory: frontend-nextjs  ← MUST BE SET!
      Build Command: npm run build
      Output Directory: .next
      ```

4. **Add Environment Variables**
   
   In "Environment Variables" section, add:

   ```bash
   # API Configuration
   NEXT_PUBLIC_API_URL=https://navflow-api.onrender.com
   NEXT_PUBLIC_API_BASE_PATH=/api/v1
   ```

   **Replace `navflow-api.onrender.com` with YOUR actual Render backend URL**

   Set for: "Production", "Preview", and "Development"

5. **Deploy**
   - Click "Deploy"
   - Wait 3-5 minutes
   - Vercel will automatically build and deploy your frontend

6. **Get Your Frontend URL**
   
   After deployment completes:
   ```
   Your app is live at: https://your-project-name.vercel.app
   ```

---

## 🔗 Part 3: Connect Frontend and Backend

### Update Backend CORS Settings

Now that frontend is deployed, update backend environment variables:

1. **Go to Render Dashboard**
   - Navigate to your `navflow-api` web service
   - Go to "Environment" tab

2. **Update CORS_ALLOWED_ORIGINS**
   ```
   CORS_ALLOWED_ORIGINS=https://your-project-name.vercel.app,http://localhost:3000
   ```
   
   **Replace `your-project-name.vercel.app` with your actual Vercel domain**

3. **Update ALLOWED_HOSTS**
   ```
   ALLOWED_HOSTS=navflow-api.onrender.com,localhost
   ```

4. **Save and Redeploy**
   - Click "Save Changes"
   - Render will automatically redeploy (takes 2-3 minutes)

---

## ✅ Part 4: Verify Deployment

### Test Backend

1. **API Endpoints**
   ```bash
   # Health check
   curl https://navflow-api.onrender.com/api/v1/health/
   
   # Should return: {"status": "healthy"}
   ```

2. **API Documentation**
   - Visit: `https://navflow-api.onrender.com/api/v1/schema/swagger-ui/`
   - You should see interactive API documentation

### Test Frontend

1. **Visit Your App**
   - Go to: `https://your-project-name.vercel.app`

2. **Test Registration**
   - Try creating a new account
   - Verify you receive a response

3. **Test Login**
   - Login with credentials
   - Check if you can access dashboard

4. **Check Browser Console**
   - Open Developer Tools (F12)
   - Console tab should show: "API Configuration: { API_URL: 'https://navflow-api.onrender.com', ... }"
   - No CORS errors should appear

---

## 🔧 Part 5: Database Management

### Access PostgreSQL Database

#### Option 1: Via Render Shell
```bash
# In Render Dashboard → navflow-db → "Connect" → "External Connection"
# Copy the PSQL Command and run locally:
psql postgresql://user:password@host/database
```

#### Option 2: Using pgAdmin or DBeaver
```
Host: <from Render database page>
Port: 5432
Database: navflow_db
User: navflow_user
Password: <from Render database page>
SSL: Required
```

### Run Migrations

```bash
# In Render web service shell:
python manage.py migrate

# Check migration status:
python manage.py showmigrations
```

### Create Database Backup

Render Free tier doesn't include automated backups. Manual backup:

```bash
# On your local machine with database URL from Render:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Or from Render shell:
pg_dump $DATABASE_URL > backup.sql
```

### Restore Database

```bash
# From local machine:
psql $DATABASE_URL < backup.sql

# Or specific file:
psql postgresql://user:password@host/database < backup_20260129.sql
```

---

## 🚀 Part 6: Post-Deployment Setup

### 1. Create Initial Data

**Via Django Admin:**
1. Go to `https://navflow-api.onrender.com/admin/`
2. Login with superuser credentials
3. Create test organizations, projects, etc.

**Via API:**
Use the Swagger UI at `/api/v1/schema/swagger-ui/` to interact with your API

### 2. Set Up Custom Domain (Optional)

**Frontend (Vercel):**
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed

**Backend (Render):**
1. Go to Web Service → Settings → Custom Domains
2. Add your custom domain
3. Configure DNS with CNAME record

### 3. Configure Email (Optional)

If your app sends emails, add to Render environment variables:

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

---

## 🐛 Troubleshooting

### Backend Issues

#### Build Fails
```bash
# Check Render logs
# Common issues:
# 1. Missing requirements.txt dependencies
# 2. Wrong Python version
# 3. Migration errors

# Solution:
# - Check logs in Render Dashboard → Logs tab
# - Verify requirements.txt is complete
# - Ensure PYTHON_VERSION is set to 3.11.0
```

#### 500 Internal Server Error
```bash
# Check Django logs in Render
# Usually caused by:
# 1. Missing environment variables
# 2. Database connection issues
# 3. SECRET_KEY not set

# Solution:
# - Verify all environment variables are set
# - Check DATABASE_URL is correct
# - Generate new SECRET_KEY if needed
```

#### Database Connection Error
```bash
# Error: "could not connect to server"
# Solutions:
# 1. Check DATABASE_URL format
# 2. Ensure database is in same region
# 3. Wait 5 minutes after database creation
# 4. Check database is running (not suspended)
```

### Frontend Issues

#### API Connection Failed
```bash
# Error: "Network Error" or "Failed to fetch"
# Check:
# 1. NEXT_PUBLIC_API_URL is correct
# 2. Backend CORS_ALLOWED_ORIGINS includes Vercel domain
# 3. Backend is running (visit API URL directly)
# 4. No trailing slash in API URL

# In browser console:
console.log(process.env.NEXT_PUBLIC_API_URL)
# Should show: https://navflow-api.onrender.com
```

#### Build Fails on Vercel
```bash
# Common causes:
# 1. Missing dependencies in package.json
# 2. TypeScript errors
# 3. Wrong root directory

# Solution:
# - Check build logs in Vercel
# - Verify root directory is "frontend-nextjs"
# - Run "npm run build" locally to test
```

#### Next.js Version Not Detected
```bash
# Error: "No Next.js version detected. Make sure your package.json..."
# This means Vercel is looking in the wrong directory

# Solution:
# 1. Go to Project Settings → General
# 2. Set "Root Directory" to: frontend-nextjs
# 3. Click "Save"
# 4. Redeploy: Deployments → click "..." → Redeploy

# Verify locally:
cd frontend-nextjs
cat package.json | grep "next"
# Should show: "next": "16.1.5"
```

#### Environment Variables Not Working
```bash
# Issue: API calls going to localhost
# Solution:
# 1. Check variable names start with NEXT_PUBLIC_
# 2. Redeploy after adding variables
# 3. Clear Vercel cache: Settings → Clear Cache & Redeploy
```

### CORS Issues

```bash
# Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
# Solutions:
# 1. Add Vercel domain to CORS_ALLOWED_ORIGINS in Render
# 2. Include https:// prefix
# 3. No trailing slash
# 4. Redeploy backend after changes

# Correct format:
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

### Database Issues

#### Migrations Not Applied
```bash
# Run in Render Shell:
python manage.py migrate
python manage.py showmigrations

# Check if all migrations are applied
# If not, run specific migration:
python manage.py migrate app_name migration_name
```

#### Database Full (Free Tier Limit)
```bash
# Free tier: 1 GB limit
# Check usage in Render Dashboard → Database → Metrics

# Solutions:
# 1. Delete old data
# 2. Upgrade to paid plan
# 3. Optimize queries
```

---

## 📊 Monitoring & Maintenance

### Check Application Health

**Backend Health Check:**
```bash
curl https://navflow-api.onrender.com/api/v1/health/
```

**Frontend:**
- Visit your Vercel URL
- Should load without errors

### Monitor Logs

**Render Logs:**
- Dashboard → Web Service → Logs tab
- Real-time application logs

**Vercel Logs:**
- Project → Deployments → Click deployment → View Function Logs

### Performance Monitoring

**Render:**
- Dashboard → Metrics tab
- CPU, Memory, Request count

**Vercel:**
- Analytics tab (available in Pro plan)
- Page views, performance metrics

---

## 🔄 Continuous Deployment

### Automatic Deployments

Both Render and Vercel support automatic deployment:

**When you push to main branch:**
1. Backend automatically redeploys on Render
2. Frontend automatically redeploys on Vercel
3. Both complete in 5-10 minutes

**To disable auto-deploy:**
- **Render:** Settings → Build & Deploy → Auto-Deploy (toggle off)
- **Vercel:** Settings → Git → Ignored Build Step

### Manual Deploy

**Render:**
```bash
# Dashboard → Web Service → Manual Deploy → "Deploy latest commit"
```

**Vercel:**
```bash
# Install Vercel CLI:
npm install -g vercel

# Deploy from local:
cd frontend-nextjs
vercel --prod
```

---

## 💰 Cost & Limitations

### Free Tier Limits

**Render (Free):**
- ✅ 750 hours/month
- ✅ 512 MB RAM
- ✅ Auto-sleep after 15 min inactivity (first request takes ~30s)
- ✅ 1 GB PostgreSQL storage
- ❌ No custom domains on free tier for database
- ❌ Services may spin down

**Vercel (Hobby - Free):**
- ✅ 100 GB bandwidth/month
- ✅ 6,000 build minutes/month
- ✅ Unlimited deployments
- ✅ Custom domains included
- ✅ Automatic SSL
- ❌ No commercial use
- ❌ 10 second function timeout

### Upgrade Recommendations

**For Production:**
- Render: $7/month (Starter plan) - No sleep, more resources
- Vercel: $20/month (Pro plan) - Commercial use, more bandwidth
- Database: $7/month (Render PostgreSQL) - Better performance, backups

---

## 🔒 Security Checklist

Before going live:

- [ ] **SECRET_KEY is strong and unique** (use Render's generate button)
- [ ] **DEBUG=False** in production
- [ ] **ALLOWED_HOSTS** is restricted to your domains
- [ ] **CORS_ALLOWED_ORIGINS** only includes your frontend domain
- [ ] **SSL is enabled** (automatic on Render and Vercel)
- [ ] **Database credentials** are secure (auto-generated by Render)
- [ ] **No sensitive data in Git** (check .gitignore)
- [ ] **Dependencies are up to date** (no critical vulnerabilities)
- [ ] **Regular backups** scheduled (manual on free tier)

---

## 📚 Additional Resources

### Documentation
- [Django Deployment Checklist](https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

### Support
- Render Status: https://status.render.com/
- Vercel Status: https://www.vercel-status.com/
- NavFlow Issues: (your GitHub repo issues page)

---

## 🎉 Deployment Complete!

Your NavFlow application is now live:

- 🌐 **Frontend**: `https://your-project-name.vercel.app`
- 🔧 **Backend API**: `https://navflow-api.onrender.com`
- 📖 **API Docs**: `https://navflow-api.onrender.com/api/v1/schema/swagger-ui/`
- 👨‍💼 **Admin**: `https://navflow-api.onrender.com/admin/`

**Next Steps:**
1. Test all features thoroughly
2. Create initial organizations and projects
3. Invite team members
4. Monitor logs for any issues
5. Set up regular database backups
6. Consider upgrading to paid plans for better performance

**Need Help?**
- Check troubleshooting section above
- Review deployment logs
- Contact support: Render (support@render.com) or Vercel (support@vercel.com)

---

*Last Updated: January 2026*
*NavFlow Deployment Guide v1.0*
