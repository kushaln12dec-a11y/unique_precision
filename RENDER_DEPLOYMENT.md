# Render Deployment Configuration

## ✅ Fix A Implemented - Root package.json

The root `package.json` has been created with the correct build and start scripts.

## Render Settings (IMPORTANT)

In your Render dashboard, configure these settings:

### Settings Tab:

| Setting | Value |
|---------|-------|
| **Root Directory** | (leave EMPTY - blank) |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |

⚠️ **DO NOT set Root Directory to `backend` or `src`** - leave it empty!

## Environment Variables

Add these in Render → Environment:

```ini
MONGO_URI=mongodb+srv://admin:ZAQzaq%40123@cluster0.dwpgvyr.mongodb.net/?appName=Cluster0
NODE_ENV=production
```

❌ **DO NOT add PORT** - Render automatically injects it.

## How It Works

1. **Build Process** (`npm run build`):
   - Installs frontend dependencies
   - Builds frontend (creates `frontend/dist/`)
   - Installs backend dependencies
   - Builds backend TypeScript (creates `backend/dist/`)

2. **Start Process** (`npm start`):
   - Runs `cd backend && npm start`
   - Starts the backend server from `backend/dist/index.js`
   - Backend serves the frontend static files from `frontend/dist/`

## Verification

After deploying, you should see in Render logs:
```
Running npm run build
Building frontend...
Building backend...
Server running on port xxxx
```

## File Structure

```
unique-precision/
├── package.json          ← Root package.json (NEW - for Render)
├── backend/
│   ├── package.json      ← Backend dependencies
│   ├── dist/             ← Built backend files
│   └── server/src/       ← Backend source
├── frontend/
│   ├── package.json      ← Frontend dependencies
│   ├── dist/             ← Built frontend files (served by backend)
│   └── src/              ← Frontend source
└── .gitignore
```
