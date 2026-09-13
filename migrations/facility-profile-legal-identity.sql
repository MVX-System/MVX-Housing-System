-- MVX Facility Profile Legal Identity Extension
-- PR-5B
--
-- Purpose:
-- Extend the existing single-facility public profile with the
-- legal identity and legal-document-set fields required by the
-- MVX V0.0 public Landing/Login and Legal Documents surfaces.
--
-- IMPORTANT:
-- This migration does not implement multi-facility scoping.
-- One environment continues to serve one facility.
--
-- Environment-specific values must be populated separately.
-- TEST and DEMO must use synthetic identity data only.

PRAGMA foreign_keys = ON;

ALTER TABLE facility_profile
  ADD COLUMN registration_number TEXT;

ALTER TABLE facility_profile
  ADD COLUMN legal_address TEXT;

ALTER TABLE facility_profile
  ADD COLUMN document_set_key TEXT;
