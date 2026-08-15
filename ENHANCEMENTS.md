# Unique Precision — Enhancements & Hardening

Summary of improvements applied on the `feature/newfixes` workstream (security audit fixes + product enhancements).

---

## 1. Security & auth hardening

### Login & passwords
- Removed role-name password login backdoor (`admin` / `operator` / etc. as fallback passwords).
- Removed login shortcut where identifier `admin` matched any `ADMIN` user.
- Stopped storing/returning plaintext `passwordText` in API responses.
- User create/update no longer persists plaintext passwords for clients to read back.
- Import script now assigns **random temporary passwords** instead of role-named defaults.
- Default boot-time admin seed (`rakis@gmail.com` / `raki123`) is gated behind:
  - `SEED_DEFAULT_ADMIN=true`
  - and non-production only.
- JWT signing/verification pinned to `HS256`.
- Added **Change Password** API: `POST /api/auth/change-password` (authenticated).
- Header user pill opens a **Change Password** modal.

### Frontend auth / session
- `ProtectedRoute` now supports `allowedRoles` and blocks expired tokens.
- Routes gated by role (Users, Admin Console, QC, Programmer, Operator, Billed Jobs, Job Logs).
- Central `apiFetch` clears token, disconnects socket, and redirects to `/login` on **401**.
- Socket disconnects on logout; operator drafts cleared on logout.
- JWT decode uses proper base64 padding; missing tokens no longer send `Authorization: Bearer null`.

### Backend RBAC & API safety
- Idle-time config mutations restricted to **ADMIN**.
- Operator assignment guard enforced (operators can only set themselves; admins/programmers unrestricted).
- Employee-log write routes role-scoped; complete-by-logId requires ownership or admin.
- Upload routes role-limited; SVG uploads rejected.
- Data URL image storage rejected in production (unless explicitly allowed).
- CORS + Socket.IO origins allowlisted via `FRONTEND_ORIGIN` (dev still allows localhost/127.0.0.1 any port).
- `trust proxy` enabled; morgan uses `combined` in production.
- Schema auto-init gated by `RUN_SCHEMA_INIT=true`.
- Production exits if database connection fails.
- Dashboard cache invalidation on job mutations.
- Non-admin dashboard responses scoped to allowed views.
- Job update path validated with Zod allowlist schema.
- Operator capture overlap checks run inside a transaction with `FOR UPDATE` (TOCTOU fix).
- Money/hours mapped as decimal strings (precision-safe) instead of lossy `Number()` where updated.

---

## 2. State management & shop-floor reliability

- Operator quantity/range **overlap failures are no longer treated as success**.
- Operator draft localStorage is **per-user** (not shared across shop-floor logins).
- Operator reload/sync merges more draft fields (end time, idle, images, pause sessions).
- Stale load generations ignored to reduce race overwrites.
- Auto-assignment sync debounced; avoids PATCH storms during reload.
- Dead `programmerJobs` localStorage fallback removed (show errors instead of stale empty data).
- Client `groupId` generation improved (server-preferred allocation path).

---

## 3. UI / UX enhancements

### Role-based landing (after login / `/`)
| Role | Lands on |
|------|----------|
| OPERATOR | `/operator` |
| PROGRAMMER | `/programmer` |
| QC | `/qc` |
| ACCOUNTANT | `/billed-jobs` |
| ADMIN (default) | `/dashboard` |

### Operator page
- **Unsaved changes guard**: browser close/refresh warning.
- Confirm before leaving via sidebar/header navigation.
- Dirty flag clears after successful save.
- Conflict/overlap backend messages surfaced in toasts.
- Empty/error states improved (no fake loader-only empty view).

### Other UI
- Notification badge polls while header is mounted (not only when modal opens).
- QC list pagination / load-more support.
- Shared `Modal` accessibility: `role="dialog"`, Escape, basic focus trap.
- Login loading state cleared in `finally`.
- Dashboard initial view initialized from token role (less ADMIN flash).
- Programmer filter clear mirrors full operator clear behavior.

---

## 4. Performance enhancements

### Dashboard (`GET /api/dashboard/summary`)
- Jobs/logs queried with **date-scoped Prisma filters** (not unbounded full-table pulls).
- Logs capped at **5,000** newest rows.
- Lean `select` projections (only fields needed for metrics).
- Builds **only the requested view** payload (admin still switches views via refetch).
- Redis/cache still used; invalidation wired on job writes.

---

## 5. Local setup & config improvements

### Env files
- `frontend/.env` — `VITE_API_URL=http://localhost:5000`
- `backend/.env` / `.env.example` — local Postgres, JWT, optional Redis/R2
- `FRONTEND_ORIGIN` documented and set for Vite ports (`5173`/`5174`, localhost & 127.0.0.1)

### Prisma / seed tooling
- Seed script uses `--transpile-only` to avoid TS compile failures.
- Documented create-DB → migrate/apply SQL → seed → idle-time seed flow.
- `ENV_VARIABLES.md` updated for production vs local flags:
  - Do **not** enable `SEED_DEFAULT_ADMIN` / `RUN_SCHEMA_INIT` / `ALLOW_DATA_URL_STORAGE` in production.

### CORS fix note
- Vite often binds **5174** when 5173 is busy; CORS now allows local Vite hosts/ports in development so login OPTIONS requests succeed.

---

## 6. New / updated endpoints & helpers

| Item | Purpose |
|------|---------|
| `POST /api/auth/change-password` | Authenticated password change |
| `frontend/src/utils/homeRoute.ts` | Role → home path mapping |
| `frontend/src/utils/apiClient.ts` | Shared `apiFetch` + 401 handling |
| `frontend/src/components/ChangePasswordModal.tsx` | Password change UI |
| `invalidateDashboardCache()` | Clears dashboard cache keys after writes |

---

## 7. Suggested next improvements (not done yet)

- Full password-reset-by-email flow
- Redis + Socket.IO Redis adapter for multi-instance production
- Drop `passwordText` column via Prisma migration
- Unique DB constraint on `refNumber`
- Broader E2E test suite + Sentry/error monitoring
- Further dashboard SQL aggregations (less JS post-processing)

---

## 8. How to verify quickly

1. Restart backend + frontend.
2. Login as different roles and confirm landing pages.
3. Click header user pill → change password.
4. Open Operator job detail, edit inputs, try navigating away → confirm warning.
5. Open Dashboard and switch views; confirm faster/stable loads.
6. Confirm unauthorized roles cannot open `/users`, `/admin-console`, etc. via URL.
