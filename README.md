# NavFlow - Task Management Platform

A modern, full-stack task management platform with Django REST backend and Next.js frontend.

## 🚀 Quick Start

### Local Development

**Backend (Django):**
```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

**Frontend (Next.js):**
```bash
cd frontend-nextjs

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with API URL

# Run development server
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1/
- API Docs: http://localhost:8000/api/v1/schema/swagger-ui/
- Django Admin: http://localhost:8000/admin/

## 📦 Production Deployment

### Prerequisites
- GitHub/GitLab account with code pushed
- Render account (https://render.com)
- Vercel account (https://vercel.com)

### Quick Deployment Guide

**Total Time: ~25 minutes**

1. **Deploy Backend to Render** (10 min)
   - Create PostgreSQL database
   - Create Web Service
   - Configure environment variables
   - Deploy

2. **Deploy Frontend to Vercel** (5 min)
   - Import repository
   - Set root directory to `frontend-nextjs`
   - Add environment variables
   - Deploy

3. **Connect Services** (2 min)
   - Update CORS settings in Render
   - Test deployment

### Detailed Instructions

📖 **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Step-by-step instructions with screenshots

✅ **[Quick Checklist](DEPLOYMENT_CHECKLIST.md)** - Fast deployment checklist

### Verification

After deployment, run the verification script:

**Windows (PowerShell):**
```powershell
.\verify_deployment.ps1
```

**Linux/Mac:**
```bash
chmod +x verify_deployment.sh
./verify_deployment.sh
```

## 🗂️ Project Structure

```
NavFlow/
├── accounts/              # User authentication app
├── orgs/                  # Organizations app
├── projects/              # Projects app
├── navflow/               # Django settings
├── frontend-nextjs/       # Next.js frontend
│   ├── app/              # Next.js 13+ app directory
│   ├── components/       # React components
│   └── lib/              # API client & utilities
├── requirements.txt       # Python dependencies
├── render.yaml           # Render deployment config
├── vercel.json           # Vercel deployment config
├── DEPLOYMENT_GUIDE.md   # Detailed deployment guide
└── DEPLOYMENT_CHECKLIST.md # Quick deployment checklist
```

## 🛠️ Technology Stack

**Backend:**
- Django 6.0
- Django REST Framework
- PostgreSQL
- JWT Authentication
- Swagger/OpenAPI docs

**Frontend:**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Zustand (State management)
- React Query

**Deployment:**
- Render (Backend + PostgreSQL)
- Vercel (Frontend)

## 📝 Environment Variables

### Backend (.env)
```bash
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://...
ALLOWED_HOSTS=your-domain.com
CORS_ALLOWED_ORIGINS=https://your-frontend.com
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.com
NEXT_PUBLIC_API_BASE_PATH=/api/v1
```

See [.env.example](.env.example) and [.env.production.example](.env.production.example) for details.

## 🔧 Useful Scripts

### Database Management

**Backup Database:**
```bash
# Linux/Mac
chmod +x backup_database.sh
export DATABASE_URL='postgresql://...'
./backup_database.sh

# Windows
$env:DATABASE_URL="postgresql://..."
# Use pg_dump command from backup_database.sh
```

**Run Migrations:**
```bash
python manage.py migrate
```

**Create Superuser:**
```bash
python manage.py createsuperuser
```

### Development

**Backend Tests:**
```bash
python manage.py test
```

**Frontend Build:**
```bash
cd frontend-nextjs
npm run build
```

## 📚 API Documentation

Once deployed, visit:
- Swagger UI: `https://your-backend.com/api/v1/schema/swagger-ui/`
- ReDoc: `https://your-backend.com/api/v1/schema/redoc/`
- OpenAPI Schema: `https://your-backend.com/api/v1/schema/`

## 🔒 Security

- SECRET_KEY is randomly generated for production
- DEBUG=False in production
- HTTPS enforced on Render and Vercel
- CORS restricted to frontend domain
- PostgreSQL with SSL
- JWT tokens with secure settings

## 💰 Deployment Costs

**Free Tier:**
- Render Backend: Free (sleeps after 15 min inactivity)
- Render PostgreSQL: Free (1 GB storage)
- Vercel Frontend: Free (hobby tier)

**Recommended for Production:**
- Render Starter: $7/month (no sleep, 512 MB RAM)
- Render PostgreSQL: $7/month (256 MB RAM, backups)
- Vercel Pro: $20/month (commercial use, more bandwidth)

## 🐛 Troubleshooting

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) troubleshooting section for:
- Backend 500 errors
- CORS issues
- Database connection problems
- Build failures
- Environment variable issues

## 📖 Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete deployment walkthrough
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Quick deployment checklist
- [.env.example](.env.example) - Development environment template
- [.env.production.example](.env.production.example) - Production environment template

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📄 License

[Your License Here]

## 🆘 Support

- GitHub Issues: [Your Repo URL]/issues
- Documentation: See DEPLOYMENT_GUIDE.md
- Render Support: support@render.com
- Vercel Support: support@vercel.com

---

**Ready to deploy?** Start with the [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)!
