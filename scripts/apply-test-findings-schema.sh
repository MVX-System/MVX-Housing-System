#!/usr/bin/env bash

set -euo pipefail

MODE="check"

PROFILE="${MVX_WRANGLER_PROFILE:-mvx-system}"
WRANGLER_VERSION="4.135.0"

ENVIRONMENT="test"

OPS_BINDING="OPS_DB"
EXPECTED_OPS_DB="housing-test-ops-db"
EXPECTED_OPS_DB_ID="6d109635-1dd7-4d22-bae7-01f052f01cba"

MIGRATION="migrations/test-findings-ops-schema.sql"

WRANGLER_CMD=(
  npx
  --yes
  "wrangler@${WRANGLER_VERSION}"
)

usage() {
  cat <<'EOF'
Usage:
  ./scripts/apply-test-findings-schema.sh --check
  ./scripts/apply-test-findings-schema.sh --apply

Modes:

  --check
    Read-only.
    Classifies the remote TEST findings schema as:
      ABSENT
      COMPLETE
      INCONSISTENT

  --apply
    Applies the committed migration only when the schema
    is exactly ABSENT.

    If the schema is already COMPLETE, no mutation occurs.

    If the schema is INCONSISTENT, the command fails and
    performs no migration.
EOF
}

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

if [[ $# -gt 1 ]]; then
  usage
  exit 2
fi

if [[ $# -eq 1 ]]; then
  case "$1" in
    --check)
      MODE="check"
      ;;
    --apply)
      MODE="apply"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 2
      ;;
  esac
fi

if [[ ! -d ".git" ]]; then
  fail "run this script from the MVX repository root"
fi

if [[ ! -f "wrangler.jsonc" ]]; then
  fail "wrangler.jsonc is missing"
fi

if [[ ! -f "$MIGRATION" ]]; then
  fail "migration is missing: $MIGRATION"
fi


echo "=============================================="
echo "MVX TEST FINDINGS OPS SCHEMA"
echo "=============================================="
echo
echo "Mode:             $MODE"
echo "Wrangler:         $WRANGLER_VERSION"
echo "Environment:      $ENVIRONMENT"
echo "OPS binding:      $OPS_BINDING"
echo "Expected D1:      $EXPECTED_OPS_DB"
echo "Migration:        $MIGRATION"
echo


echo "===== 1. TEST CONFIG SAFETY ====="

python3 - \
  "$EXPECTED_OPS_DB" \
  "$EXPECTED_OPS_DB_ID" <<'PY'
import json
import sys
from pathlib import Path

expected_name = sys.argv[1]
expected_id = sys.argv[2]

data = json.loads(
    Path("wrangler.jsonc").read_text(
        encoding="utf-8"
    )
)

test = data.get("env", {}).get("test")

if not isinstance(test, dict):
    raise SystemExit(
        "FAIL: env.test configuration is missing"
    )

environment = (
    test.get("vars", {})
    .get("MVX_ENVIRONMENT")
)

if environment != "test":
    raise SystemExit(
        "FAIL: env.test MVX_ENVIRONMENT is not test"
    )

matches = [
    item
    for item in test.get("d1_databases", [])
    if item.get("binding") == "OPS_DB"
]

if len(matches) != 1:
    raise SystemExit(
        "FAIL: env.test OPS_DB binding count "
        f"is {len(matches)}, expected 1"
    )

binding = matches[0]

if binding.get("database_name") != expected_name:
    raise SystemExit(
        "FAIL: unexpected TEST OPS database name"
    )

if binding.get("database_id") != expected_id:
    raise SystemExit(
        "FAIL: unexpected TEST OPS database ID"
    )

production_matches = [
    item
    for item in data.get("d1_databases", [])
    if item.get("database_name") == expected_name
]

demo_matches = [
    item
    for item in (
        data.get("env", {})
        .get("demo", {})
        .get("d1_databases", [])
    )
    if item.get("database_name") == expected_name
]

if production_matches:
    raise SystemExit(
        "FAIL: TEST OPS database appears "
        "in top-level PROD configuration"
    )

if demo_matches:
    raise SystemExit(
        "FAIL: TEST OPS database appears "
        "in DEMO configuration"
    )

print("PASS: exact TEST OPS binding verified")
print("PASS: TEST OPS database absent from PROD")
print("PASS: TEST OPS database absent from DEMO")
PY


echo
echo "===== 2. MIGRATION SOURCE SAFETY ====="

if ! git cat-file -e "HEAD:$MIGRATION" 2>/dev/null; then
  fail "migration is not committed in HEAD"
fi

WORKTREE_SHA="$(
  shasum -a 256 "$MIGRATION" \
    | awk '{print $1}'
)"

HEAD_SHA="$(
  git show "HEAD:$MIGRATION" \
    | shasum -a 256 \
    | awk '{print $1}'
)"

