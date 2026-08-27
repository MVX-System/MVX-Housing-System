-- MVX Restore Control-Plane Schema
-- Stage 2I-SR14F-D5B-2E
--
-- Purpose:
-- Recreate the Main D1 restore-control schema after a Time Travel restore.
-- A Time Travel restore can legitimately roll Main D1 back to a point before
-- these control-plane tables existed. This migration is intentionally
-- idempotent and contains no user-data mutations.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS restore_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restore_type TEXT NOT NULL
    CHECK (
      restore_type IN (
        'main_d1_time_travel',
        'pii_d1_time_travel',
        'offsite_backup'
      )
    ),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'cancelled',
        'expired',
        'executed',
        'failed'
      )
    ),
  requested_by INTEGER NOT NULL,
  backup_run_id INTEGER,
  target_timestamp TEXT,
  target_bookmark TEXT,
  archive_name TEXT,
  archive_sha256 TEXT,
  confirmed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  executed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (requested_by)
    REFERENCES users(id)
    ON DELETE RESTRICT,

  FOREIGN KEY (backup_run_id)
    REFERENCES backup_runs(id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_restore_requests_status
  ON restore_requests(status);

CREATE INDEX IF NOT EXISTS idx_restore_requests_requested_by
  ON restore_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_restore_requests_expires_at
  ON restore_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_restore_requests_backup_run_id
  ON restore_requests(backup_run_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restore_requests_one_pending_per_admin
  ON restore_requests(requested_by)
  WHERE status = 'pending';


CREATE TABLE IF NOT EXISTS restore_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restore_request_id INTEGER NOT NULL,
  validation_status TEXT NOT NULL
    CHECK (
      validation_status IN (
        'ready',
        'blocked',
        'failed'
      )
    ),
  main_ready INTEGER NOT NULL DEFAULT 0
    CHECK (main_ready IN (0, 1)),
  pii_ready INTEGER NOT NULL DEFAULT 0
    CHECK (pii_ready IN (0, 1)),
  offsite_ready INTEGER NOT NULL DEFAULT 0
    CHECK (offsite_ready IN (0, 1)),
  target_timestamp TEXT,
  main_bookmark TEXT,
  pii_bookmark TEXT,
  failure_code TEXT,
  validated_by INTEGER NOT NULL,
  validated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (restore_request_id)
    REFERENCES restore_requests(id)
    ON DELETE CASCADE,

  FOREIGN KEY (validated_by)
    REFERENCES users(id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_restore_validations_request
  ON restore_validations(restore_request_id);

CREATE INDEX IF NOT EXISTS idx_restore_validations_status
  ON restore_validations(validation_status);

CREATE INDEX IF NOT EXISTS idx_restore_validations_validated_at
  ON restore_validations(validated_at);


CREATE TABLE IF NOT EXISTS restore_offsite_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restore_request_id INTEGER NOT NULL,
  status TEXT NOT NULL
    CHECK (
      status IN (
        'requested',
        'running',
        'present',
        'missing',
        'failed'
      )
    ),
  github_run_id TEXT UNIQUE,
  archive_name TEXT NOT NULL,
  expected_sha256 TEXT NOT NULL,
  provider TEXT,
  destination TEXT,
  failure_code TEXT,
  requested_by INTEGER,
  requested_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  downloaded_size_bytes INTEGER,
  actual_sha256 TEXT,
  sha256_verified INTEGER
    CHECK (sha256_verified IN (0, 1)),
  downloaded_at TEXT,
  decryption_verified INTEGER
    CHECK (decryption_verified IN (0, 1)),
  internal_checksums_verified INTEGER
    CHECK (internal_checksums_verified IN (0, 1)),
  main_sql_integrity TEXT,
  pii_sql_integrity TEXT,
  archive_structure_verified INTEGER
    CHECK (archive_structure_verified IN (0, 1)),
  content_validated_at TEXT,

  FOREIGN KEY (restore_request_id)
    REFERENCES restore_requests(id)
    ON DELETE CASCADE,

  FOREIGN KEY (requested_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_restore_offsite_checks_request
  ON restore_offsite_checks(restore_request_id);

CREATE INDEX IF NOT EXISTS idx_restore_offsite_checks_status
  ON restore_offsite_checks(status);

CREATE INDEX IF NOT EXISTS idx_restore_offsite_checks_created_at
  ON restore_offsite_checks(created_at);


CREATE TABLE IF NOT EXISTS restore_readiness (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restore_request_id INTEGER NOT NULL,
  validation_id INTEGER,
  offsite_check_id INTEGER,
  status TEXT NOT NULL
    CHECK (
      status IN (
        'ready',
        'blocked',
        'failed'
      )
    ),
  request_active INTEGER NOT NULL
    CHECK (request_active IN (0, 1)),
  preview_ready INTEGER NOT NULL
    CHECK (preview_ready IN (0, 1)),
  offsite_present INTEGER NOT NULL
    CHECK (offsite_present IN (0, 1)),
  sha256_verified INTEGER NOT NULL
    CHECK (sha256_verified IN (0, 1)),
  decryption_verified INTEGER NOT NULL
    CHECK (decryption_verified IN (0, 1)),
  archive_structure_verified INTEGER NOT NULL
    CHECK (archive_structure_verified IN (0, 1)),
  internal_checksums_verified INTEGER NOT NULL
    CHECK (internal_checksums_verified IN (0, 1)),
  main_sql_integrity TEXT,
  pii_sql_integrity TEXT,
  main_checkpoint_bookmark TEXT,
  pii_checkpoint_bookmark TEXT,
  failure_code TEXT,
  checked_by INTEGER,
  checked_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (restore_request_id)
    REFERENCES restore_requests(id)
    ON DELETE CASCADE,

  FOREIGN KEY (validation_id)
    REFERENCES restore_validations(id)
    ON DELETE SET NULL,

  FOREIGN KEY (offsite_check_id)
    REFERENCES restore_offsite_checks(id)
    ON DELETE SET NULL,

  FOREIGN KEY (checked_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_restore_readiness_request
  ON restore_readiness(restore_request_id);

CREATE INDEX IF NOT EXISTS idx_restore_readiness_status
  ON restore_readiness(status);

CREATE INDEX IF NOT EXISTS idx_restore_readiness_checked_at
  ON restore_readiness(checked_at);


CREATE TABLE IF NOT EXISTS restore_execution_arms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restore_request_id INTEGER NOT NULL,
  readiness_id INTEGER NOT NULL,
  status TEXT NOT NULL
    CHECK (
      status IN (
        'armed',
        'consumed',
        'cancelled',
        'expired'
      )
    ),
  execution_token_hash TEXT NOT NULL UNIQUE,
  armed_by INTEGER NOT NULL,
  armed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (restore_request_id)
    REFERENCES restore_requests(id)
    ON DELETE CASCADE,

  FOREIGN KEY (readiness_id)
    REFERENCES restore_readiness(id)
    ON DELETE CASCADE,

  FOREIGN KEY (armed_by)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_restore_execution_arms_request
  ON restore_execution_arms(restore_request_id);

CREATE INDEX IF NOT EXISTS idx_restore_execution_arms_status
  ON restore_execution_arms(status);

CREATE INDEX IF NOT EXISTS idx_restore_execution_arms_armed_by
  ON restore_execution_arms(armed_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restore_execution_arms_one_active_per_admin
  ON restore_execution_arms(armed_by)
  WHERE status = 'armed';


CREATE TABLE IF NOT EXISTS restore_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  restore_request_id INTEGER NOT NULL,
  readiness_id INTEGER NOT NULL,
  execution_arm_id INTEGER NOT NULL UNIQUE,
  backup_run_id INTEGER NOT NULL,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'requested',
        'running',
        'success',
        'failed',
        'rollback_required',
        'rolled_back'
      )
    ),

  github_run_id TEXT UNIQUE,

  archive_name TEXT NOT NULL,
  archive_sha256 TEXT NOT NULL,

  main_pre_restore_bookmark TEXT NOT NULL,
  pii_pre_restore_bookmark TEXT NOT NULL,

  main_restore_status TEXT,
  pii_restore_status TEXT,

  main_post_integrity TEXT,
  pii_post_integrity TEXT,

  failure_code TEXT,

  requested_by INTEGER NOT NULL,
  requested_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  target_timestamp TEXT,

  main_restore_bookmark TEXT,
  pii_restore_bookmark TEXT,

  main_previous_bookmark TEXT,
  pii_previous_bookmark TEXT,

  rollback_status TEXT
    CHECK (
      rollback_status IS NULL OR
      rollback_status IN (
        'not_required',
        'required',
        'running',
        'success',
        'failed'
      )
    ),

  main_target_bookmark TEXT,
  pii_target_bookmark TEXT,

  preflight_status TEXT
    CHECK (
      preflight_status IS NULL OR
      preflight_status IN (
        'ready',
        'blocked',
        'failed'
      )
    ),

  preflight_checked_at TEXT,

  FOREIGN KEY (restore_request_id)
    REFERENCES restore_requests(id)
    ON DELETE CASCADE,

  FOREIGN KEY (readiness_id)
    REFERENCES restore_readiness(id)
    ON DELETE CASCADE,

  FOREIGN KEY (execution_arm_id)
    REFERENCES restore_execution_arms(id)
    ON DELETE CASCADE,

  FOREIGN KEY (backup_run_id)
    REFERENCES backup_runs(id)
    ON DELETE RESTRICT,

  FOREIGN KEY (requested_by)
    REFERENCES users(id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_restore_executions_request
  ON restore_executions(restore_request_id);

CREATE INDEX IF NOT EXISTS idx_restore_executions_status
  ON restore_executions(status);

CREATE INDEX IF NOT EXISTS idx_restore_executions_backup_run
  ON restore_executions(backup_run_id);

CREATE INDEX IF NOT EXISTS idx_restore_executions_created_at
  ON restore_executions(created_at);
