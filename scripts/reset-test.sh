#!/usr/bin/env bash

set -euo pipefail

PROFILE="mvx-system"
CI_MODE="${MVX_TEST_RESET_CI:-false}"
CI_WRANGLER_VERSION="4.130.0"

MAIN_DB="housing-test-db"
PII_DB="housing-test-pii-db"
OPS_DB="housing-test-ops-db"

R2_BUCKET="mvx-water-meter-certificates-test"
R2_JURISDICTION="eu"

MODE="check"
CONFIRMED="false"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/reset-test.sh --check
  ./scripts/reset-test.sh --reset --confirm-test-reset

Modes:
  --check
      Read-only preflight. This is the default.

  --reset --confirm-test-reset
      Reset ONLY the MVX TEST environment.

The script never targets PROD or DEMO resources.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --check)
      MODE="check"
      ;;
    --reset)
      MODE="reset"
      ;;
    --confirm-test-reset)
      CONFIRMED="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$MODE" == "reset" && "$CONFIRMED" != "true" ]]; then
  echo "ERROR: Real reset requires --confirm-test-reset" >&2
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "$ROOT" ]]; then
  echo "ERROR: Not inside a Git repository." >&2
  exit 1
fi

cd "$ROOT"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 \
    || fail "Required command not found: $1"
}

require_command git
require_command python3
require_command npx

# ---------------------------------------------------------
# Wrangler authentication mode
# ---------------------------------------------------------

WRANGLER_CMD=(
  npx
  wrangler
)

WRANGLER_AUTH_ARGS=(
  --profile
  "$PROFILE"
)

case "$CI_MODE" in
  false)
    ;;
  true)
    [[ "${GITHUB_ACTIONS:-}" == "true" ]] \
      || fail "CI mode is allowed only inside GitHub Actions"

    [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] \
      || fail "CLOUDFLARE_API_TOKEN is required in CI mode"

    [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]] \
      || fail "CLOUDFLARE_ACCOUNT_ID is required in CI mode"

    WRANGLER_CMD=(
      npx
      --yes
      "wrangler@${CI_WRANGLER_VERSION}"
    )

    WRANGLER_AUTH_ARGS=()
    ;;
  *)
    fail "MVX_TEST_RESET_CI must be true or false"
    ;;
esac

# ---------------------------------------------------------
# Hard TEST-only safety boundary
# ---------------------------------------------------------

[[ "$MAIN_DB" == "housing-test-db" ]] \
  || fail "Unexpected MAIN_DB"

[[ "$PII_DB" == "housing-test-pii-db" ]] \
  || fail "Unexpected PII_DB"

[[ "$OPS_DB" == "housing-test-ops-db" ]] \
  || fail "Unexpected OPS_DB"

[[ "$R2_BUCKET" == "mvx-water-meter-certificates-test" ]] \
  || fail "Unexpected R2 bucket"

[[ "$R2_JURISDICTION" == "eu" ]] \
  || fail "Unexpected R2 jurisdiction"

for value in \
  "$MAIN_DB" \
  "$PII_DB" \
  "$OPS_DB" \
  "$R2_BUCKET"
do
  case "$value" in
    housing-db|housing-pii-db|housing-ops-db|mvx-water-meter-certificates)
      fail "PROD resource detected: $value"
      ;;
  esac
done

if [[ ! -f "wrangler.jsonc" ]]; then
  fail "wrangler.jsonc not found"
fi

echo "===== MVX TEST RESET ====="
echo "Mode:         $MODE"
echo "Main D1:      $MAIN_DB"
echo "PII D1:       $PII_DB"
echo "OPS D1:       $OPS_DB"
echo "R2 bucket:    $R2_BUCKET"
echo "Jurisdiction: $R2_JURISDICTION"
echo

d1_json() {
  local db="$1"
  local sql="$2"

  "${WRANGLER_CMD[@]}" d1 execute "$db" \
    --remote \
    "${WRANGLER_AUTH_ARGS[@]}" \
    --json \
    --command "$sql"
}

json_first_row() {
  python3 -c '
import json
import sys

data = json.load(sys.stdin)

if not data:
    raise SystemExit("No D1 result returned")

entry = data[0]

if not isinstance(entry, dict):
    raise SystemExit("Unexpected D1 result format")

rows = entry.get("results") or []

if not rows:
    raise SystemExit("D1 query returned no rows")

print(json.dumps(rows[0], sort_keys=True))
'
}

assert_boolean_row() {
  local label="$1"

  python3 -c '
import json
import sys

label = sys.argv[1]
row = json.load(sys.stdin)

failed = [
    key
    for key, value in row.items()
    if int(value or 0) != 1
]

if failed:
    print(
        "FAIL: "
        + label
        + ": "
        + ", ".join(failed),
        file=sys.stderr,
    )
    raise SystemExit(1)

print("PASS: " + label)
' "$label"
}

r2_info_json() {
  "${WRANGLER_CMD[@]}" r2 bucket info \
    "$R2_BUCKET" \
    --jurisdiction "$R2_JURISDICTION" \
    "${WRANGLER_AUTH_ARGS[@]}" \
    --json
}

r2_object_count() {
  r2_info_json | python3 -c '
import json
import re
import sys

data = json.load(sys.stdin)

def normalize_key(key):
    text = str(key)
    text = re.sub(r"(?<!^)(?=[A-Z])", "_", text)
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")

def find_count(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if normalize_key(key) == "object_count":
                return int(item or 0)

            found = find_count(item)

            if found is not None:
                return found

    elif isinstance(value, list):
        for item in value:
            found = find_count(item)

            if found is not None:
                return found

    return None

count = find_count(data)

if count is None:
    raise SystemExit(
        "Unable to determine R2 object_count"
    )

print(count)
'
}

certificate_key_count() {
  d1_json \
    "$MAIN_DB" \
    "
    SELECT COUNT(DISTINCT certificate_file_key) AS count
    FROM water_meter_calibrations
    WHERE certificate_file_key IS NOT NULL
      AND TRIM(certificate_file_key) <> '';
    " \
    | json_first_row \
    | python3 -c '
import json
import sys

print(
    int(
        json.load(sys.stdin).get(
            "count",
            0,
        )
        or 0
    )
)
'
}

certificate_keys_json() {
  d1_json \
    "$MAIN_DB" \
    "
    SELECT DISTINCT certificate_file_key
    FROM water_meter_calibrations
    WHERE certificate_file_key IS NOT NULL
      AND TRIM(certificate_file_key) <> ''
    ORDER BY certificate_file_key;
    "
}

certificate_keys_from_json() {
  python3 -c '
import json
import sys

data = json.load(sys.stdin)

for entry in data:
    if not isinstance(entry, dict):
        continue

    for row in entry.get("results") or []:
        key = row.get("certificate_file_key")

        if key:
            print(key)
'
}

# Return values:
#   0 = object exists
#   1 = object definitely does not exist
#   2 = R2 probe failed for another reason
r2_object_state() {
  local object_key="$1"
  local temp_dir
  local temp_file
  local output
  local status

  temp_dir="$(
    mktemp -d \
      "${TMPDIR:-/tmp}/mvx-r2-probe.XXXXXX"
  )"

  temp_file="${temp_dir}/object.bin"

  if output="$(
    "${WRANGLER_CMD[@]}" r2 object get \
      "${R2_BUCKET}/${object_key}" \
      --file "$temp_file" \
      --remote \
      --jurisdiction "$R2_JURISDICTION" \
      "${WRANGLER_AUTH_ARGS[@]}" \
      2>&1
  )"; then
    status=0
  else
    status=$?
  fi

  rm -rf "$temp_dir"

  if [[ "$status" -eq 0 ]]; then
    return 0
  fi

  if printf '%s\n' "$output" \
    | grep -Fq \
      "The specified key does not exist."; then
    return 1
  fi

  echo \
    "ERROR: unexpected R2 probe failure for: $object_key" \
    >&2

  printf '%s\n' "$output" >&2

  return 2
}

# ---------------------------------------------------------
# Canonical TEST reporting-period calculation
#
# PR-8 contract:
#
# - previous calendar month is FINALIZED;
# - current calendar month is always OPEN in TEST;
# - current collection window is reset-time -1 day
#   through reset-time +14 days;
# - reading dates remain inside their calendar months;
# - an older initial-reading date is provided for meters
#   that intentionally use an initial baseline.
#
# Compatibility aliases PERIOD_* remain temporarily until
# PR-8D.4B2 replaces the old single-period reset SQL.
# ---------------------------------------------------------

PERIOD_VALUES="$(
python3 <<'PY_PERIOD_CALC'
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import calendar

tz = ZoneInfo("Europe/Riga")

now_local = datetime.now(tz)
now_utc = now_local.astimezone(timezone.utc)


def previous_month(year, month):
    if month == 1:
        return year - 1, 12
    return year, month - 1


