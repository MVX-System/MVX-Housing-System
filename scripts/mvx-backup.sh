#!/bin/bash
set -euo pipefail

# MVX Disaster-Recovery Backup
# Stage 2I-SR13
#
# Creates a timestamped backup outside the Git repository:
#   ~/MVX-Backups/backup-YYYYMMDD-HHMMSS/
#
# Contents:
# - housing-db.sql
# - housing-pii-db.sql
# - R2 certificate objects referenced by housing-db
# - manifest.txt
# - SHA256SUMS
#
# The script never exports Cloudflare secret values.

PROFILE="${MVX_WRANGLER_PROFILE:-mvx-system}"
MAIN_DB="${MVX_MAIN_DB:-housing-db}"
PII_DB="${MVX_PII_DB:-housing-pii-db}"
R2_BUCKET="${MVX_R2_BUCKET:-mvx-water-meter-certificates}"
BACKUP_ROOT="${MVX_BACKUP_ROOT:-$HOME/MVX-Backups}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/backup-$TIMESTAMP"
R2_DIR="$BACKUP_DIR/r2"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$BACKUP_ROOT" "$BACKUP_DIR" "$R2_DIR"
chmod 700 "$BACKUP_ROOT" "$BACKUP_DIR" "$R2_DIR"

echo "MVX backup started: $BACKUP_DIR"

echo
echo "1/5 Exporting Main D1..."
npx wrangler d1 export "$MAIN_DB" \
  --remote \
  --profile "$PROFILE" \
  --skip-confirmation \
  --output "$BACKUP_DIR/housing-db.sql"

echo
echo "2/5 Exporting PII D1..."
npx wrangler d1 export "$PII_DB" \
  --remote \
  --profile "$PROFILE" \
  --skip-confirmation \
  --output "$BACKUP_DIR/housing-pii-db.sql"

chmod 600 \
  "$BACKUP_DIR/housing-db.sql" \
  "$BACKUP_DIR/housing-pii-db.sql"

echo
echo "3/5 Verifying SQL exports..."

MAIN_TEST_DB="$TMP_DIR/housing-db.sqlite"
PII_TEST_DB="$TMP_DIR/housing-pii-db.sqlite"

sqlite3 "$MAIN_TEST_DB" < "$BACKUP_DIR/housing-db.sql"
sqlite3 "$PII_TEST_DB" < "$BACKUP_DIR/housing-pii-db.sql"

MAIN_INTEGRITY="$(sqlite3 "$MAIN_TEST_DB" "PRAGMA integrity_check;")"
PII_INTEGRITY="$(sqlite3 "$PII_TEST_DB" "PRAGMA integrity_check;")"

if [ "$MAIN_INTEGRITY" != "ok" ]; then
  echo "ERROR: Main D1 integrity check failed: $MAIN_INTEGRITY" >&2
  exit 1
fi

if [ "$PII_INTEGRITY" != "ok" ]; then
  echo "ERROR: PII D1 integrity check failed: $PII_INTEGRITY" >&2
  exit 1
fi

MAIN_TABLES="$(sqlite3 "$MAIN_TEST_DB" \
  "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")"

PII_TABLES="$(sqlite3 "$PII_TEST_DB" \
  "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")"

echo "Main D1 integrity: ok ($MAIN_TABLES tables)"
echo "PII D1 integrity:  ok ($PII_TABLES tables)"

echo
echo "4/5 Backing up R2 certificate objects..."

R2_KEYS_FILE="$TMP_DIR/r2-keys.txt"

sqlite3 "$MAIN_TEST_DB" "
SELECT DISTINCT certificate_file_key
FROM water_meter_calibrations
WHERE certificate_file_key IS NOT NULL
  AND TRIM(certificate_file_key) <> ''
ORDER BY certificate_file_key;
" > "$R2_KEYS_FILE"

R2_EXPECTED="$(wc -l < "$R2_KEYS_FILE" | tr -d ' ')"
R2_BACKED_UP=0

: > "$BACKUP_DIR/r2-manifest.tsv"
chmod 600 "$BACKUP_DIR/r2-manifest.tsv"

while IFS= read -r OBJECT_KEY; do
  [ -n "$OBJECT_KEY" ] || continue

  if [[ "$OBJECT_KEY" = /* ]] || [[ "$OBJECT_KEY" == *"../"* ]] || [[ "$OBJECT_KEY" == "../"* ]]; then
    echo "ERROR: Unsafe R2 object key found; backup stopped." >&2
    exit 1
  fi

  DEST="$R2_DIR/$OBJECT_KEY"
  mkdir -p "$(dirname "$DEST")"

  npx wrangler r2 object get \
    "$R2_BUCKET/$OBJECT_KEY" \
    --remote \
    --profile "$PROFILE" \
    --file "$DEST"

  chmod 600 "$DEST"

  FILE_SIZE="$(stat -f '%z' "$DEST")"
  FILE_SHA256="$(shasum -a 256 "$DEST" | awk '{print $1}')"

  printf '%s\t%s\t%s\n' \
    "$OBJECT_KEY" \
    "$FILE_SIZE" \
    "$FILE_SHA256" \
    >> "$BACKUP_DIR/r2-manifest.tsv"

  R2_BACKED_UP=$((R2_BACKED_UP + 1))
done < "$R2_KEYS_FILE"

if [ "$R2_BACKED_UP" -ne "$R2_EXPECTED" ]; then
  echo "ERROR: R2 object count mismatch." >&2
  exit 1
fi

echo "R2 objects backed up: $R2_BACKED_UP"

echo
echo "5/5 Creating manifest and checksums..."

MAIN_SHA256="$(shasum -a 256 "$BACKUP_DIR/housing-db.sql" | awk '{print $1}')"
PII_SHA256="$(shasum -a 256 "$BACKUP_DIR/housing-pii-db.sql" | awk '{print $1}')"

cat > "$BACKUP_DIR/manifest.txt" <<EOF
MVX Backup Manifest
Created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Profile: $PROFILE

Main D1
  database: $MAIN_DB
  file: housing-db.sql
  integrity_check: $MAIN_INTEGRITY
  tables: $MAIN_TABLES
  sha256: $MAIN_SHA256

PII D1
  database: $PII_DB
  file: housing-pii-db.sql
  integrity_check: $PII_INTEGRITY
  tables: $PII_TABLES
  sha256: $PII_SHA256

R2
  bucket: $R2_BUCKET
  referenced_objects: $R2_EXPECTED
  backed_up_objects: $R2_BACKED_UP
  manifest: r2-manifest.tsv

Required Worker secrets for disaster recovery
  JWT_SECRET
  PII_ENCRYPTION_KEY
  PII_HMAC_KEY
  VAPID_PRIVATE_KEY

Secret values are intentionally NOT included in this backup.
EOF

chmod 600 "$BACKUP_DIR/manifest.txt"

(
  cd "$BACKUP_DIR"
  find . -type f \
    ! -name SHA256SUMS \
    -print0 \
    | sort -z \
    | xargs -0 shasum -a 256 \
    > SHA256SUMS
  chmod 600 SHA256SUMS
)

echo
echo "Backup completed successfully."
echo "Directory: $BACKUP_DIR"
echo
ls -lh "$BACKUP_DIR"
