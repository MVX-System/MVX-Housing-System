#!/usr/bin/env bash

set -euo pipefail

PROFILE="mvx-system"
CI_MODE="${MVX_TEST_RESET_CI:-false}"

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

  npx wrangler d1 execute "$db" \
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
  npx wrangler r2 bucket info \
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
    npx wrangler r2 object get \
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
# Dynamic reporting-period calculation
# ---------------------------------------------------------

PERIOD_VALUES="$(
python3 <<'PY_PERIOD_CALC'
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import calendar

tz = ZoneInfo("Europe/Riga")
now_local = datetime.now(tz)
now_utc = now_local.astimezone(timezone.utc)

days_before = 5
days_after = 5

def previous_month(year, month):
    if month == 1:
        return year - 1, 12
    return year, month - 1

def calculate(year, month):
    last_day = calendar.monthrange(year, month)[1]

    month_end = datetime(
        year,
        month,
        last_day,
        0,
        0,
        0,
        tzinfo=tz,
    )

    open_local = (
        month_end
        - timedelta(days=days_before)
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    close_local = (
        month_end
        + timedelta(days=days_after)
    ).replace(
        hour=23,
        minute=59,
        second=59,
        microsecond=0,
    )

    return (
        open_local.astimezone(timezone.utc),
        close_local.astimezone(timezone.utc),
    )

py, pm = previous_month(
    now_local.year,
    now_local.month,
)

prev_open, prev_close = calculate(py, pm)

if prev_open <= now_utc <= prev_close:
    year = py
    month = pm
    opens = prev_open
    closes = prev_close
    status = "open"
else:
    year = now_local.year
    month = now_local.month
    opens, closes = calculate(year, month)

    if now_utc < opens:
        status = "scheduled"
    else:
        status = "open"

def iso_z(value):
    return (
        value
        .astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )

iy, im = previous_month(year, month)

initial_date = f"{iy:04d}-{im:02d}-01"

print(
    "|".join(
        [
            str(year),
            str(month),
            status,
            iso_z(opens),
            iso_z(closes),
            initial_date,
            iso_z(now_utc),
        ]
    )
)
PY_PERIOD_CALC
)"

IFS='|' read -r \
  PERIOD_YEAR \
  PERIOD_MONTH \
  PERIOD_STATUS \
  PERIOD_OPENS \
  PERIOD_CLOSES \
  INITIAL_READING_DATE \
  NOW_ISO \
  <<< "$PERIOD_VALUES"

case "$PERIOD_STATUS" in
  scheduled|open)
    ;;
  *)
    fail "Unexpected calculated period status"
    ;;
esac

echo "===== CALCULATED TEST BASELINE ====="
echo "Reporting month:      ${PERIOD_YEAR}-$(printf '%02d' "$PERIOD_MONTH")"
echo "Status:               $PERIOD_STATUS"
echo "Collection opens:     $PERIOD_OPENS"
echo "Collection closes:    $PERIOD_CLOSES"
echo "Initial reading date: $INITIAL_READING_DATE"
echo

# ---------------------------------------------------------
# Protected TEST anchors
#
# Mutable TEST data is deliberately NOT required to match
# the baseline before reset. Reset is supposed to restore it.
#
# Only data that cannot safely be recreated without existing
# credentials / encryption state is protected here.
# ---------------------------------------------------------

echo "===== PROTECTED TEST ANCHORS CHECK ====="

MAIN_ANCHORS_JSON="$(
  d1_json \
    "$MAIN_DB" \
    "
    SELECT
      (
        SELECT COUNT(*)
        FROM users
        WHERE id = 1
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = 1 AS admin_password_anchor,

      (
        SELECT COUNT(*)
        FROM users
        WHERE id = 2
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = 1 AS owner_password_anchor;
    "
)"

printf '%s' "$MAIN_ANCHORS_JSON" \
  | json_first_row \
  | assert_boolean_row \
      "Main D1 protected user anchors"

PII_ANCHORS_JSON="$(
  d1_json \
    "$PII_DB" \
    "
    SELECT
      (
        SELECT COUNT(*)
        FROM user_pii
        WHERE user_id = 2
      ) = 1 AS owner_pii_anchor,

      (
        SELECT COUNT(*)
        FROM pii_search_tokens
        WHERE user_id = 2
      ) > 0 AS owner_search_tokens_anchor;
    "
)"

printf '%s' "$PII_ANCHORS_JSON" \
  | json_first_row \
  | assert_boolean_row \
      "PII D1 protected owner anchor"

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

  npx wrangler r2 object delete \
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
WHERE id NOT IN (1, 2);

