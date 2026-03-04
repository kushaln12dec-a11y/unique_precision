# Environment Variables for Deployment

## For Render Deployment

Add these environment variables in Render → Environment:

```ini
MONGO_URI=mongodb+srv://admin:ZAQzaq%40123@cluster0.dwpgvyr.mongodb.net/?appName=Cluster0
NODE_ENV=production
JWT_SECRET=supersecretkey
```

**Important Notes:**
- ✅ **DO add** `MONGO_URI`, `NODE_ENV`, and `JWT_SECRET`
- ❌ **DO NOT add** `PORT` (Render automatically injects it)
- 🔐 **JWT_SECRET**: Use a strong, random secret key in production (e.g., generate with `openssl rand -base64 32`)

## Current Local Values (.env file)

Your local `.env` file should contain:
```
PORT=5000
MONGO_URI=mongodb+srv://admin:ZAQzaq%40123@cluster0.dwpgvyr.mongodb.net/?appName=Cluster0
JWT_SECRET=supersecretkey
```

## Security Warning

⚠️ **Never commit `.env` files to Git!** 
- The `.gitignore` file is already configured to exclude `.env` files
- Make sure your MongoDB password is kept secure
- Consider using environment variables in your hosting platform instead of hardcoding
