-- MVX PR-10K.6C — OFFLINE CANDIDATE ONLY; DO NOT APPLY TO PROD/TEST DIRECTLY.
-- Governed D1 migration requires separate per-environment preflight, backup and authorization.
-- Files live in the existing private WATER_CERTIFICATES R2 binding under meter-documents/v1/.
-- No mandatory act: meter creation, replacement and deactivation remain independent of files.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS water_meter_documents (
    id TEXT PRIMARY KEY NOT NULL,
    apartment_id INTEGER NOT NULL REFERENCES apartments(id),
    document_kind TEXT NOT NULL CHECK (document_kind IN ('replacement_act', 'other')),
    display_title TEXT,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
    sha256 TEXT NOT NULL CHECK (length(sha256)=64),
    r2_key TEXT NOT NULL UNIQUE,
    uploaded_by INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS water_meter_document_links (
    document_id TEXT NOT NULL REFERENCES water_meter_documents(id) ON DELETE RESTRICT,
    meter_id INTEGER NOT NULL REFERENCES water_meters(id) ON DELETE RESTRICT,
    linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, meter_id)
);
CREATE INDEX IF NOT EXISTS ix_water_meter_document_links_meter
    ON water_meter_document_links(meter_id, document_id);
CREATE INDEX IF NOT EXISTS ix_water_meter_documents_apartment
    ON water_meter_documents(apartment_id, uploaded_at DESC);
-- Verify same-apartment association even if another backend inserts directly.
CREATE TRIGGER IF NOT EXISTS tr_water_meter_document_link_apartment
BEFORE INSERT ON water_meter_document_links
WHEN NOT EXISTS (
    SELECT 1 FROM water_meter_documents d
      JOIN water_meters m ON m.id=NEW.meter_id
     WHERE d.id=NEW.document_id AND d.apartment_id=m.apartment_id
)
BEGIN SELECT RAISE(ABORT, 'meter_document_apartment_mismatch'); END;