UPDATE users
SET
  personal_code = NULL,
  email = 'test-admin@mvx.invalid',
  is_active = 1,
  must_change_password = 0,
  nick = 'TEST-Admin',
  updated_at = '$NOW_ISO'
WHERE id = 1;

UPDATE users
SET
  personal_code = NULL,
  email = 'test-owner@mvx.invalid',
  is_active = 1,
  must_change_password = 0,
  nick = 'TEST-Owner',
  updated_at = '$NOW_ISO'
WHERE id = 2;

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

INSERT INTO user_roles (user_id, role_id)
VALUES
  (1, 7),
  (2, 2);

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
VALUES (
  1,
  '901',
  '9',
  '1',
  50,
  10,
  60,
  1,
  1,
  'Synthetic TEST apartment',
  60,
  2,
  0,
  0,
  1
);

INSERT INTO user_apartments (
  user_id,
  apartment_id,
  relation_type,
  is_primary
)
VALUES (
  2,
  1,
  'owner',
  1
);

INSERT INTO risers (
  id,
  code,
  system_type,
  description,
  active
)
VALUES
  (
    1,
    'CW-E9-1R-K',
    'cold_water',
    'Synthetic TEST cold-water riser',
    1
  ),
  (
    2,
    'HW-E9-1R-K',
    'hot_water',
    'Synthetic TEST hot-water riser',
    1
  );

INSERT INTO apartment_risers (
  id,
  apartment_id,
  riser_id,
  local_label,
  notes,
  active
)
VALUES
  (
    1,
    1,
    1,
    'Kitchen',
    NULL,
    1
  ),
  (
    2,
    1,
    2,
    'Kitchen',
    NULL,
    1
  );

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
    1,
    1,
    'cold',
    'TEST-CW-901-K-001',
    '2026-09-01',
    1,
    NULL,
    NULL,
    1,
    'TEST',
    'SYNTH-CW'
  ),
  (
    2,
    1,
    'hot',
    'TEST-HW-901-K-001',
    '2026-09-01',
    1,
    NULL,
    NULL,
    2,
    'TEST',
    'SYNTH-HW'
  );

DELETE FROM facility_profile;

