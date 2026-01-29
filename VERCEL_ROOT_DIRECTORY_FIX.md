# 🎯 Vercel Root Directory - Visual Guide

## The Problem You're Having

Your error:
```
npm error path /vercel/path0/package.json
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory
```

**Why this happens:** Vercel is looking for `package.json` in the wrong folder.

## Your Project Structure

```
NavFlow/  (Git repository root)
├── navflow/           ← Django backend
├── accounts/          ← Django app
├── projects/          ← Django app
├── manage.py
├── requirements.txt
│
└── frontend-nextjs/   ← Your Next.js app IS HERE! 
    ├── package.json   ← Vercel needs to find THIS file
    ├── next.config.ts
    ├── app/
    └── components/
```

**Problem:** Vercel defaults to looking in `NavFlow/` (root)  
**Solution:** Tell Vercel to look in `NavFlow/frontend-nextjs/`

---

## How to Fix It - Step by Step

### Option 1: Fix During Initial Import (Before First Deploy)

**When you see the import screen:**

1. **Import Git Repository**
   - You'll see your repository name
   - Click "Import"

2. **Configure Project Screen** ⬅️ THIS IS WHERE YOU FIX IT
   
   Look for these fields:
   ```
   ┌─────────────────────────────────────────┐
   │ Framework Preset: Next.js               │ ← Should auto-detect
   ├─────────────────────────────────────────┤
   │ Root Directory: ./        [Edit]        │ ← CLICK "Edit" HERE!
   ├─────────────────────────────────────────┤
   │ Build and Output Settings               │
   │   Build Command: npm run build          │
   │   Output Directory: .next               │
   │   Install Command: npm install          │
   └─────────────────────────────────────────┘
   ```

3. **Click "Edit" next to Root Directory**
   
   A text box appears:
   ```
   Root Directory
   ┌─────────────────────────────────────────┐
   │ frontend-nextjs                         │ ← Type this EXACTLY
   └─────────────────────────────────────────┘
   [Cancel] [Save]
   ```
   
   - Type: `frontend-nextjs`
   - Click "Save"

4. **Verify it changed**
   ```
   Root Directory: ./frontend-nextjs  ✓
   ```

5. **Add Environment Variables**
   - Click "Environment Variables"
   - Add: `NEXT_PUBLIC_API_URL`
   - Add: `NEXT_PUBLIC_API_BASE_PATH`

6. **Click "Deploy"**

---

### Option 2: Fix After Failed Deployment (Your Current Situation)

**You already deployed and it failed. Here's how to fix it:**

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Find your project (probably called "nav-flow" or "NavFlow")
   - Click on it

2. **Go to Settings**
   ```
   [Overview] [Deployments] [Analytics] [Settings] ← Click this
   ```

3. **Click "General" (should already be selected)**
   ```
   Settings
   ├─ [General]        ← You're here
   ├─ Domains
   ├─ Environment Variables
   ├─ Git
   └─ ...
   ```

4. **Scroll down to "Root Directory" section**
   
   You'll see:
   ```
   Build & Development Settings
   
   Root Directory
   The directory within your project where your code is located.
   Leave this field empty if your code is located in the root directory.
   
   Root Directory: ./        [Edit]  ← CLICK "Edit"
   ```

5. **Click "Edit"**
   
   Text box appears:
   ```
   Root Directory
   ┌─────────────────────────────────────────┐
   │                                         │ ← Currently empty
   └─────────────────────────────────────────┘
   Type the name of the directory (e.g., "packages/web")
   ```

6. **Type: `frontend-nextjs`**
   ```
   Root Directory
   ┌─────────────────────────────────────────┐
   │ frontend-nextjs                         │ ← Type this
   └─────────────────────────────────────────┘
   ```

7. **Click "Save"**
   
   You'll see a confirmation message:
   ```
   ✓ Root Directory updated successfully
   ```
   
   And the display changes to:
   ```
   Root Directory: ./frontend-nextjs  ✓
   ```

8. **Redeploy**
   - Go to "Deployments" tab at the top
   - Find your latest (failed) deployment
   - Click the "..." (three dots) menu
   - Click "Redeploy"
   - Confirm "Redeploy"

9. **Watch the build**
   - Should succeed this time!
   - Build time: ~2-3 minutes

---

## Verification

**After setting Root Directory correctly, your build logs should show:**

```
✓ Cloning completed
✓ Running "install" command: `npm install`...
✓ Installing dependencies...
✓ Detected Next.js version: 16.1.5
✓ Building Next.js application
✓ Build completed successfully
```

**Before the fix, you saw:**
```
✗ npm error path /vercel/path0/package.json
✗ npm error enoent Could not read package.json
```

---

## Why This Happens

**Monorepo Structure:** Your project has both frontend and backend in one repository:
- Backend: Python/Django in root folder
- Frontend: Next.js in `frontend-nextjs/` subfolder

**Vercel's Default:** Looks in repository root for `package.json`

**Your Reality:** `package.json` is in `frontend-nextjs/` subfolder

**Solution:** Tell Vercel where to look using "Root Directory" setting

---

## Common Mistakes

❌ **Wrong:**
- Leaving Root Directory empty
- Setting it to `.` or `./`
- Setting it to `/frontend-nextjs` (no leading slash needed)
- Typo: `frontend-next` or `frontendnextjs`

✅ **Correct:**
- `frontend-nextjs` (exactly as written, no slashes)

---

## Still Not Working?

### Check 1: Verify folder name is correct
```bash
# In your local terminal:
cd E:\.Projects\NavFlow
dir

# You should see:
#   frontend-nextjs/  ← This folder exists?

cd frontend-nextjs
dir

# You should see:
#   package.json  ← This file exists?
```

### Check 2: Make sure changes are pushed to Git
```bash
git status
# Should show: "nothing to commit, working tree clean"

git push origin main
# Make sure latest code is on GitHub
```

### Check 3: Try "Use Latest Commit"
In Vercel:
- Deployments → ... → Redeploy
- Select "Use existing Build Cache" = OFF
- Click "Redeploy"

---

## Summary

**One Setting to Rule Them All:**
```
Settings → General → Root Directory → Edit → "frontend-nextjs" → Save → Redeploy
```

That's it! Your build will succeed after this change.

---

*For complete deployment guide, see: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)*  
*For quick checklist, see: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)*