def iso_z(value):
    return (
        value
        .astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


current_year = now_local.year
current_month = now_local.month

previous_year, previous_month_number = previous_month(
    current_year,
    current_month,
)

initial_year, initial_month_number = previous_month(
    previous_year,
    previous_month_number,
)

previous_last_day = calendar.monthrange(
    previous_year,
    previous_month_number,
)[1]

previous_open_local = datetime(
    previous_year,
    previous_month_number,
    1,
    0,
    0,
    0,
    tzinfo=tz,
)

previous_close_local = datetime(
    previous_year,
    previous_month_number,
    previous_last_day,
    23,
    59,
    59,
    tzinfo=tz,
)

previous_open_utc = previous_open_local.astimezone(
    timezone.utc
)

previous_close_utc = previous_close_local.astimezone(
    timezone.utc
)

previous_finalized_utc = (
    previous_close_utc
    + timedelta(minutes=1)
)

current_open_utc = now_utc - timedelta(days=1)
current_close_utc = now_utc + timedelta(days=14)

current_reading_date = (
    f"{current_year:04d}-"
    f"{current_month:02d}-01"
)

previous_reading_date = (
    f"{previous_year:04d}-"
    f"{previous_month_number:02d}-01"
)

initial_reading_date = (
    f"{initial_year:04d}-"
    f"{initial_month_number:02d}-01"
)

print(
    "|".join(
        [
            str(current_year),
            str(current_month),
            str(previous_year),
            str(previous_month_number),
            iso_z(current_open_utc),
            iso_z(current_close_utc),
            iso_z(previous_open_utc),
            iso_z(previous_close_utc),
            iso_z(previous_finalized_utc),
            current_reading_date,
            previous_reading_date,
            initial_reading_date,
            iso_z(now_utc),
        ]
    )
)
PY_PERIOD_CALC
)"

IFS='|' read -r \
  CURRENT_PERIOD_YEAR \
  CURRENT_PERIOD_MONTH \
  PREVIOUS_PERIOD_YEAR \
  PREVIOUS_PERIOD_MONTH \
  CURRENT_PERIOD_OPENS \
  CURRENT_PERIOD_CLOSES \
  PREVIOUS_PERIOD_OPENS \
  PREVIOUS_PERIOD_CLOSES \
  PREVIOUS_PERIOD_FINALIZED_AT \
  CURRENT_READING_DATE \
  PREVIOUS_READING_DATE \
  INITIAL_READING_DATE \
  NOW_ISO \
  <<< "$PERIOD_VALUES"

# Temporary compatibility with the existing
# single-period reset SQL. PR-8D.4B2 removes this alias
# dependency and inserts both canonical periods explicitly.

PERIOD_YEAR="$CURRENT_PERIOD_YEAR"
PERIOD_MONTH="$CURRENT_PERIOD_MONTH"
PERIOD_STATUS="open"
PERIOD_OPENS="$CURRENT_PERIOD_OPENS"
PERIOD_CLOSES="$CURRENT_PERIOD_CLOSES"

echo "===== CALCULATED TEST BASELINE ====="
echo "Previous reporting month: ${PREVIOUS_PERIOD_YEAR}-$(printf '%02d' "$PREVIOUS_PERIOD_MONTH")"
echo "Previous status:          finalized"
echo "Previous opens:           $PREVIOUS_PERIOD_OPENS"
echo "Previous closes:          $PREVIOUS_PERIOD_CLOSES"
echo "Previous finalized:       $PREVIOUS_PERIOD_FINALIZED_AT"
echo
echo "Current reporting month:  ${CURRENT_PERIOD_YEAR}-$(printf '%02d' "$CURRENT_PERIOD_MONTH")"
echo "Current status:            open"
echo "Current opens:             $CURRENT_PERIOD_OPENS"
echo "Current closes:            $CURRENT_PERIOD_CLOSES"
echo
echo "Initial reading date:      $INITIAL_READING_DATE"
echo "Previous reading date:     $PREVIOUS_READING_DATE"
echo "Current reading date:      $CURRENT_READING_DATE"
echo

# ---------------------------------------------------------
# Protected TEST credential / PII anchors
#
# PR-8D transition contract:
#
# - TEST-Admin and TEST-Owner are mandatory technical
#   credential anchors.
#
# - TST-01 ... TST-06 are canonical external tester
#   identities. During provisioning they are optional.
#
# - If a TST-* account exists, its password, PII row and
#   PII search-token anchors must already be complete.
#
# - Matching is by canonical Nick, not historical user ID.
#
# - --check never changes password_hash,
#   must_change_password, encrypted PII or search tokens.
#
# A later stage makes all eight accounts mandatory after
# controlled TST-* provisioning is complete.
# ---------------------------------------------------------

CANONICAL_NICKS_LOWER_SQL="'test-admin','test-owner','tst-01','tst-02','tst-03','tst-04','tst-05','tst-06'"

TST_NICKS_LOWER_SQL="'tst-01','tst-02','tst-03','tst-04','tst-05','tst-06'"

echo "===== PROTECTED TEST ANCHORS CHECK ====="

MAIN_ANCHORS_JSON="$(
  d1_json \
    "$MAIN_DB" \
    "
    SELECT
      (
        SELECT COUNT(*)
        FROM users
        WHERE LOWER(nick) = 'test-admin'
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = 1
        AS admin_password_anchor,

      (
        SELECT COUNT(*)
        FROM users
        WHERE LOWER(nick) = 'test-owner'
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = 1
        AS owner_password_anchor,

      NOT EXISTS (
        SELECT 1
        FROM users
        WHERE LOWER(nick) IN (
          $CANONICAL_NICKS_LOWER_SQL
        )
        GROUP BY LOWER(nick)
        HAVING COUNT(*) <> 1
      )
        AS canonical_nick_uniqueness,

      NOT EXISTS (
        SELECT 1
        FROM users
        WHERE LOWER(nick) IN (
          $CANONICAL_NICKS_LOWER_SQL
        )
          AND (
            password_hash IS NULL
            OR LENGTH(TRIM(password_hash)) = 0
          )
      )
        AS present_canonical_password_anchors;
    "
)"

printf '%s' "$MAIN_ANCHORS_JSON" \
  | json_first_row \
  | assert_boolean_row \
      "Main D1 protected credential anchors"


CANONICAL_STATE_JSON="$(
  d1_json \
    "$MAIN_DB" \
    "
    SELECT
      COUNT(*) AS canonical_users_present,

      COALESCE(
        GROUP_CONCAT(id, ','),
        ''
      ) AS canonical_user_ids_csv,

      (
        SELECT COUNT(*)
        FROM users
        WHERE LOWER(nick) IN (
          $TST_NICKS_LOWER_SQL
        )
      ) AS tst_users_present,

      COALESCE(
        (
          SELECT GROUP_CONCAT(id, ',')
          FROM users
          WHERE LOWER(nick) IN (
            $TST_NICKS_LOWER_SQL
          )
        ),
        ''
      ) AS tst_user_ids_csv,

      (
        SELECT id
        FROM users
        WHERE LOWER(nick) = 'test-owner'
        LIMIT 1
      ) AS test_owner_user_id

    FROM users
    WHERE LOWER(nick) IN (
      $CANONICAL_NICKS_LOWER_SQL
    );
    "
)"

CANONICAL_STATE_ROW="$(
  printf '%s' "$CANONICAL_STATE_JSON" \
    | json_first_row
)"

CANONICAL_USER_COUNT="$(
  printf '%s' "$CANONICAL_STATE_ROW" \
    | python3 -c '
import json
import sys

row = json.load(sys.stdin)
print(int(row["canonical_users_present"]))
'
)"

PRESERVED_USER_IDS_CSV="$(
  printf '%s' "$CANONICAL_STATE_ROW" \
    | python3 -c '
import json
import sys

row = json.load(sys.stdin)
print(str(row["canonical_user_ids_csv"] or ""))
'
)"

TST_USER_COUNT="$(
  printf '%s' "$CANONICAL_STATE_ROW" \
    | python3 -c '
import json
import sys

row = json.load(sys.stdin)
print(int(row["tst_users_present"]))
'
)"

TST_USER_IDS_CSV="$(
  printf '%s' "$CANONICAL_STATE_ROW" \
    | python3 -c '
import json
import sys

row = json.load(sys.stdin)
print(str(row["tst_user_ids_csv"] or ""))
'
)"

TEST_OWNER_USER_ID="$(
  printf '%s' "$CANONICAL_STATE_ROW" \
    | python3 -c '
import json
import sys

row = json.load(sys.stdin)
value = row.get("test_owner_user_id")

if value is None:
    raise SystemExit(
        "TEST-Owner user ID is unavailable"
    )

print(int(value))
'
)"

if (( CANONICAL_USER_COUNT < 2 || CANONICAL_USER_COUNT > 8 )); then
  fail \
    "Unexpected number of canonical TEST users: $CANONICAL_USER_COUNT"
fi

if (( TST_USER_COUNT < 0 || TST_USER_COUNT > 6 )); then
  fail \
    "Unexpected number of TST-* users: $TST_USER_COUNT"
fi

echo "Canonical users present: $CANONICAL_USER_COUNT / 8"
echo "TST users present:       $TST_USER_COUNT / 6"
echo "Canonical user IDs:      $PRESERVED_USER_IDS_CSV"

TST_IDS_FOR_SQL="$TST_USER_IDS_CSV"

if [[ -z "$TST_IDS_FOR_SQL" ]]; then
  TST_IDS_FOR_SQL="0"
fi


