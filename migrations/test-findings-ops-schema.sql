-- MVX TEST Findings Register OPS Schema
-- PR-6K.1
--
-- Purpose:
-- Persist TEST findings independently from the reset-managed TEST dataset.
--
-- Storage:
--   housing-test-ops-db only.
--
-- Important architecture rules:
-- - This schema is for MVX TEST only.
-- - TEST environment reset must NOT delete these tables.
-- - There are intentionally no foreign keys to Main D1 users because
--   Main D1 and OPS D1 are separate databases and TEST users can be reset.
-- - Authenticated user identifiers and Nick/role snapshots are stored as
--   historical evidence at the time of each action.
-- - Screenshot binary objects are not stored in D1. Only protected R2
--   metadata is stored here.
--
-- The migration is intentionally idempotent.

PRAGMA foreign_keys = ON;


CREATE TABLE IF NOT EXISTS test_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  author_user_id INTEGER NOT NULL
    CHECK (author_user_id > 0),

  author_nick TEXT NOT NULL,

  author_roles_json TEXT NOT NULL,

  author_mode TEXT NOT NULL
    CHECK (
      author_mode IN (
        'resident',
        'admin'
      )
    ),

  finding_type TEXT NOT NULL
    CHECK (
      finding_type IN (
        'bug',
        'usability_ux',
        'text_translation',
        'documentation',
        'suggestion'
      )
    ),

  title TEXT NOT NULL,

  reproduction_steps TEXT NOT NULL,

  expected_result TEXT NOT NULL,

  actual_result TEXT NOT NULL,

  blocking INTEGER NOT NULL DEFAULT 0
    CHECK (blocking IN (0, 1)),

  extra_explanation TEXT,

  route TEXT NOT NULL,

  language TEXT NOT NULL
    CHECK (
      language IN (
        'lv',
        'en',
        'ru'
      )
    ),

  app_commit_sha TEXT NOT NULL,

  browser TEXT,
  operating_system TEXT,

  screen_width INTEGER
    CHECK (
      screen_width IS NULL OR
      screen_width > 0
    ),

  screen_height INTEGER
    CHECK (
      screen_height IS NULL OR
      screen_height > 0
    ),

  environment TEXT NOT NULL DEFAULT 'test'
    CHECK (environment = 'test'),

  screenshot_key TEXT UNIQUE,
  screenshot_mime_type TEXT,
  screenshot_size_bytes INTEGER
    CHECK (
      screenshot_size_bytes IS NULL OR
      screenshot_size_bytes > 0
    ),

  status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (
      status IN (
        'NEW',
        'APPROVED',
        'IN_PROGRESS',
        'READY_FOR_RETEST',
        'VERIFIED',
        'NEEDS_INFO',
        'HOLD',
        'CLOSED'
      )
    ),

  status_reason_code TEXT,
  status_reason_text TEXT,

  github_issue_url TEXT,
  implementation_ref TEXT,

  created_at TEXT NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL
    DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_test_findings_author
  ON test_findings(
    author_user_id,
    created_at
  );


CREATE INDEX IF NOT EXISTS idx_test_findings_status
  ON test_findings(
    status,
    created_at
  );


CREATE INDEX IF NOT EXISTS idx_test_findings_type
  ON test_findings(
    finding_type
  );


CREATE INDEX IF NOT EXISTS idx_test_findings_route
  ON test_findings(
    route
  );


CREATE INDEX IF NOT EXISTS idx_test_findings_blocking
  ON test_findings(
    blocking
  );


CREATE TABLE IF NOT EXISTS test_finding_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  finding_id INTEGER NOT NULL,

  actor_user_id INTEGER
    CHECK (
      actor_user_id IS NULL OR
      actor_user_id > 0
    ),

  actor_nick TEXT,

  actor_roles_json TEXT,

  event_type TEXT NOT NULL,

  from_status TEXT
    CHECK (
      from_status IS NULL OR
      from_status IN (
        'NEW',
        'APPROVED',
        'IN_PROGRESS',
        'READY_FOR_RETEST',
        'VERIFIED',
        'NEEDS_INFO',
        'HOLD',
        'CLOSED'
      )
    ),

  to_status TEXT
    CHECK (
      to_status IS NULL OR
      to_status IN (
        'NEW',
        'APPROVED',
        'IN_PROGRESS',
        'READY_FOR_RETEST',
        'VERIFIED',
        'NEEDS_INFO',
        'HOLD',
        'CLOSED'
      )
    ),

  reason_code TEXT,
  comment TEXT,

  created_at TEXT NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (finding_id)
    REFERENCES test_findings(id)
    ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_test_finding_events_finding
  ON test_finding_events(
    finding_id,
    created_at
  );


CREATE INDEX IF NOT EXISTS idx_test_finding_events_actor
  ON test_finding_events(
    actor_user_id,
    created_at
  );


CREATE TABLE IF NOT EXISTS test_finding_retests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  finding_id INTEGER NOT NULL,

  assigned_user_id INTEGER NOT NULL
    CHECK (assigned_user_id > 0),

  assigned_nick TEXT NOT NULL,

  assigned_by_user_id INTEGER NOT NULL
    CHECK (assigned_by_user_id > 0),

  assigned_by_nick TEXT NOT NULL,

  outcome TEXT
    CHECK (
      outcome IS NULL OR
      outcome IN (
        'PASS',
        'FAIL'
      )
    ),

  comment TEXT,

  assigned_at TEXT NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  completed_at TEXT,

  FOREIGN KEY (finding_id)
    REFERENCES test_findings(id)
    ON DELETE CASCADE
);


CREATE INDEX IF NOT EXISTS idx_test_finding_retests_finding
  ON test_finding_retests(
    finding_id,
    assigned_at
  );


CREATE INDEX IF NOT EXISTS idx_test_finding_retests_assignee
  ON test_finding_retests(
    assigned_user_id,
    completed_at
  );


CREATE UNIQUE INDEX IF NOT EXISTS idx_test_finding_retests_one_active
  ON test_finding_retests(finding_id)
  WHERE completed_at IS NULL;
