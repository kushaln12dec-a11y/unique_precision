-- Migration: add_idle_reason_and_login_slide
-- Adds requiresReason to IdleTimeConfig and creates LoginSlide model

-- Add requiresReason column to IdleTimeConfig (safe, backward-compatible)
ALTER TABLE "IdleTimeConfig" ADD COLUMN IF NOT EXISTS "requiresReason" BOOLEAN NOT NULL DEFAULT false;

-- Create LoginSlide table
CREATE TABLE IF NOT EXISTS "LoginSlide" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "subtitle"    TEXT,
    "content"     TEXT NOT NULL,
    "highlight"   TEXT,
    "imageUrl"    TEXT,
    "buttonLabel" TEXT,
    "buttonUrl"   TEXT,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoginSlide_isActive_idx" ON "LoginSlide"("isActive");
CREATE INDEX IF NOT EXISTS "LoginSlide_sortOrder_idx" ON "LoginSlide"("sortOrder");