PII_ANCHORS_JSON="$(
  d1_json \
    "$PII_DB" \
    "
    SELECT
      (
        SELECT COUNT(*)
        FROM user_pii
        WHERE user_id = $TEST_OWNER_USER_ID
      ) = 1
        AS owner_pii_anchor,

      (
        SELECT COUNT(*)
        FROM pii_search_tokens
        WHERE user_id = $TEST_OWNER_USER_ID
      ) > 0
        AS owner_search_tokens_anchor,

      (
        SELECT COUNT(*)
        FROM user_pii
        WHERE user_id IN (
          $TST_IDS_FOR_SQL
        )
      ) = $TST_USER_COUNT
        AS present_tst_pii_anchors,

      (
        SELECT COUNT(DISTINCT user_id)
        FROM pii_search_tokens
        WHERE user_id IN (
          $TST_IDS_FOR_SQL
        )
      ) = $TST_USER_COUNT
        AS present_tst_search_token_anchors;
    "
)"

printf '%s' "$PII_ANCHORS_JSON" \
  | json_first_row \
  | assert_boolean_row \
      "PII D1 protected canonical anchors"

echo "PASS: transition-safe canonical credential discovery"
echo

echo "===== TEST R2 CONSISTENCY ====="

R2_COUNT="$(
  r2_object_count 2>/dev/null \
    || printf 'unavailable'
)"

KEY_COUNT="$(certificate_key_count)"

echo "R2 object_count (advisory): $R2_COUNT"
echo "D1 certificate keys:        $KEY_COUNT"

if [[ "$R2_COUNT" != "$KEY_COUNT" ]]; then
  echo \
    "WARN: R2 aggregate object_count differs from D1 certificate-key count."

  echo \
    "WARN: aggregate bucket statistics may be delayed."

  echo \
    "WARN: direct object probes are used as the reset interlock."
fi

CERTIFICATE_KEYS_JSON="$(
  certificate_keys_json
)"

