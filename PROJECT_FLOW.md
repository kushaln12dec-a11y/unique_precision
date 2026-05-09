# Project Architecture & Data Flow

This document outlines the end-to-end architecture and data flow of the Unique Precision application.

## 🏗️ High-Level Architecture

The application follows a modern full-stack architecture:

- **Frontend:** React (Vite) + Vanilla CSS + Lucide Icons.
- **Backend:** Node.js (Express) + TypeScript.
- **Database:** PostgreSQL (Neon) with Prisma ORM.
- **Real-time:** Socket.IO for live job updates.
- **Cache:** Redis (Upstash) for dashboard metrics.

---

## 🔄 Request Lifecycle (e.g., Saving a Job)

### 1. Frontend Interaction
A user (e.g., a Programmer) fills out a job form in `ProgrammerJobForm.tsx`. When they click **Save Job**:
- `useJobHandlers.ts` performs preliminary client-side validation.
- It calculates totals (Hours/Amount) using `programmerUtils.ts`.
- It calls the `jobApi.createJobs` service.

### 2. API Entry & Validation
The request hits the Express server:
- **Auth Middleware:** `auth.ts` verifies the JWT token and the user's role.
- **Validator:** `job.validator.ts` uses **Zod** to strictly validate the request body. If data is malformed, a `400 Bad Request` is returned immediately.

### 3. Service Layer (Business Logic)
The `job.service.ts` processes the request:
- It generates a unique `refNumber` using a database counter.
- It uses `job.service.helpers.ts` to normalize the data (e.g., ensuring `groupId` is a `BigInt`).
- It calculates any missing values using `jobCalculation.service.ts`.

### 4. Database Transaction
Prisma executes a `prisma.$transaction`:
- The job records are created in the `Job` table.
- All related records (like metadata or initial status) are saved atomically.
- If any part fails, the entire operation is rolled back to prevent partial data.

### 5. Post-Save Actions
Once the database is updated:
- **Real-time Broadcast:** `emitJobsUpdated` (Socket.IO) notifies all connected clients that a job was updated.
- **Cache Invalidation:** The Dashboard cache is invalidated so the next summary fetch gets fresh data.
- **Response:** The server returns the created job object to the frontend.

---

## 🛠️ Key Modules

### Programmer Module
- Handles job creation, editing, and technical specifications.
- Features: Image uploads, SEDM calculations, and setting-wise breakdown.

### Operator Module
- Used for logging actual production time and machine hours.
- Logic: `operatorShared.ts` rebalances revenue based on actual worked time vs. estimated time.

### QC Module
- Handles quality assurance decisions (Approve/Reject).
- Logic: Updates `qaStates` and triggers notifications if rework is needed.

### Dashboard
- Aggregates data from `Job` and `EmployeeLog` tables.
- Uses Redis caching to provide instant performance metrics for Admins and Accountants.