echo "Worktree SHA-256: $WORKTREE_SHA"
echo "HEAD SHA-256:     $HEAD_SHA"

if [[ "$WORKTREE_SHA" != "$HEAD_SHA" ]]; then
  fail "migration differs from committed HEAD version"
fi

echo "PASS: exact committed migration source"


echo
echo "===== 3. WRANGLER CONTROL VERSION ====="

"${WRANGLER_CMD[@]}" --version


TMP_DIR="$(
  mktemp -d \
    /tmp/mvx-findings-schema-runner.XXXXXX
)"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT


remote_json() {
  local output_file="$1"
  local sql="$2"

  if ! NO_COLOR=1 \
    "${WRANGLER_CMD[@]}" \
      d1 execute "$OPS_BINDING" \
      --env "$ENVIRONMENT" \
      --remote \
      --profile "$PROFILE" \
      --json \
      --command "$sql" \
      >"$output_file"
  then
    fail "remote D1 query failed"
  fi
}


echo
echo "===== 4. READ REMOTE SCHEMA ====="

remote_json \
  "$TMP_DIR/objects.json" \
  "
    SELECT
      type,
      name
    FROM sqlite_master
    WHERE
      (
        type = 'table'
        AND name IN (
          'test_findings',
          'test_finding_events',
          'test_finding_retests'
        )
      )
      OR
      (
        type = 'index'
        AND name LIKE 'idx_test_finding%'
      )
    ORDER BY type, name;
  "

cat "$TMP_DIR/objects.json"


remote_json \
  "$TMP_DIR/findings-columns.json" \
  "PRAGMA table_info(test_findings);"

remote_json \
  "$TMP_DIR/events-columns.json" \
  "PRAGMA table_info(test_finding_events);"

remote_json \
  "$TMP_DIR/retests-columns.json" \
  "PRAGMA table_info(test_finding_retests);"


echo
echo "===== 5. CLASSIFY REMOTE STATE ====="

SCHEMA_STATE="$(
  python3 - \
    "$TMP_DIR/objects.json" \
    "$TMP_DIR/findings-columns.json" \
    "$TMP_DIR/events-columns.json" \
    "$TMP_DIR/retests-columns.json" <<'PY'
import json
import sys


def rows(path):
    with open(
        path,
        "r",
        encoding="utf-8",
    ) as f:
        data = json.load(f)

    return data[0].get("results") or []


objects = rows(sys.argv[1])

actual_tables = {
    row["name"]
    for row in objects
    if row["type"] == "table"
}

actual_indexes = {
    row["name"]
    for row in objects
    if row["type"] == "index"
}

expected_tables = {
    "test_findings",
    "test_finding_events",
    "test_finding_retests",
}

expected_indexes = {
    "idx_test_finding_events_actor",
    "idx_test_finding_events_finding",
    "idx_test_finding_retests_assignee",
    "idx_test_finding_retests_finding",
    "idx_test_finding_retests_one_active",
    "idx_test_findings_author",
    "idx_test_findings_blocking",
    "idx_test_findings_route",
    "idx_test_findings_status",
    "idx_test_findings_type",
}

