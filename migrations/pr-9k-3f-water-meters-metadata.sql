-- PR-9K.3F-R4: schema candidate; DO NOT apply directly to PROD.
-- Execute with the project's governed D1 migration process after backup/rehearsal.
ALTER TABLE water_meters ADD COLUMN source_slot TEXT
  CHECK (source_slot IS NULL OR source_slot IN ('A1','A2','A3','K1','K2','K3'));
ALTER TABLE water_meters ADD COLUMN riser_assignment_status TEXT
  CHECK (riser_assignment_status IS NULL OR riser_assignment_status IN ('provisional','verified'));
ALTER TABLE water_meters ADD COLUMN riser_assignment_method TEXT;
-- Legacy meters have NULL metadata. Shared apartment_riser_id remains permitted.
CREATE UNIQUE INDEX IF NOT EXISTS ux_water_meters_active_apartment_source_slot
  ON water_meters (apartment_id, source_slot)
  WHERE active = 1 AND source_slot IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS tr_water_meters_slot_type_insert
BEFORE INSERT ON water_meters
WHEN NEW.source_slot IS NOT NULL AND
  ((NEW.type='cold' AND NEW.source_slot NOT IN ('A1','A2','A3')) OR
   (NEW.type='hot' AND NEW.source_slot NOT IN ('K1','K2','K3')) OR
   NEW.type NOT IN ('cold','hot'))
BEGIN SELECT RAISE(ABORT, 'source_slot_type_mismatch'); END;
CREATE TRIGGER IF NOT EXISTS tr_water_meters_slot_type_update
BEFORE UPDATE OF source_slot, type ON water_meters
WHEN NEW.source_slot IS NOT NULL AND
  ((NEW.type='cold' AND NEW.source_slot NOT IN ('A1','A2','A3')) OR
   (NEW.type='hot' AND NEW.source_slot NOT IN ('K1','K2','K3')) OR
   NEW.type NOT IN ('cold','hot'))
BEGIN SELECT RAISE(ABORT, 'source_slot_type_mismatch'); END;