while IFS= read -r object_key; do
  [[ -n "$object_key" ]] || continue

  case "$object_key" in
    water-meters/*)
      ;;
    *)
      fail \
        "Unexpected TEST R2 object key prefix: $object_key"
      ;;
  esac

  echo \
    "Checking TEST R2 object: $object_key"

  if r2_object_state "$object_key"; then
    echo \
      "PASS: TEST R2 object exists"
  else
    probe_status=$?

    case "$probe_status" in
      1)
        fail \
          "D1 references a missing TEST R2 object: $object_key"
        ;;
      *)
        fail \
          "Unable to verify TEST R2 object because the direct R2 probe failed: $object_key"
        ;;
    esac
  fi

done < <(
  printf '%s' \
    "$CERTIFICATE_KEYS_JSON" \
    | certificate_keys_from_json
)

echo \
  "PASS: every D1 certificate key resolves to a TEST R2 object"

echo

echo "===== CURRENT TEST RUNTIME COUNTS ====="

d1_json \
  "$MAIN_DB" \
  "
  SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM apartments) AS apartments,
    (SELECT COUNT(*) FROM water_meters) AS water_meters,
    (SELECT COUNT(*) FROM water_meter_readings) AS readings,
    (SELECT COUNT(*) FROM water_meter_calibrations) AS calibrations,
    (SELECT COUNT(*) FROM water_reporting_periods) AS periods,
    (SELECT COUNT(*) FROM auth_sessions) AS sessions,
    (SELECT COUNT(*) FROM account_recovery) AS recovery,
    (SELECT COUNT(*) FROM security_audit_log) AS security_audit,
    (SELECT COUNT(*) FROM security_rate_limits) AS rate_limits,
    (SELECT COUNT(*) FROM announcements) AS announcements,
    (SELECT COUNT(*) FROM tickets) AS tickets;
  " \
  | json_first_row

echo

if [[ "$MODE" == "check" ]]; then
  echo "PASS: TEST reset preflight completed."
  echo "NO DATA CHANGES PERFORMED."
  exit 0
fi

echo "===== REAL TEST RESET INTERLOCKS ====="

if ! git diff --quiet; then
  fail \
    "Tracked unstaged changes are present. Commit or revert them before reset."
fi

if ! git diff --cached --quiet; then
  fail \
    "Staged changes are present. Commit or unstage them before reset."
fi

echo "PASS: tracked Git state is clean"
echo "PASS: explicit --confirm-test-reset received"
echo

echo "===== DELETE TEST CERTIFICATE OBJECTS ====="

# Reuse the certificate-key inventory verified above.

DELETED_OBJECTS=0

while IFS= read -r object_key; do
  [[ -n "$object_key" ]] || continue

  case "$object_key" in
    water-meters/*)
      ;;
    *)
      fail \
        "Unexpected TEST R2 object key prefix: $object_key"
      ;;
  esac

  echo "Deleting TEST R2 object: $object_key"

  "${WRANGLER_CMD[@]}" r2 object delete \
    "${R2_BUCKET}/${object_key}" \
    --remote \
    --jurisdiction "$R2_JURISDICTION" \
    "${WRANGLER_AUTH_ARGS[@]}" \
    --force

  DELETED_OBJECTS=$((DELETED_OBJECTS + 1))
done < <(
  printf '%s' \
    "$CERTIFICATE_KEYS_JSON" \
    | certificate_keys_from_json
)

echo "Deleted TEST R2 objects: $DELETED_OBJECTS"
echo

echo "===== RESET TEST MAIN D1 ====="

OPENED_AT_SQL="NULL"

if [[ "$PERIOD_STATUS" == "open" ]]; then
  OPENED_AT_SQL="'$NOW_ISO'"
fi

MAIN_RESET_SQL="
DELETE FROM restore_executions;
DELETE FROM restore_execution_arms;
DELETE FROM restore_readiness;
DELETE FROM restore_validations;
DELETE FROM restore_offsite_checks;
DELETE FROM restore_requests;
DELETE FROM backup_runs;

DELETE FROM push_deliveries;
DELETE FROM water_reporting_period_announcements;
DELETE FROM announcement_targets;
DELETE FROM announcements;
DELETE FROM push_subscriptions;

DELETE FROM water_meter_calibrations;
DELETE FROM water_meter_readings;

DELETE FROM account_recovery;
DELETE FROM auth_sessions;
DELETE FROM security_audit_log;
DELETE FROM security_rate_limits;
DELETE FROM tickets;

DELETE FROM user_apartments;
DELETE FROM user_roles;

DELETE FROM water_meters;
DELETE FROM apartment_risers;
DELETE FROM risers;
DELETE FROM apartments;

DELETE FROM water_reporting_periods;

UPDATE facility_profile
SET updated_by = NULL;

UPDATE backup_settings
SET updated_by = NULL;

UPDATE water_reporting_settings
SET updated_by = NULL;

DELETE FROM users
WHERE nick IS NULL
   OR LOWER(nick) NOT IN (
  $CANONICAL_NICKS_LOWER_SQL
);

UPDATE users
SET
  personal_code = NULL,
  email = 'test-admin@mvx.invalid',
  is_active = 1,
  nick = 'TEST-Admin',
  updated_at = '$NOW_ISO'
WHERE LOWER(nick) = 'test-admin';

UPDATE users
SET
  personal_code = NULL,
  email = 'test-owner@mvx.invalid',
  is_active = 1,
  nick = 'TEST-Owner',
  updated_at = '$NOW_ISO'
WHERE LOWER(nick) = 'test-owner';

UPDATE users
SET
  personal_code = NULL,
  is_active = 1,
  updated_at = '$NOW_ISO'
WHERE LOWER(nick) IN (
  $TST_NICKS_LOWER_SQL
);

DELETE FROM roles;

INSERT INTO roles (id, name) VALUES
  (1, 'resident'),
  (2, 'owner'),
  (3, 'cooperative_member'),
  (4, 'board_member'),
  (5, 'manager'),
  (6, 'accountant'),
  (7, 'admin'),
  (8, 'worker');

INSERT INTO user_roles (
  user_id,
  role_id
)
SELECT
  u.id,
  r.id
FROM users u
JOIN roles r
  ON r.name =
    CASE LOWER(u.nick)
      WHEN 'test-admin' THEN 'admin'
      WHEN 'test-owner' THEN 'owner'
      WHEN 'tst-01' THEN 'owner'
      WHEN 'tst-02' THEN 'owner'
      WHEN 'tst-03' THEN 'resident'
      WHEN 'tst-04' THEN 'owner'
      WHEN 'tst-05' THEN 'admin'
      WHEN 'tst-06' THEN 'resident'
      ELSE NULL
    END
WHERE LOWER(u.nick) IN (
  $CANONICAL_NICKS_LOWER_SQL
);

INSERT INTO apartments (
  id,
  number,
  section,
  floor,
  living_area,
  non_living_area,
  heated_area,
  residents_count,
  level_count,
  notes,
  land_tax_area,
  room_count,
  alternative_heating,
  alternative_heating_area,
  hot_water_riser_count
)
VALUES
  (
    1, '901', '9', '1',
    50, 10, 60, 1, 1,
    'Synthetic TEST apartment 901',
    60, 2, 0, 0, 1
  ),
  (
    2, '101', '1', '1',
    42, 3, 45, 2, 1,
    'Synthetic TEST apartment 101',
    45, 2, 0, 0, 2
  ),
  (
    3, '102', '1', '2',
    48, 2, 50, 2, 1,
    'Synthetic TEST apartment 102',
    50, 3, 0, 0, 1
  ),
  (
    4, '201', '2', '1',
    55, 5, 60, 3, 1,
    'Synthetic TEST apartment 201',
    60, 3, 0, 0, 2
  ),
  (
    5, '202', '2', '2',
    40, 4, 44, 1, 1,
    'Synthetic TEST apartment 202',
    44, 2, 0, 0, 1
  ),
  (
    6, '203', '2', '3',
    35, 0, 35, 0, 1,
    'Synthetic TEST empty-state apartment 203',
    35, 1, 0, 0, 0
  );


INSERT INTO user_apartments (
  user_id,
  apartment_id,
  relation_type,
  is_primary
)
SELECT
  id,
  1,
  'owner',
  1
FROM users
WHERE LOWER(nick) = 'test-owner';


INSERT INTO user_apartments (
  user_id,
  apartment_id,
  relation_type,
  is_primary
)
SELECT
  id,
  2,
  'owner',
  1
FROM users
WHERE LOWER(nick) = 'tst-01';


INSERT INTO user_apartments (
  user_id,
  apartment_id,
  relation_type,
  is_primary
)
SELECT
  id,
  3,
  'owner',
  1
FROM users
WHERE LOWER(nick) = 'tst-02';


INSERT INTO user_apartments (
  user_id,
  apartment_id,
  relation_type,
  is_primary
)
SELECT
  id,
  2,
  'resident',
  1
FROM users
WHERE LOWER(nick) = 'tst-03';


INSERT INTO user_apartments (
  user_id,
  apartment_id,
  relation_type,
  is_primary
)
SELECT
  id,
  4,
  'resident',
  0
FROM users
WHERE LOWER(nick) = 'tst-03';


INSERT INTO user_apartments (
  user_id,
  apartment_id,
  relation_type,
  is_primary
)
SELECT
  id,
  4,
  'owner',
  1
FROM users
WHERE LOWER(nick) = 'tst-04';


INSERT INTO user_apartments (
  user_id,
  apartment_id,
  relation_type,
  is_primary
)
SELECT
  id,
  5,
  'owner',
  0
FROM users
WHERE LOWER(nick) = 'tst-04';


INSERT INTO risers (
  id,
  code,
  system_type,
  description,
  active
)
VALUES
  (1, 'CW-E9-1R-K', 'cold_water',
   'Synthetic TEST E9 Kitchen cold-water riser', 1),

  (2, 'HW-E9-1R-K', 'hot_water',
   'Synthetic TEST E9 Kitchen hot-water riser', 1),

  (3, 'CW-E1-1R-K', 'cold_water',
   'Synthetic TEST E1 Kitchen cold-water riser', 1),

  (4, 'HW-E1-1R-K', 'hot_water',
   'Synthetic TEST E1 Kitchen hot-water riser', 1),

  (5, 'CW-E1-2R-B', 'cold_water',
   'Synthetic TEST E1 Bathroom cold-water riser', 1),

  (6, 'HW-E1-2R-B', 'hot_water',
   'Synthetic TEST E1 Bathroom hot-water riser', 1),

  (7, 'CW-E2-1R-K', 'cold_water',
   'Synthetic TEST E2 Kitchen cold-water riser', 1),

  (8, 'HW-E2-1R-K', 'hot_water',
   'Synthetic TEST E2 Kitchen hot-water riser', 1),

  (9, 'CW-E2-2R-B', 'cold_water',
   'Synthetic TEST E2 Bathroom cold-water riser', 1),

  (10, 'HW-E2-2R-B', 'hot_water',
   'Synthetic TEST E2 Bathroom hot-water riser', 1);


INSERT INTO apartment_risers (
  id,
  apartment_id,
  riser_id,
  local_label,
  notes,
  active
)
VALUES
  (1, 1, 1, 'Kitchen', NULL, 1),
  (2, 1, 2, 'Kitchen', NULL, 1),

  (3, 2, 3, 'Kitchen', NULL, 1),
  (4, 2, 4, 'Kitchen', NULL, 1),
  (5, 2, 5, 'Bathroom', NULL, 1),
  (6, 2, 6, 'Bathroom', NULL, 1),

  (7, 3, 3, 'Kitchen', NULL, 1),
  (8, 3, 4, 'Kitchen', NULL, 1),

  (9, 4, 7, 'Kitchen', NULL, 1),
  (10, 4, 8, 'Kitchen', NULL, 1),
  (11, 4, 9, 'Bathroom', NULL, 1),
  (12, 4, 10, 'Bathroom', NULL, 1),

  (13, 5, 9, 'Bathroom', NULL, 1),
  (14, 5, 10, 'Bathroom', NULL, 1);


INSERT INTO water_meters (
  id,
  apartment_id,
  type,
  serial_number,
  installed_at,
  active,
  deactivated_at,
  deactivation_reason,
  apartment_riser_id,
  manufacturer,
  model
)
VALUES
  (
    1, 1, 'cold',
    'TEST-CW-901-K-001',
    '2026-01-01',
    1, NULL, NULL, 1,
    'TEST', 'SYNTH-CW'
  ),
  (
    2, 1, 'hot',
    'TEST-HW-901-K-001',
    '2026-01-01',
    1, NULL, NULL, 2,
    'TEST', 'SYNTH-HW'
  ),

  (
    3, 2, 'cold',
    'TEST-CW-101-K-001',
    '2026-01-01',
    1, NULL, NULL, 3,
    'TEST', 'SYNTH-CW'
  ),
  (
    4, 2, 'hot',
    'TEST-HW-101-K-001',
    '2026-01-01',
    1, NULL, NULL, 4,
    'TEST', 'SYNTH-HW'
  ),
  (
    5, 2, 'cold',
    'TEST-CW-101-B-001',
    '2026-01-01',
    1, NULL, NULL, 5,
    'TEST', 'SYNTH-CW'
  ),
  (
    6, 2, 'hot',
    'TEST-HW-101-B-001',
    '2026-01-01',
    1, NULL, NULL, 6,
    'TEST', 'SYNTH-HW'
  ),

  (
    7, 3, 'cold',
    'TEST-CW-102-K-001',
    '2026-01-01',
    1, NULL, NULL, 7,
    'TEST', 'SYNTH-CW'
  ),
  (
    8, 3, 'hot',
    'TEST-HW-102-K-001',
    '2026-01-01',
    1, NULL, NULL, 8,
    'TEST', 'SYNTH-HW'
  ),

  (
    9, 4, 'cold',
    'TEST-CW-201-K-001',
    '2026-01-01',
    1, NULL, NULL, 9,
    'TEST', 'SYNTH-CW'
  ),
  (
    10, 4, 'hot',
    'TEST-HW-201-K-001',
    '2026-01-01',
    1, NULL, NULL, 10,
    'TEST', 'SYNTH-HW'
  ),
  (
    11, 4, 'cold',
    'TEST-CW-201-B-001',
    '2026-01-01',
    1, NULL, NULL, 11,
    'TEST', 'SYNTH-CW'
  ),
  (
    12, 4, 'hot',
    'TEST-HW-201-B-001',
    '2026-01-01',
    1, NULL, NULL, 12,
    'TEST', 'SYNTH-HW'
  ),

  (
    13, 5, 'cold',
    'TEST-CW-202-B-001',
    '2026-01-01',
    1, NULL, NULL, 13,
    'TEST', 'SYNTH-CW'
  ),
  (
    14, 5, 'hot',
    'TEST-HW-202-B-001',
    '2026-01-01',
    1, NULL, NULL, 14,
    'TEST', 'SYNTH-HW'
  );

DELETE FROM facility_profile;

INSERT INTO facility_profile (
  id,
  display_name,
  legal_name,
  registration_number,
  legal_address,
  document_set_key,
  address_line,
  city,
  postal_code,
  country,
  updated_by,
  created_at,
  updated_at
)
VALUES (
  1,
  'TEST Facility',
  'MVX TEST Facility',
  'TEST-REG-0001',
  'Test Legal Address 1, Riga, LV-0000, Latvia',
  'irlava-20',
  'Test Street 1',
  'Riga',
  'LV-0000',
  'Latvia',
  NULL,
  '$NOW_ISO',
  '$NOW_ISO'
);

DELETE FROM public_contact_settings;

INSERT INTO public_contact_settings (
  id,
  support_email,
  support_phone,
  updated_by,
  created_at,
  updated_at
)
VALUES (
  1,
  'test-admin@mvx.invalid',
  '+371 2000 0900',
  1,
  '$NOW_ISO',
  '$NOW_ISO'
);

DELETE FROM backup_settings;

INSERT INTO backup_settings (
  id,
  automatic_enabled,
  updated_by,
  created_at,
  updated_at
)
VALUES (
  1,
  0,
  NULL,
  '$NOW_ISO',
  '$NOW_ISO'
);

DELETE FROM water_reporting_settings;

INSERT INTO water_reporting_settings (
  id,
  days_before_month_end,
  days_after_month_end,
  timezone,
  updated_by,
  created_at,
  updated_at
)
VALUES (
  1,
  5,
  5,
  'Europe/Riga',
  1,
  '$NOW_ISO',
  '$NOW_ISO'
);

INSERT INTO water_reporting_periods (
  id,
  period_year,
  period_month,
  status,
  collection_opens_at,
  collection_closes_at,
  opened_at,
  opened_by,
  closed_at,
  closed_by,
  finalized_at,
  finalized_by,
  notes,
  created_at,
  updated_at
)
VALUES
  (
    1,
    $PREVIOUS_PERIOD_YEAR,
    $PREVIOUS_PERIOD_MONTH,
    'finalized',
    '$PREVIOUS_PERIOD_OPENS',
    '$PREVIOUS_PERIOD_CLOSES',
    '$PREVIOUS_PERIOD_OPENS',
    NULL,
    '$PREVIOUS_PERIOD_CLOSES',
    NULL,
    '$PREVIOUS_PERIOD_FINALIZED_AT',
    NULL,
    'Canonical TEST previous finalized period',
    '$NOW_ISO',
    '$NOW_ISO'
  ),
  (
    2,
    $CURRENT_PERIOD_YEAR,
    $CURRENT_PERIOD_MONTH,
    'open',
    '$CURRENT_PERIOD_OPENS',
    '$CURRENT_PERIOD_CLOSES',
    '$CURRENT_PERIOD_OPENS',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Canonical TEST current open period',
    '$NOW_ISO',
    '$NOW_ISO'
  );


INSERT INTO water_meter_readings (
  id,
  meter_id,
  reading_value,
  reading_date,
  submitted_by,
  created_at,
  status,
  superseded_by_reading_id,
  correction_reason,
  corrected_by,
  corrected_at,
  reporting_period_id,
  submitted_at,
  submission_source,
  source_note
)
VALUES

  -- 901: initial baseline + complete current readings.
  (
    1, 1, 10000, '$INITIAL_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    NULL,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST initial baseline'
  ),
  (
    2, 2, 5000, '$INITIAL_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    NULL,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST initial baseline'
  ),

  -- 101: previous exists, current intentionally absent.
  (
    3, 3, 2000, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),
  (
    4, 4, 1100, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),
  (
    5, 5, 800, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),
  (
    6, 6, 400, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),

  -- 102: complete.
  (
    7, 7, 3000, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),
  (
    8, 8, 1500, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),

  -- 201: three complete, one missing current.
  (
    9, 9, 4000, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),
  (
    10, 10, 2000, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),
  (
    11, 11, 1000, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),
  (
    12, 12, 500, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),

  -- 202 cold: intentional negative consumption.
  (
    13, 13, 700, '$PREVIOUS_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    1,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST previous reading'
  ),

  -- Current-period rows begin here.

  (
    14, 1, 10120, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST current reading'
  ),
  (
    15, 2, 5070, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST current reading'
  ),

  (
    16, 7, 3100, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST current reading'
  ),
  (
    17, 8, 1550, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST current reading'
  ),

  (
    18, 9, 4100, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST current reading'
  ),
  (
    19, 10, 2060, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST current reading'
  ),
  (
    20, 11, 1040, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST current reading'
  ),

  (
    21, 13, 690, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST negative-consumption reading'
  ),

  -- Meter 14 intentionally has no previous/initial reading.
  (
    22, 14, 900, '$CURRENT_READING_DATE',
    (SELECT id FROM users
     WHERE LOWER(nick) = 'test-admin'),
    '$NOW_ISO', 'active',
    NULL, NULL, NULL, NULL,
    2,
    '$NOW_ISO',
    'admin_manual',
    'Canonical TEST missing-previous scenario'
  );


-- ---------------------------------------------------------
-- Canonical TEST announcements
--
-- Base set: 7 announcements.
-- TST-03 user-target announcement is inserted only when
-- the canonical TST-03 account has already been provisioned.
--
-- Announcement 2 is pre-linked to current period 2 so
-- Worker runtime synchronization cannot create a duplicate
-- water-period opening announcement.
-- ---------------------------------------------------------

INSERT INTO announcements (
  id,
  title,
  content,
  status,
  priority,
  publish_from,
  publish_until,
  created_by,
  created_at,
  updated_at,
  published_at
)
VALUES
  (
    1,
    'Canonical TEST general notice',
    'General published announcement visible to all TEST users.',
    'published',
    'normal',
    NULL,
    NULL,
    (
      SELECT id
      FROM users
      WHERE LOWER(nick) = 'test-admin'
    ),
    '$NOW_ISO',
    '$NOW_ISO',
    '$NOW_ISO'
  ),

  (
    2,
    'Water readings / Ūdens skaitītāju rādījumi / Показания воды',
    'Canonical TEST water-meter reporting period is open until $CURRENT_PERIOD_CLOSES.',
    'published',
    'important',
    '$CURRENT_PERIOD_OPENS',
    '$CURRENT_PERIOD_CLOSES',
    NULL,
    '$NOW_ISO',
    '$NOW_ISO',
    '$NOW_ISO'
  ),

  (
    3,
    'Canonical TEST section 1 notice',
    'Published announcement targeted to section 1.',
    'published',
    'normal',
    NULL,
    NULL,
    (
      SELECT id
      FROM users
      WHERE LOWER(nick) = 'test-admin'
    ),
    '$NOW_ISO',
    '$NOW_ISO',
    '$NOW_ISO'
  ),

  (
    4,
    'Canonical TEST apartment 201 notice',
    'Published announcement targeted to apartment 201.',
    'published',
    'normal',
    NULL,
    NULL,
    (
      SELECT id
      FROM users
      WHERE LOWER(nick) = 'test-admin'
    ),
    '$NOW_ISO',
    '$NOW_ISO',
    '$NOW_ISO'
  ),

  (
    5,
    'Canonical TEST owner-role notice',
    'Published announcement targeted to users with the owner role.',
    'published',
    'normal',
    NULL,
    NULL,
    (
      SELECT id
      FROM users
      WHERE LOWER(nick) = 'test-admin'
    ),
    '$NOW_ISO',
    '$NOW_ISO',
    '$NOW_ISO'
  ),

  (
    7,
    'Canonical TEST draft notice',
    'Draft announcement for Admin-mode testing.',
    'draft',
    'normal',
    NULL,
    NULL,
    (
      SELECT id
      FROM users
      WHERE LOWER(nick) = 'test-admin'
    ),
    '$NOW_ISO',
    '$NOW_ISO',
    NULL
  ),

  (
    8,
    'Canonical TEST archived notice',
    'Archived announcement for Admin-mode testing.',
    'archived',
    'normal',
    NULL,
    NULL,
    (
      SELECT id
      FROM users
      WHERE LOWER(nick) = 'test-admin'
    ),
    '$NOW_ISO',
    '$NOW_ISO',
    '$NOW_ISO'
  );


-- Conditional TST-03 user-target announcement.

INSERT INTO announcements (
  id,
  title,
  content,
  status,
  priority,
  publish_from,
  publish_until,
  created_by,
  created_at,
  updated_at,
  published_at
)
SELECT
  6,
  'Canonical TEST TST-03 notice',
  'Published announcement targeted only to TST-03.',
  'published',
  'normal',
  NULL,
  NULL,
  (
    SELECT id
    FROM users
    WHERE LOWER(nick) = 'test-admin'
  ),
  '$NOW_ISO',
  '$NOW_ISO',
  '$NOW_ISO'
FROM users
WHERE LOWER(nick) = 'tst-03';


INSERT INTO announcement_targets (
  announcement_id,
  target_type,
  target_value
)
VALUES
  (1, 'all', NULL),
  (2, 'all', NULL),
  (3, 'section', '1'),
  (4, 'apartment', '4'),
  (5, 'role', 'owner'),
  (7, 'all', NULL),
  (8, 'all', NULL);


INSERT INTO announcement_targets (
  announcement_id,
  target_type,
  target_value
)
SELECT
  6,
  'user',
  CAST(id AS TEXT)
FROM users
WHERE LOWER(nick) = 'tst-03';


INSERT INTO water_reporting_period_announcements (
  period_id,
  announcement_id,
  claim_token,
  created_at
)
VALUES (
  2,
  2,
  'pr8-current-period-announcement',
  '$NOW_ISO'
);

"

d1_json \
  "$MAIN_DB" \
  "$MAIN_RESET_SQL" \
  >/dev/null

echo "PASS: TEST Main D1 reset"
echo

echo "===== RESET TEST PII D1 ====="

d1_json \
  "$PII_DB" \
  "
  DELETE FROM pii_access_audit;

  DELETE FROM pii_search_tokens
  WHERE user_id NOT IN (
    $PRESERVED_USER_IDS_CSV
  );

  DELETE FROM user_pii
  WHERE user_id NOT IN (
    $PRESERVED_USER_IDS_CSV
  );
  " \
  >/dev/null

echo "PASS: TEST PII runtime state reset"
echo

echo "===== RESET TEST OPS D1 ====="

d1_json \
  "$OPS_DB" \
  "
  DELETE FROM restore_execution_journal;

  DELETE FROM system_operations_control;

  INSERT INTO system_operations_control (
    id,
    maintenance_enabled,
    maintenance_reason,
    restore_execution_id,
    enabled_at,
    disabled_at,
    updated_at
  )
  VALUES (
    1,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    '$NOW_ISO'
  );
  " \
  >/dev/null

echo "PASS: TEST OPS D1 reset"
echo

echo "===== POST-RESET VERIFICATION ====="

POST_MAIN_JSON="$(
  d1_json \
    "$MAIN_DB" \
    "
    SELECT
      (
        SELECT COUNT(*)
        FROM users
      ) = $CANONICAL_USER_COUNT
        AS users_count,

      NOT EXISTS (
        SELECT 1
        FROM users
        WHERE nick IS NULL
           OR LOWER(nick) NOT IN (
             $CANONICAL_NICKS_LOWER_SQL
           )
      )
        AS canonical_users_only,

      (
        SELECT COUNT(*)
        FROM users
        WHERE LOWER(nick) = 'test-admin'
          AND nick = 'TEST-Admin'
          AND email = 'test-admin@mvx.invalid'
          AND is_active = 1
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = 1
        AS test_admin,

      (
        SELECT COUNT(*)
        FROM users
        WHERE LOWER(nick) = 'test-owner'
          AND nick = 'TEST-Owner'
          AND email = 'test-owner@mvx.invalid'
          AND is_active = 1
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = 1
        AS test_owner,

      (
        SELECT COUNT(*)
        FROM users
        WHERE LOWER(nick) IN (
          $TST_NICKS_LOWER_SQL
        )
          AND is_active = 1
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = $TST_USER_COUNT
        AS present_tst_accounts,

      (
        SELECT COUNT(*)
        FROM roles
      ) = 8
        AS roles_count,

      (
        SELECT COUNT(*)
        FROM roles
        WHERE
          (id = 1 AND name = 'resident')
          OR (id = 2 AND name = 'owner')
          OR (id = 3 AND name = 'cooperative_member')
          OR (id = 4 AND name = 'board_member')
          OR (id = 5 AND name = 'manager')
          OR (id = 6 AND name = 'accountant')
          OR (id = 7 AND name = 'admin')
          OR (id = 8 AND name = 'worker')
      ) = 8
        AS roles_catalogue,

      (
        SELECT COUNT(*)
        FROM user_roles
      ) = $CANONICAL_USER_COUNT
        AS user_roles_count,

      (
        SELECT COUNT(*)
        FROM user_roles ur
        JOIN users u
          ON u.id = ur.user_id
        JOIN roles r
          ON r.id = ur.role_id
        WHERE
          (
            LOWER(u.nick) = 'test-admin'
            AND r.name = 'admin'
          )
          OR (
            LOWER(u.nick) = 'test-owner'
            AND r.name = 'owner'
          )
          OR (
            LOWER(u.nick) = 'tst-01'
            AND r.name = 'owner'
          )
          OR (
            LOWER(u.nick) = 'tst-02'
            AND r.name = 'owner'
          )
          OR (
            LOWER(u.nick) = 'tst-03'
            AND r.name = 'resident'
          )
          OR (
            LOWER(u.nick) = 'tst-04'
            AND r.name = 'owner'
          )
          OR (
            LOWER(u.nick) = 'tst-05'
            AND r.name = 'admin'
          )
          OR (
            LOWER(u.nick) = 'tst-06'
            AND r.name = 'resident'
          )
      ) = $CANONICAL_USER_COUNT
        AS user_roles,

      (
        SELECT COUNT(*)
        FROM apartments
      ) = 6
        AS apartments_count,

      (
        SELECT COUNT(*)
        FROM apartments
        WHERE
          (
            id = 1
            AND number = '901'
            AND section = '9'
            AND floor = '1'
            AND hot_water_riser_count = 1
          )
          OR
          (
            id = 2
            AND number = '101'
            AND section = '1'
            AND floor = '1'
            AND hot_water_riser_count = 2
          )
          OR
          (
            id = 3
            AND number = '102'
            AND section = '1'
            AND floor = '2'
            AND hot_water_riser_count = 1
          )
          OR
          (
            id = 4
            AND number = '201'
            AND section = '2'
            AND floor = '1'
            AND hot_water_riser_count = 2
          )
          OR
          (
            id = 5
            AND number = '202'
            AND section = '2'
            AND floor = '2'
            AND hot_water_riser_count = 1
          )
          OR
          (
            id = 6
            AND number = '203'
            AND section = '2'
            AND floor = '3'
            AND hot_water_riser_count = 0
          )
      ) = 6
        AS canonical_apartments,

      (
        SELECT COUNT(*)
        FROM user_apartments
      ) = (
        1
        + (
          SELECT COUNT(*)
          FROM users
          WHERE LOWER(nick) = 'tst-01'
        )
        + (
          SELECT COUNT(*)
          FROM users
          WHERE LOWER(nick) = 'tst-02'
        )
        + 2 * (
          SELECT COUNT(*)
          FROM users
          WHERE LOWER(nick) = 'tst-03'
        )
        + 2 * (
          SELECT COUNT(*)
          FROM users
          WHERE LOWER(nick) = 'tst-04'
        )
      )
        AS user_apartments_count,

      NOT EXISTS (
        SELECT 1
        FROM user_apartments ua
        JOIN users u
          ON u.id = ua.user_id
        WHERE NOT (
          (
            LOWER(u.nick) = 'test-owner'
            AND ua.apartment_id = 1
            AND ua.relation_type = 'owner'
            AND ua.is_primary = 1
          )
          OR
          (
            LOWER(u.nick) = 'tst-01'
            AND ua.apartment_id = 2
            AND ua.relation_type = 'owner'
            AND ua.is_primary = 1
          )
          OR
          (
            LOWER(u.nick) = 'tst-02'
            AND ua.apartment_id = 3
            AND ua.relation_type = 'owner'
            AND ua.is_primary = 1
          )
          OR
          (
            LOWER(u.nick) = 'tst-03'
            AND ua.apartment_id = 2
            AND ua.relation_type = 'resident'
            AND ua.is_primary = 1
          )
          OR
          (
            LOWER(u.nick) = 'tst-03'
            AND ua.apartment_id = 4
            AND ua.relation_type = 'resident'
            AND ua.is_primary = 0
          )
          OR
          (
            LOWER(u.nick) = 'tst-04'
            AND ua.apartment_id = 4
            AND ua.relation_type = 'owner'
            AND ua.is_primary = 1
          )
          OR
          (
            LOWER(u.nick) = 'tst-04'
            AND ua.apartment_id = 5
            AND ua.relation_type = 'owner'
            AND ua.is_primary = 0
          )
        )
      )
        AS canonical_user_apartments_only,

      (
        SELECT COUNT(*)
        FROM user_apartments ua
        JOIN users u
          ON u.id = ua.user_id
        WHERE LOWER(u.nick) = 'test-owner'
          AND ua.apartment_id = 1
          AND ua.relation_type = 'owner'
          AND ua.is_primary = 1
      ) = 1
        AS test_owner_apartment,

      NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE LOWER(u.nick) = 'tst-01'
          AND NOT EXISTS (
            SELECT 1
            FROM user_apartments ua
            WHERE ua.user_id = u.id
              AND ua.apartment_id = 2
              AND ua.relation_type = 'owner'
              AND ua.is_primary = 1
          )
      )
        AS tst01_apartment,

      NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE LOWER(u.nick) = 'tst-02'
          AND NOT EXISTS (
            SELECT 1
            FROM user_apartments ua
            WHERE ua.user_id = u.id
              AND ua.apartment_id = 3
              AND ua.relation_type = 'owner'
              AND ua.is_primary = 1
          )
      )
        AS tst02_apartment,

      NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE LOWER(u.nick) = 'tst-03'
          AND (
            NOT EXISTS (
              SELECT 1
              FROM user_apartments ua
              WHERE ua.user_id = u.id
                AND ua.apartment_id = 2
                AND ua.relation_type = 'resident'
                AND ua.is_primary = 1
            )
            OR
            NOT EXISTS (
              SELECT 1
              FROM user_apartments ua
              WHERE ua.user_id = u.id
                AND ua.apartment_id = 4
                AND ua.relation_type = 'resident'
                AND ua.is_primary = 0
            )
          )
      )
        AS tst03_apartments,

      NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE LOWER(u.nick) = 'tst-04'
          AND (
            NOT EXISTS (
              SELECT 1
              FROM user_apartments ua
              WHERE ua.user_id = u.id
                AND ua.apartment_id = 4
                AND ua.relation_type = 'owner'
                AND ua.is_primary = 1
            )
            OR
            NOT EXISTS (
              SELECT 1
              FROM user_apartments ua
              WHERE ua.user_id = u.id
                AND ua.apartment_id = 5
                AND ua.relation_type = 'owner'
                AND ua.is_primary = 0
            )
          )
      )
        AS tst04_apartments,

      (
        SELECT COUNT(*)
        FROM risers
      ) = 10
        AS risers_count,

      (
        SELECT COUNT(*)
        FROM risers
        WHERE
          (id = 1 AND code = 'CW-E9-1R-K'
            AND system_type = 'cold_water' AND active = 1)
          OR
          (id = 2 AND code = 'HW-E9-1R-K'
            AND system_type = 'hot_water' AND active = 1)
          OR
          (id = 3 AND code = 'CW-E1-1R-K'
            AND system_type = 'cold_water' AND active = 1)
          OR
          (id = 4 AND code = 'HW-E1-1R-K'
            AND system_type = 'hot_water' AND active = 1)
          OR
          (id = 5 AND code = 'CW-E1-2R-B'
            AND system_type = 'cold_water' AND active = 1)
          OR
          (id = 6 AND code = 'HW-E1-2R-B'
            AND system_type = 'hot_water' AND active = 1)
          OR
          (id = 7 AND code = 'CW-E2-1R-K'
            AND system_type = 'cold_water' AND active = 1)
          OR
          (id = 8 AND code = 'HW-E2-1R-K'
            AND system_type = 'hot_water' AND active = 1)
          OR
          (id = 9 AND code = 'CW-E2-2R-B'
            AND system_type = 'cold_water' AND active = 1)
          OR
          (id = 10 AND code = 'HW-E2-2R-B'
            AND system_type = 'hot_water' AND active = 1)
      ) = 10
        AS canonical_risers,

      (
        SELECT COUNT(*)
        FROM apartment_risers
      ) = 14
        AS apartment_risers_count,

      (
        SELECT COUNT(*)
        FROM apartment_risers
        WHERE
          (id = 1 AND apartment_id = 1
            AND riser_id = 1 AND local_label = 'Kitchen'
            AND active = 1)
          OR
          (id = 2 AND apartment_id = 1
            AND riser_id = 2 AND local_label = 'Kitchen'
            AND active = 1)
          OR
          (id = 3 AND apartment_id = 2
            AND riser_id = 3 AND local_label = 'Kitchen'
            AND active = 1)
          OR
          (id = 4 AND apartment_id = 2
            AND riser_id = 4 AND local_label = 'Kitchen'
            AND active = 1)
          OR
          (id = 5 AND apartment_id = 2
            AND riser_id = 5 AND local_label = 'Bathroom'
            AND active = 1)
          OR
          (id = 6 AND apartment_id = 2
            AND riser_id = 6 AND local_label = 'Bathroom'
            AND active = 1)
          OR
          (id = 7 AND apartment_id = 3
            AND riser_id = 3 AND local_label = 'Kitchen'
            AND active = 1)
          OR
          (id = 8 AND apartment_id = 3
            AND riser_id = 4 AND local_label = 'Kitchen'
            AND active = 1)
          OR
          (id = 9 AND apartment_id = 4
            AND riser_id = 7 AND local_label = 'Kitchen'
            AND active = 1)
          OR
          (id = 10 AND apartment_id = 4
            AND riser_id = 8 AND local_label = 'Kitchen'
            AND active = 1)
          OR
          (id = 11 AND apartment_id = 4
            AND riser_id = 9 AND local_label = 'Bathroom'
            AND active = 1)
          OR
          (id = 12 AND apartment_id = 4
            AND riser_id = 10 AND local_label = 'Bathroom'
            AND active = 1)
          OR
          (id = 13 AND apartment_id = 5
            AND riser_id = 9 AND local_label = 'Bathroom'
            AND active = 1)
          OR
          (id = 14 AND apartment_id = 5
            AND riser_id = 10 AND local_label = 'Bathroom'
            AND active = 1)
      ) = 14
        AS canonical_apartment_risers,

      (
        SELECT COUNT(*)
        FROM water_meters
      ) = 14
        AS water_meters_count,

      (
        SELECT COUNT(*)
        FROM water_meters
        WHERE
          (id = 1 AND apartment_id = 1
            AND type = 'cold'
            AND serial_number = 'TEST-CW-901-K-001'
            AND apartment_riser_id = 1 AND active = 1)
          OR
          (id = 2 AND apartment_id = 1
            AND type = 'hot'
            AND serial_number = 'TEST-HW-901-K-001'
            AND apartment_riser_id = 2 AND active = 1)
          OR
          (id = 3 AND apartment_id = 2
            AND type = 'cold'
            AND serial_number = 'TEST-CW-101-K-001'
            AND apartment_riser_id = 3 AND active = 1)
          OR
          (id = 4 AND apartment_id = 2
            AND type = 'hot'
            AND serial_number = 'TEST-HW-101-K-001'
            AND apartment_riser_id = 4 AND active = 1)
          OR
          (id = 5 AND apartment_id = 2
            AND type = 'cold'
            AND serial_number = 'TEST-CW-101-B-001'
            AND apartment_riser_id = 5 AND active = 1)
          OR
          (id = 6 AND apartment_id = 2
            AND type = 'hot'
            AND serial_number = 'TEST-HW-101-B-001'
            AND apartment_riser_id = 6 AND active = 1)
          OR
          (id = 7 AND apartment_id = 3
            AND type = 'cold'
            AND serial_number = 'TEST-CW-102-K-001'
            AND apartment_riser_id = 7 AND active = 1)
          OR
          (id = 8 AND apartment_id = 3
            AND type = 'hot'
            AND serial_number = 'TEST-HW-102-K-001'
            AND apartment_riser_id = 8 AND active = 1)
          OR
          (id = 9 AND apartment_id = 4
            AND type = 'cold'
            AND serial_number = 'TEST-CW-201-K-001'
            AND apartment_riser_id = 9 AND active = 1)
          OR
          (id = 10 AND apartment_id = 4
            AND type = 'hot'
            AND serial_number = 'TEST-HW-201-K-001'
            AND apartment_riser_id = 10 AND active = 1)
          OR
          (id = 11 AND apartment_id = 4
            AND type = 'cold'
            AND serial_number = 'TEST-CW-201-B-001'
            AND apartment_riser_id = 11 AND active = 1)
          OR
          (id = 12 AND apartment_id = 4
            AND type = 'hot'
            AND serial_number = 'TEST-HW-201-B-001'
            AND apartment_riser_id = 12 AND active = 1)
          OR
          (id = 13 AND apartment_id = 5
            AND type = 'cold'
            AND serial_number = 'TEST-CW-202-B-001'
            AND apartment_riser_id = 13 AND active = 1)
          OR
          (id = 14 AND apartment_id = 5
            AND type = 'hot'
            AND serial_number = 'TEST-HW-202-B-001'
            AND apartment_riser_id = 14 AND active = 1)
      ) = 14
        AS canonical_water_meters,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
      ) = 22
        AS readings_count,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
        WHERE status = 'active'
          AND reporting_period_id IS NULL
          AND meter_id IN (1, 2)
          AND reading_date = '$INITIAL_READING_DATE'
      ) = 2
        AS initial_baselines,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
        WHERE status = 'active'
          AND reporting_period_id = 1
          AND meter_id BETWEEN 3 AND 13
          AND reading_date = '$PREVIOUS_READING_DATE'
      ) = 11
        AS previous_period_readings,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
        WHERE status = 'active'
          AND reporting_period_id = 2
          AND meter_id IN (
            1, 2, 7, 8, 9, 10, 11, 13, 14
          )
          AND reading_date = '$CURRENT_READING_DATE'
      ) = 9
        AS current_period_readings,

      NOT EXISTS (
        SELECT 1
        FROM water_meter_readings
        WHERE status = 'active'
          AND reporting_period_id = 2
          AND meter_id IN (3, 4, 5, 6, 12)
      )
        AS missing_current_scenarios,

      NOT EXISTS (
        SELECT 1
        FROM water_meter_readings
        WHERE status = 'active'
          AND meter_id = 14
          AND (
            reporting_period_id = 1
            OR reporting_period_id IS NULL
          )
      )
        AS missing_previous_scenario,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
        WHERE meter_id = 13
          AND reporting_period_id = 1
          AND status = 'active'
          AND reading_value = 700
      ) = 1
        AS negative_previous_anchor,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
        WHERE meter_id = 13
          AND reporting_period_id = 2
          AND status = 'active'
          AND reading_value = 690
      ) = 1
        AS negative_current_anchor,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
        WHERE meter_id = 14
          AND reporting_period_id = 2
          AND status = 'active'
          AND reading_value = 900
      ) = 1
        AS missing_previous_current_anchor,

      (
        SELECT COUNT(*)
        FROM water_meter_calibrations
      ) = 0
        AS calibrations,

      (
        SELECT COUNT(*)
        FROM facility_profile
        WHERE id = 1
          AND display_name = 'TEST Facility'
          AND legal_name = 'MVX TEST Facility'
          AND registration_number = 'TEST-REG-0001'
          AND legal_address = 'Test Legal Address 1, Riga, LV-0000, Latvia'
          AND document_set_key = 'irlava-20'
          AND address_line = 'Test Street 1'
          AND city = 'Riga'
          AND postal_code = 'LV-0000'
          AND country = 'Latvia'
      ) = 1
        AS facility,

      (
        SELECT COUNT(*)
        FROM public_contact_settings
        WHERE id = 1
          AND support_email = 'test-admin@mvx.invalid'
          AND support_phone = '+371 2000 0900'
      ) = 1
        AS public_contact,

      (
        SELECT COUNT(*)
        FROM backup_settings
        WHERE id = 1
          AND automatic_enabled = 0
      ) = 1
        AS backup_disabled,

      (
        SELECT COUNT(*)
        FROM water_reporting_settings
        WHERE id = 1
          AND days_before_month_end = 5
          AND days_after_month_end = 5
          AND timezone = 'Europe/Riga'
      ) = 1
        AS reporting_settings,

      (
        SELECT COUNT(*)
        FROM water_reporting_periods
      ) = 2
        AS periods_count,

      (
        SELECT COUNT(*)
        FROM water_reporting_periods
        WHERE id = 1
          AND period_year = $PREVIOUS_PERIOD_YEAR
          AND period_month = $PREVIOUS_PERIOD_MONTH
          AND status = 'finalized'
          AND collection_opens_at = '$PREVIOUS_PERIOD_OPENS'
          AND collection_closes_at = '$PREVIOUS_PERIOD_CLOSES'
          AND opened_at = '$PREVIOUS_PERIOD_OPENS'
          AND closed_at = '$PREVIOUS_PERIOD_CLOSES'
          AND finalized_at = '$PREVIOUS_PERIOD_FINALIZED_AT'
          AND notes =
            'Canonical TEST previous finalized period'
      ) = 1
        AS previous_finalized_period,

      (
        SELECT COUNT(*)
        FROM water_reporting_periods
        WHERE id = 2
          AND period_year = $CURRENT_PERIOD_YEAR
          AND period_month = $CURRENT_PERIOD_MONTH
          AND status = 'open'
          AND collection_opens_at = '$CURRENT_PERIOD_OPENS'
          AND collection_closes_at = '$CURRENT_PERIOD_CLOSES'
          AND opened_at = '$CURRENT_PERIOD_OPENS'
          AND closed_at IS NULL
          AND finalized_at IS NULL
          AND notes =
            'Canonical TEST current open period'
      ) = 1
        AS current_open_period,

      (SELECT COUNT(*) FROM auth_sessions) = 0
        AS sessions,

      (SELECT COUNT(*) FROM account_recovery) = 0
        AS recovery,

      (SELECT COUNT(*) FROM security_audit_log) = 0
        AS security_audit,

      (SELECT COUNT(*) FROM security_rate_limits) = 0
        AS rate_limits,

      (
        SELECT COUNT(*)
        FROM announcements
      ) = (
        7
        + (
          SELECT COUNT(*)
          FROM users
          WHERE LOWER(nick) = 'tst-03'
        )
      )
        AS announcements_count,

      (
        SELECT COUNT(*)
        FROM announcements
        WHERE
          (
            id = 1
            AND status = 'published'
            AND priority = 'normal'
            AND title = 'Canonical TEST general notice'
          )
          OR
          (
            id = 2
            AND status = 'published'
            AND priority = 'important'
            AND title =
              'Water readings / Ūdens skaitītāju rādījumi / Показания воды'
            AND publish_from = '$CURRENT_PERIOD_OPENS'
            AND publish_until = '$CURRENT_PERIOD_CLOSES'
          )
          OR
          (
            id = 3
            AND status = 'published'
            AND priority = 'normal'
            AND title = 'Canonical TEST section 1 notice'
          )
          OR
          (
            id = 4
            AND status = 'published'
            AND priority = 'normal'
            AND title = 'Canonical TEST apartment 201 notice'
          )
          OR
          (
            id = 5
            AND status = 'published'
            AND priority = 'normal'
            AND title = 'Canonical TEST owner-role notice'
          )
          OR
          (
            id = 7
            AND status = 'draft'
            AND priority = 'normal'
            AND published_at IS NULL
          )
          OR
          (
            id = 8
            AND status = 'archived'
            AND priority = 'normal'
          )
      ) = 7
        AS canonical_base_announcements,

      (
        SELECT COUNT(*)
        FROM announcement_targets
      ) = (
        7
        + (
          SELECT COUNT(*)
          FROM users
          WHERE LOWER(nick) = 'tst-03'
        )
      )
        AS announcement_targets_count,

      (
        SELECT COUNT(*)
        FROM announcement_targets
        WHERE
          (
            announcement_id = 1
            AND target_type = 'all'
            AND target_value IS NULL
          )
          OR
          (
            announcement_id = 2
            AND target_type = 'all'
            AND target_value IS NULL
          )
          OR
          (
            announcement_id = 3
            AND target_type = 'section'
            AND target_value = '1'
          )
          OR
          (
            announcement_id = 4
            AND target_type = 'apartment'
            AND target_value = '4'
          )
          OR
          (
            announcement_id = 5
            AND target_type = 'role'
            AND target_value = 'owner'
          )
          OR
          (
            announcement_id = 7
            AND target_type = 'all'
            AND target_value IS NULL
          )
          OR
          (
            announcement_id = 8
            AND target_type = 'all'
            AND target_value IS NULL
          )
      ) = 7
        AS canonical_base_announcement_targets,

      NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE LOWER(u.nick) = 'tst-03'
          AND NOT EXISTS (
            SELECT 1
            FROM announcements a
            JOIN announcement_targets target
              ON target.announcement_id = a.id
            WHERE a.id = 6
              AND a.status = 'published'
              AND a.priority = 'normal'
              AND a.title =
                'Canonical TEST TST-03 notice'
              AND target.target_type = 'user'
              AND CAST(
                target.target_value AS INTEGER
              ) = u.id
          )
      )
        AS tst03_user_announcement,

      (
        SELECT COUNT(*)
        FROM water_reporting_period_announcements
      ) = 1
        AS period_announcement_links_count,

      (
        SELECT COUNT(*)
        FROM water_reporting_period_announcements
        WHERE period_id = 2
          AND announcement_id = 2
          AND claim_token =
            'pr8-current-period-announcement'
      ) = 1
        AS current_period_announcement_link,

      (SELECT COUNT(*) FROM tickets) = 0
        AS tickets;
    "
)"

printf '%s' "$POST_MAIN_JSON" \
  | json_first_row \
  | assert_boolean_row \
      "Main D1 exact post-reset baseline"

POST_PII_JSON="$(
  d1_json \
    "$PII_DB" \
    "
    SELECT
      (
        SELECT COUNT(*)
        FROM user_pii
        WHERE user_id = $TEST_OWNER_USER_ID
      ) = 1
        AS owner_pii,

      (
        SELECT COUNT(*)
        FROM pii_search_tokens
        WHERE user_id = $TEST_OWNER_USER_ID
      ) > 0
        AS owner_search_tokens,

      (
        SELECT COUNT(*)
        FROM user_pii
        WHERE user_id IN (
          $TST_IDS_FOR_SQL
        )
      ) = $TST_USER_COUNT
        AS present_tst_pii,

      (
        SELECT COUNT(DISTINCT user_id)
        FROM pii_search_tokens
        WHERE user_id IN (
          $TST_IDS_FOR_SQL
        )
      ) = $TST_USER_COUNT
        AS present_tst_search_tokens,

      NOT EXISTS (
        SELECT 1
        FROM user_pii
        WHERE user_id IS NULL
           OR user_id NOT IN (
             $PRESERVED_USER_IDS_CSV
           )
      )
        AS canonical_pii_only,

      NOT EXISTS (
        SELECT 1
        FROM pii_search_tokens
        WHERE user_id IS NULL
           OR user_id NOT IN (
             $PRESERVED_USER_IDS_CSV
           )
      )
        AS canonical_search_tokens_only,

      (
        SELECT COUNT(*)
        FROM pii_access_audit
      ) = 0
        AS pii_audit;
    "
)"

printf '%s' "$POST_PII_JSON" \
  | json_first_row \
  | assert_boolean_row \
      "PII D1 post-reset state"

POST_OPS_JSON="$(
  d1_json \
    "$OPS_DB" \
    "
    SELECT
      (
        SELECT COUNT(*)
        FROM restore_execution_journal
      ) = 0
        AS restore_journal,

      (
        SELECT COUNT(*)
        FROM system_operations_control
        WHERE id = 1
          AND maintenance_enabled = 0
          AND restore_execution_id IS NULL
      ) = 1
        AS operations_control;
    "
)"

printf '%s' "$POST_OPS_JSON" \
  | json_first_row \
  | assert_boolean_row \
      "OPS D1 post-reset state"

POST_R2_COUNT="$(
  r2_object_count 2>/dev/null \
    || printf 'unavailable'
)"

echo \
  "R2 object_count after reset (advisory): $POST_R2_COUNT"

if [[ "$POST_R2_COUNT" != "0" ]]; then
  echo \
    "WARN: aggregate R2 object_count is non-zero or unavailable after reset."

  echo \
    "WARN: direct absence probes are authoritative for reset-managed certificate objects."
fi

while IFS= read -r object_key; do
  [[ -n "$object_key" ]] || continue

  echo \
    "Checking deleted TEST R2 object: $object_key"

  if r2_object_state "$object_key"; then
    fail \
      "TEST R2 certificate object still exists after reset: $object_key"
  else
    probe_status=$?

    case "$probe_status" in
      1)
        echo \
          "PASS: TEST R2 certificate object is absent"
        ;;
      *)
        fail \
          "Unable to verify TEST R2 object absence because the direct R2 probe failed: $object_key"
        ;;
    esac
  fi

done < <(
  printf '%s' \
    "$CERTIFICATE_KEYS_JSON" \
    | certificate_keys_from_json
)

echo \
  "PASS: all reset-managed TEST R2 certificate objects are absent"
echo

echo "============================================"
echo "PASS: MVX TEST ENVIRONMENT RESET COMPLETED"
echo "============================================"
