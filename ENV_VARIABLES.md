# Environment Variables for Deployment

## For Render Deployment

Add these environment variables in Render -> Environment:

```ini
DATABASE_URL=postgresql://user:password@host/dbname
NODE_ENV=production
JWT_SECRET=supersecretkey
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=your_r2_bucket
R2_PUBLIC_URL=https://your-public-r2-domain
R2_REGION=auto
```

Important Notes:
- Do add `DATABASE_URL`, `NODE_ENV`, and `JWT_SECRET`.
- Do not add `PORT` (Render injects it).
- JWT_SECRET: Use a strong, random secret key in production (e.g., generate with `openssl rand -base64 32`).

## Current Local Values (.env file)

Your local `.env` file should contain:

```ini
PORT=5000
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=supersecretkey
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
R2_REGION=auto
```

## Security Warning

Never commit `.env` files to Git.
- The `.gitignore` file is configured to exclude `.env` and `.env.*` files.
- Keep credentials in your hosting platform environment variables.