# Environment Variables for Deployment

## For Render Deployment

Add these environment variables in Render -> Environment:

```ini
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?pgbouncer=true
DIRECT_URL=postgresql://USER:PASSWORD@HOST/DBNAME
NODE_ENV=production
JWT_SECRET=CHANGE_ME_openssl_rand_base64_32
FRONTEND_ORIGIN=https://your-frontend-domain.com
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=your_r2_bucket
R2_PUBLIC_URL=https://your-public-r2-domain
R2_REGION=auto
```

Important Notes:
- Do add `DATABASE_URL`, `NODE_ENV`, `JWT_SECRET`, and `FRONTEND_ORIGIN`.
- Do not add `PORT` (Render injects it).
- JWT_SECRET: Use a strong, random secret (`openssl rand -base64 32`).
- Do **not** set `SEED_DEFAULT_ADMIN=true` or `RUN_SCHEMA_INIT=true` in production.
- Do **not** set `ALLOW_DATA_URL_STORAGE=true` in production.

## Current Local Values (.env file)

Your local `backend/.env` should contain:

```ini
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/unique_precision
DIRECT_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/unique_precision
JWT_SECRET=CHANGE_ME_local_dev_secret
FRONTEND_ORIGIN=http://localhost:5173

# Optional local helpers (never in production)
# RUN_SCHEMA_INIT=true
# SEED_DEFAULT_ADMIN=true
# ALLOW_DATA_URL_STORAGE=true

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
R2_REGION=auto
```

## Security Warning

Never commit `.env` files to Git.
- The `.gitignore` file is configured to exclude `.env` and `.env.local` files.
- Keep credentials in your hosting platform environment variables.
