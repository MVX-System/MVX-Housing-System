-- PR-10K.6N.2 TEST CANDIDATE. Review and backup before any TEST D1 migration.
-- D1 and R2 have no common transaction. Keep a retryable pending tombstone until R2 delete succeeds.
ALTER TABLE water_meter_documents
  ADD COLUMN delete_state TEXT NOT NULL DEFAULT 'active' CHECK(delete_state IN ('active','pending'));
ALTER TABLE water_meter_documents ADD COLUMN delete_requested_at TEXT;
ALTER TABLE water_meter_documents ADD COLUMN delete_requested_by INTEGER;
CREATE TABLE IF NOT EXISTS water_meter_document_audit_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL,
  apartment_id INTEGER NOT NULL,
  meter_id INTEGER,
  actor_user_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('unlink','delete_requested','delete_completed')),
  links_before INTEGER NOT NULL,
  links_after INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_water_meter_document_audit_doc
  ON water_meter_document_audit_events(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_water_meter_documents_delete_state
  ON water_meter_documents(delete_state, apartment_id);
