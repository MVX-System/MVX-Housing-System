-- MVX Facility Profile Schema
-- PR-2I
--
-- Purpose:
-- Store the public identity of the single facility served by
-- the current environment.
--
-- IMPORTANT:
-- This table does not implement multi-facility scoping.
-- One environment currently serves one facility.
-- A separate Facility Scoping Migration is required before
-- multiple facilities may share the same Main D1 database.
--
-- This migration is intentionally idempotent.
-- Environment-specific facility data must be inserted separately.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS facility_profile (
  id INTEGER PRIMARY KEY
    CHECK (id = 1),

  display_name TEXT NOT NULL,
  legal_name TEXT,
  address_line TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,

  updated_by INTEGER,

  created_at TEXT NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (updated_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);
