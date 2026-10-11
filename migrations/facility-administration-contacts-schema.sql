-- MVX Facility Administration Contacts
-- PR-9K
--
-- Purpose:
-- Store operational administration contacts displayed to authenticated
-- residents on the MVX Dashboard.
--
-- This data is intentionally separate from:
--   1. public_contact_settings — MVX login/recovery support contact;
--   2. facility_profile — facility identity/legal information.
--
-- V0.0 currently serves one facility per environment.
-- facility_id is nevertheless explicit so a future Facility Scoping
-- Migration can evolve this table without changing contact semantics.
--
-- TEST and DEMO must use synthetic contact data only.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS facility_administration_contacts (
  facility_id INTEGER NOT NULL
    DEFAULT 1,

  role_key TEXT NOT NULL
    CHECK (
      role_key IN (
        'manager',
        'accountant',
        'heating_technician'
      )
    ),

  display_name TEXT,
  phone TEXT,
  email TEXT,

  updated_by INTEGER,

  created_at TEXT NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (
    facility_id,
    role_key
  ),

  FOREIGN KEY (facility_id)
    REFERENCES facility_profile(id)
    ON DELETE CASCADE,

  FOREIGN KEY (updated_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

INSERT OR IGNORE INTO facility_administration_contacts (
  facility_id,
  role_key,
  display_name,
  phone,
  email
)
SELECT
  1,
  'manager',
  NULL,
  NULL,
  NULL
WHERE EXISTS (
  SELECT 1
  FROM facility_profile
  WHERE id = 1
);

INSERT OR IGNORE INTO facility_administration_contacts (
  facility_id,
  role_key,
  display_name,
  phone,
  email
)
SELECT
  1,
  'accountant',
  NULL,
  NULL,
  NULL
WHERE EXISTS (
  SELECT 1
  FROM facility_profile
  WHERE id = 1
);

INSERT OR IGNORE INTO facility_administration_contacts (
  facility_id,
  role_key,
  display_name,
  phone,
  email
)
SELECT
  1,
  'heating_technician',
  NULL,
  NULL,
  NULL
WHERE EXISTS (
  SELECT 1
  FROM facility_profile
  WHERE id = 1
);

CREATE INDEX IF NOT EXISTS
  idx_facility_administration_contacts_role
ON facility_administration_contacts (
  facility_id,
  role_key
);