INSERT INTO facility_profile (
  id,
  display_name,
  legal_name,
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
VALUES (
  1,
  $PERIOD_YEAR,
  $PERIOD_MONTH,
  '$PERIOD_STATUS',
  '$PERIOD_OPENS',
  '$PERIOD_CLOSES',
  $OPENED_AT_SQL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'Synthetic TEST reset baseline',
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
  (
    1,
    1,
    10000,
    '$INITIAL_READING_DATE',
    1,
    '$NOW_ISO',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '$NOW_ISO',
    'admin_manual',
    'Synthetic TEST initial reading'
  ),
  (
    2,
    2,
    5000,
    '$INITIAL_READING_DATE',
    1,
    '$NOW_ISO',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '$NOW_ISO',
    'admin_manual',
    'Synthetic TEST initial reading'
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
  WHERE user_id <> 2;

  DELETE FROM user_pii
  WHERE user_id <> 2;
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
      ) = 2
        AS users_count,

      (
        SELECT COUNT(*)
        FROM users
        WHERE id = 1
          AND nick = 'TEST-Admin'
          AND email = 'test-admin@mvx.invalid'
          AND is_active = 1
          AND must_change_password = 0
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = 1
        AS test_admin,

      (
        SELECT COUNT(*)
        FROM users
        WHERE id = 2
          AND nick = 'TEST-Owner'
          AND email = 'test-owner@mvx.invalid'
          AND is_active = 1
          AND must_change_password = 0
          AND password_hash IS NOT NULL
          AND LENGTH(TRIM(password_hash)) > 0
      ) = 1
        AS test_owner,

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
      ) = 2
        AS user_roles_count,

      (
        SELECT COUNT(*)
        FROM user_roles
        WHERE
          (user_id = 1 AND role_id = 7)
          OR (user_id = 2 AND role_id = 2)
      ) = 2
        AS user_roles,

      (
        SELECT COUNT(*)
        FROM apartments
      ) = 1
        AS apartments_count,

      (
        SELECT COUNT(*)
        FROM apartments
        WHERE id = 1
          AND number = '901'
          AND section = '9'
          AND floor = '1'
          AND room_count = 2
          AND living_area = 50
          AND non_living_area = 10
          AND heated_area = 60
          AND land_tax_area = 60
          AND residents_count = 1
          AND level_count = 1
          AND alternative_heating = 0
          AND alternative_heating_area = 0
          AND hot_water_riser_count = 1
          AND notes = 'Synthetic TEST apartment'
      ) = 1
        AS apartment_901,

      (
        SELECT COUNT(*)
        FROM user_apartments
      ) = 1
        AS user_apartments_count,

      (
        SELECT COUNT(*)
        FROM user_apartments
        WHERE user_id = 2
          AND apartment_id = 1
          AND relation_type = 'owner'
          AND is_primary = 1
      ) = 1
        AS owner_apartment,

      (
        SELECT COUNT(*)
        FROM risers
      ) = 2
        AS risers_count,

      (
        SELECT COUNT(*)
        FROM risers
        WHERE id = 1
          AND code = 'CW-E9-1R-K'
          AND system_type = 'cold_water'
          AND active = 1
      ) = 1
        AS cold_riser,

      (
        SELECT COUNT(*)
        FROM risers
        WHERE id = 2
          AND code = 'HW-E9-1R-K'
          AND system_type = 'hot_water'
          AND active = 1
      ) = 1
        AS hot_riser,

      (
        SELECT COUNT(*)
        FROM apartment_risers
      ) = 2
        AS apartment_risers_count,

      (
        SELECT COUNT(*)
        FROM apartment_risers
        WHERE
          (
            id = 1
            AND apartment_id = 1
            AND riser_id = 1
            AND local_label = 'Kitchen'
            AND active = 1
          )
          OR
          (
            id = 2
            AND apartment_id = 1
            AND riser_id = 2
            AND local_label = 'Kitchen'
            AND active = 1
          )
      ) = 2
        AS apartment_risers,

      (
        SELECT COUNT(*)
        FROM water_meters
      ) = 2
        AS water_meters_count,

      (
        SELECT COUNT(*)
        FROM water_meters
        WHERE id = 1
          AND apartment_id = 1
          AND type = 'cold'
          AND serial_number = 'TEST-CW-901-K-001'
          AND apartment_riser_id = 1
          AND manufacturer = 'TEST'
          AND model = 'SYNTH-CW'
          AND active = 1
      ) = 1
        AS cold_meter,

      (
        SELECT COUNT(*)
        FROM water_meters
        WHERE id = 2
          AND apartment_id = 1
          AND type = 'hot'
          AND serial_number = 'TEST-HW-901-K-001'
          AND apartment_riser_id = 2
          AND manufacturer = 'TEST'
          AND model = 'SYNTH-HW'
          AND active = 1
      ) = 1
        AS hot_meter,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
      ) = 2
        AS readings_count,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
        WHERE id = 1
          AND meter_id = 1
          AND reading_value = 10000
          AND reading_date = '$INITIAL_READING_DATE'
          AND status = 'active'
          AND reporting_period_id IS NULL
          AND submission_source = 'admin_manual'
          AND source_note = 'Synthetic TEST initial reading'
      ) = 1
        AS cold_initial_reading,

      (
        SELECT COUNT(*)
        FROM water_meter_readings
        WHERE id = 2
          AND meter_id = 2
          AND reading_value = 5000
          AND reading_date = '$INITIAL_READING_DATE'
          AND status = 'active'
          AND reporting_period_id IS NULL
          AND submission_source = 'admin_manual'
          AND source_note = 'Synthetic TEST initial reading'
      ) = 1
        AS hot_initial_reading,

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
      ) = 1
        AS periods_count,

      (
        SELECT COUNT(*)
        FROM water_reporting_periods
        WHERE id = 1
          AND period_year = $PERIOD_YEAR
          AND period_month = $PERIOD_MONTH
          AND status = '$PERIOD_STATUS'
          AND collection_opens_at = '$PERIOD_OPENS'
          AND collection_closes_at = '$PERIOD_CLOSES'
          AND closed_at IS NULL
          AND finalized_at IS NULL
          AND notes = 'Synthetic TEST reset baseline'
      ) = 1
        AS dynamic_period,

      (SELECT COUNT(*) FROM auth_sessions) = 0
        AS sessions,

      (SELECT COUNT(*) FROM account_recovery) = 0
        AS recovery,

      (SELECT COUNT(*) FROM security_audit_log) = 0
        AS security_audit,

      (SELECT COUNT(*) FROM security_rate_limits) = 0
        AS rate_limits,

      (SELECT COUNT(*) FROM announcements) = 0
        AS announcements,

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
        WHERE user_id = 2
      ) = 1
        AS owner_pii,

      (
        SELECT COUNT(*)
        FROM user_pii
      ) = 1
        AS only_owner_pii,

      (
        SELECT COUNT(*)
        FROM pii_search_tokens
        WHERE user_id = 2
      ) > 0
        AS owner_search_tokens,

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
