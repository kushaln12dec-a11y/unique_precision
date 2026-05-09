# Production Fix Guide: Resolving 500 Errors

This guide explains why the **500 Internal Server Error** occurred in production and how to verify the fix in your Server (Render) and Database (Neon) dashboards.

## 1. Why it happened (The Technical Cause)

The 500 error was not caused by a "bug" in the UI, but by a **resource conflict** in production:

1.  **Connection Limits:** The code was using the `DIRECT_URL` (Direct database connection) instead of the `DATABASE_URL` (Connection Pooler). Neon's direct connections are limited to a very small number (usually 1-5). Under load, the backend would run out of connections and crash.
2.  **Serialization Crash:** The `groupId` field is a `BigInt`. When the backend tried to save this to the Dashboard Cache (Redis), JavaScript's `JSON.stringify` would throw a fatal error because it doesn't support BigInt by default.

---

## 2. How to see the fix in Action

### A. Monitor Connection Usage (Neon Dashboard)
Go to your **Neon Console** -> **Monitoring** tab.
- **Before Fix:** You would have seen "Active Connections" spiking and hitting the limit, often followed by "Connection Refused" errors.
- **After Fix:** You should see connections staying stable. Because we now use the `DATABASE_URL` (which includes `?pgbouncer=true` or similar), the pooler handles hundreds of virtual connections using just a few physical ones.

### B. Check Backend Logs (Render Dashboard)
Go to your **Render Dashboard** -> **Events/Logs**.
- **Before Fix:** You would see generic `TypeError: Do not know how to serialize a BigInt` or `PrismaClientInitializationError`.
- **After Fix:**
    - You will see successful `201 POST /api/jobs` logs.
    - If a real database error occurs (like a timeout), you will now see a detailed log starting with `[Prisma Error PXXXX]`, thanks to the updated error middleware.

---

## 3. How to fix this "Outside the Code" (Settings)

If you ever encounter this again without changing code, check these settings:

### In Render (Environment Variables):
- Ensure `DATABASE_URL` is set to the **Pooled** connection string provided by Neon.
- Ensure `DIRECT_URL` is set to the **Direct** connection string (this is only used for migrations now).
- Verify `NODE_ENV` is set to `production`.

### In Neon (Database Settings):
- Go to **Settings** -> **Connection Pooling**.
- Ensure the Pooler is **Enabled**.
- If traffic increases significantly, you can increase the "Pool Size" in Neon settings to allow more concurrent backend processes.

---

## 🔧 Summary of Code Changes
- **`prisma.ts`**: Swapped priority to `DATABASE_URL` first. Added `BigInt.prototype.toJSON` polyfill.
- **`error.middleware.ts`**: Added specific catching for Prisma `P` series errors to provide better logs.