if not actual_tables and not actual_indexes:
    print("ABSENT")
    raise SystemExit(0)

if (
    actual_tables != expected_tables
    or actual_indexes != expected_indexes
):
    print("INCONSISTENT")
    raise SystemExit(0)


def column_names(path):
    return [
        row["name"]
        for row in rows(path)
    ]


expected_findings_columns = [
    "id",
    "author_user_id",
    "author_nick",
    "author_roles_json",
    "author_mode",
    "finding_type",
    "title",
    "reproduction_steps",
    "expected_result",
    "actual_result",
    "blocking",
    "extra_explanation",
    "route",
    "language",
    "app_commit_sha",
    "browser",
    "operating_system",
    "screen_width",
    "screen_height",
    "environment",
    "screenshot_key",
    "screenshot_mime_type",
    "screenshot_size_bytes",
    "status",
    "status_reason_code",
    "status_reason_text",
    "github_issue_url",
    "implementation_ref",
    "created_at",
    "updated_at",
]

expected_events_columns = [
    "id",
    "finding_id",
    "actor_user_id",
    "actor_nick",
    "actor_roles_json",
    "event_type",
    "from_status",
    "to_status",
    "reason_code",
    "comment",
    "created_at",
]

expected_retests_columns = [
    "id",
    "finding_id",
    "assigned_user_id",
    "assigned_nick",
    "assigned_by_user_id",
    "assigned_by_nick",
    "outcome",
    "comment",
    "assigned_at",
    "completed_at",
]

if column_names(sys.argv[2]) != expected_findings_columns:
    print("INCONSISTENT")
    raise SystemExit(0)

if column_names(sys.argv[3]) != expected_events_columns:
    print("INCONSISTENT")
    raise SystemExit(0)

if column_names(sys.argv[4]) != expected_retests_columns:
    print("INCONSISTENT")
    raise SystemExit(0)

print("COMPLETE")
PY
)"

echo "Schema state: $SCHEMA_STATE"

case "$SCHEMA_STATE" in
  ABSENT)
    echo \
      "NOTICE: TEST findings schema is absent."
    ;;

  COMPLETE)
    echo \
      "PASS: TEST findings schema is complete."
    ;;

  INCONSISTENT)
    fail \
      "TEST findings schema is partial or inconsistent; automatic migration is prohibited"
    ;;

  *)
    fail \
      "unexpected schema classification: $SCHEMA_STATE"
    ;;
esac


echo
echo "===== 6. MODE DECISION ====="

if [[ "$MODE" == "check" ]]; then
  if [[ "$SCHEMA_STATE" == "ABSENT" ]]; then
    echo \
      "CHECK RESULT: migration is required."
  else
    echo \
      "CHECK RESULT: migration is not required."
  fi

  echo
  echo "NO D1 MUTATION PERFORMED."
  echo
  echo "PASS: TEST findings schema check completed."
  exit 0
fi


if [[ "$SCHEMA_STATE" == "COMPLETE" ]]; then
  echo \
    "PASS: schema already complete; no migration will be applied."

  echo
  echo "NO D1 MUTATION PERFORMED."
  exit 0
fi


if [[ "$SCHEMA_STATE" != "ABSENT" ]]; then
  fail \
    "migration is allowed only from exact ABSENT state"
fi


echo
echo "=============================================="
echo "AUTHORIZED MUTATION: TEST OPS D1 ONLY"
echo "=============================================="
echo
echo "Target binding: $OPS_BINDING"
echo "Environment:    $ENVIRONMENT"
echo "Migration:      $MIGRATION"
echo


echo "===== 7. APPLY COMMITTED MIGRATION ====="

"${WRANGLER_CMD[@]}" \
  d1 execute "$OPS_BINDING" \
  --env "$ENVIRONMENT" \
  --remote \
  --profile "$PROFILE" \
  --yes \
  --file "$MIGRATION"


echo
echo "===== 8. POST-APPLY VERIFICATION ====="

"$0" --check

echo
echo "PASS: TEST findings schema application complete."
