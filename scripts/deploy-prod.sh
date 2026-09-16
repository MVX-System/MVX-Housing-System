#!/bin/bash

set -euo pipefail

# MVX PROD Deployment
#
# Protected deployment entry point for the MVX production environment.
#
# Default:
#   ./scripts/deploy-prod.sh
#
# performs validation only and DOES NOT deploy anything.
#
# Production deployment requires TWO explicit flags:
#   ./scripts/deploy-prod.sh --deploy --confirm-prod
#
# PROD deployment is permitted only when:
# - the working tree is completely clean;
# - the current branch is main;
# - local HEAD exactly matches origin/main;
# - Worker dry-run resolves only PROD bindings;
# - the frontend build contains only the PROD API target.
#
# There is intentionally no dirty-state override.

PROFILE="${MVX_WRANGLER_PROFILE:-mvx-system}"

WRANGLER_VERSION="4.130.0"

WRANGLER_CMD=(
  npx
  --yes
  "wrangler@${WRANGLER_VERSION}"
)

PROD_WORKER_NAME="mvx-housing-api"

PROD_MAIN_DB="housing-db"
PROD_PII_DB="housing-pii-db"
PROD_OPS_DB="housing-ops-db"
PROD_R2_BUCKET="mvx-water-meter-certificates"

PROD_MAIN_DB_ID="ebf27bcc-9980-4564-afe9-db14e444220f"
PROD_PII_DB_ID="5f20d702-446a-4a22-9d91-7ecbdc931bd0"
PROD_OPS_DB_ID="1a464954-9b41-485b-9933-ba42525a34ba"

TEST_MAIN_DB_ID="19c88ce8-cae4-4a4a-983f-a6af2bc1119f"
TEST_PII_DB_ID="9d061b87-ca08-4250-8f82-26d7e2466d58"
TEST_OPS_DB_ID="6d109635-1dd7-4d22-bae7-01f052f01cba"

DEMO_MAIN_DB_ID="1056bcbb-e45c-4125-a9ab-5b5ce2ccbde2"
DEMO_PII_DB_ID="d447e3dc-c8f3-4e13-9f7d-146fdfce786f"
DEMO_OPS_DB_ID="ef5ad1f0-b35a-4d53-b07a-9e05bd15a341"

PROD_PAGES_PROJECT="mvx-housing-system"
PROD_PAGES_BRANCH="main"

PROD_API_URL="https://mvx-housing-api.mvx-system.workers.dev"
TEST_API_URL="https://mvx-housing-api-test.mvx-system.workers.dev"
DEMO_API_URL="https://mvx-housing-api-demo.mvx-system.workers.dev"

MODE="check"
CONFIRM_PROD=0


usage() {
  cat <<'EOF'
Usage:

  ./scripts/deploy-prod.sh

      Run PROD deployment preflight only.
      Nothing is deployed.

  ./scripts/deploy-prod.sh --check

      Same as the default mode.

  ./scripts/deploy-prod.sh --deploy --confirm-prod

      Run the complete preflight and, only if every guard passes,
      deploy the Worker and frontend to PROD.

      Deployment additionally requires:
      - current branch: main
      - local HEAD == origin/main
      - completely clean working tree

Options:

  --check
      Validation only. This is the default.

  --deploy
      Request production deployment after successful preflight.

  --confirm-prod
      Explicit acknowledgement that the requested target is PROD.
      Required together with --deploy.

  --help
      Show this help.
EOF
}


fail() {
  echo
  echo "FAIL: $*" >&2
  exit 1
}


while [ "$#" -gt 0 ]; do
  case "$1" in
    --check)
      MODE="check"
      ;;
    --deploy)
      MODE="deploy"
      ;;
    --confirm-prod)
      CONFIRM_PROD=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      fail "Unknown argument: $1"
      ;;
  esac

  shift
done


if [ "$MODE" != "deploy" ] && [ "$CONFIRM_PROD" -eq 1 ]; then
  fail "--confirm-prod is valid only together with --deploy."
fi


TMP_DIR="$(mktemp -d /tmp/mvx-prod-deploy.XXXXXX)"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT


echo "=========================================="
echo "MVX PROD DEPLOYMENT"
echo "=========================================="
echo
echo "Mode:          $MODE"
echo "Profile:       $PROFILE"
echo "Wrangler:      $WRANGLER_VERSION"
echo "Worker target: $PROD_WORKER_NAME"
echo "Pages project: $PROD_PAGES_PROJECT"
echo "Pages branch:  $PROD_PAGES_BRANCH"
echo "API target:    $PROD_API_URL"
echo


echo "===== 1/5 SOURCE / GIT VALIDATION ====="

for required_file in \
  worker.js \
  wrangler.jsonc \
  package.json \
  package-lock.json
do
  [ -f "$required_file" ] || {
    fail "Required file missing: $required_file"
  }
done

CURRENT_BRANCH="$(
  git symbolic-ref --quiet --short HEAD
)" || fail "Unable to determine current Git branch."

LOCAL_HEAD="$(
  git rev-parse HEAD
)"

echo "Current branch: $CURRENT_BRANCH"
echo "Current HEAD:   $LOCAL_HEAD"

STATUS="$(
  git status --porcelain -uall
)"

if [ -n "$STATUS" ]; then
  if (
    [ "$MODE" = "check" ] &&
    [ "$STATUS" = "?? scripts/deploy-prod.sh" ]
  )
  then
    echo "$STATUS"
    echo "INFO: bootstrap check permits only the untracked PROD deployment script."
  else
    echo "$STATUS"
    fail "Working tree is not completely clean."
  fi
fi

git fetch origin main

REMOTE_MAIN="$(
  git rev-parse origin/main
)"

echo "origin/main:    $REMOTE_MAIN"

if ! git merge-base --is-ancestor \
  "$REMOTE_MAIN" \
  "$LOCAL_HEAD"
then
  fail "Current HEAD does not descend from origin/main."
fi

node --check worker.js

if ! grep -Fq \
  "\"name\": \"$PROD_WORKER_NAME\"" \
  wrangler.jsonc
then
  fail "PROD Worker name was not found in wrangler.jsonc."
fi

if ! grep -Fq \
  '"MVX_ENVIRONMENT": "production"' \
  wrangler.jsonc
then
  fail "PROD environment marker missing from wrangler.jsonc."
fi

python3 <<'PYVERIFY'
from pathlib import Path
import sys

text = Path("wrangler.jsonc").read_text(
    encoding="utf-8"
)

env_marker = '"env"'

if env_marker not in text:
    print("ERROR: wrangler.jsonc env section not found")
    sys.exit(1)

top_level = text.split(env_marker, 1)[0]

required_pairs = {
    "housing-db":
        "ebf27bcc-9980-4564-afe9-db14e444220f",
    "housing-pii-db":
        "5f20d702-446a-4a22-9d91-7ecbdc931bd0",
    "housing-ops-db":
        "1a464954-9b41-485b-9933-ba42525a34ba",
}

for name, db_id in required_pairs.items():
    if name not in top_level:
        print(
            f"ERROR: PROD D1 database missing from "
            f"top-level config: {name}"
        )
        sys.exit(1)

    if db_id not in top_level:
        print(
            f"ERROR: PROD D1 database ID missing from "
            f"top-level config: {db_id}"
        )
        sys.exit(1)

for forbidden_id in [
    "19c88ce8-cae4-4a4a-983f-a6af2bc1119f",
    "9d061b87-ca08-4250-8f82-26d7e2466d58",
    "6d109635-1dd7-4d22-bae7-01f052f01cba",
    "1056bcbb-e45c-4125-a9ab-5b5ce2ccbde2",
    "d447e3dc-c8f3-4e13-9f7d-146fdfce786f",
    "ef5ad1f0-b35a-4d53-b07a-9e05bd15a341",
]:
    if forbidden_id in top_level:
        print(
            "ERROR: TEST/DEMO D1 ID found in "
            "top-level PROD config:",
            forbidden_id
        )
        sys.exit(1)

print("PASS: top-level PROD D1 names/IDs exact")
print("PASS: TEST/DEMO D1 IDs absent from top-level PROD config")
PYVERIFY

echo "PASS: source and Git validation"


echo
echo "===== 2/5 PROD WORKER DRY RUN ====="

WORKER_DRY_RUN="$TMP_DIR/worker-dry-run.txt"

if ! NO_COLOR=1 \
  "${WRANGLER_CMD[@]}" deploy \
    --env="" \
    --profile "$PROFILE" \
    --dry-run \
    >"$WORKER_DRY_RUN" 2>&1
then
  cat "$WORKER_DRY_RUN"
  fail "Wrangler PROD Worker dry-run failed."
fi

cat "$WORKER_DRY_RUN"

for required_value in \
  "$PROD_MAIN_DB" \
  "$PROD_PII_DB" \
  "$PROD_OPS_DB" \
  "$PROD_R2_BUCKET" \
  '"production"'
do
  if ! grep -Fq \
    "$required_value" \
    "$WORKER_DRY_RUN"
  then
    fail "Expected PROD binding not found: $required_value"
  fi
done

for forbidden_id in \
  "$TEST_MAIN_DB_ID" \
  "$TEST_PII_DB_ID" \
  "$TEST_OPS_DB_ID" \
  "$DEMO_MAIN_DB_ID" \
  "$DEMO_PII_DB_ID" \
  "$DEMO_OPS_DB_ID"
do
  if grep -Fq \
    "$forbidden_id" \
    "$WORKER_DRY_RUN"
  then
    fail "TEST/DEMO D1 binding detected in PROD dry-run: $forbidden_id"
  fi
done

echo
echo "PASS: PROD Worker bindings verified"
echo "PASS: TEST/DEMO D1 bindings absent"


echo
echo "===== 3/5 PROD PAGES PROJECT ====="

PAGES_PROJECTS="$TMP_DIR/pages-projects.json"
PAGES_PROJECTS_ERR="$TMP_DIR/pages-projects.err"

if ! NO_COLOR=1 \
  "${WRANGLER_CMD[@]}" pages project list \
    --json \
    --profile "$PROFILE" \
    >"$PAGES_PROJECTS" \
    2>"$PAGES_PROJECTS_ERR"
then
  cat "$PAGES_PROJECTS_ERR" >&2
  fail "Unable to list Cloudflare Pages projects."
fi

python3 - \
  "$PAGES_PROJECTS" \
  "$PROD_PAGES_PROJECT" <<'PYVERIFY'
import json
import sys

filename = sys.argv[1]
expected = sys.argv[2]

with open(
    filename,
    "r",
    encoding="utf-8",
) as f:
    data = json.load(f)

if isinstance(data, dict):
    items = (
        data.get("result")
        or data.get("results")
        or []
    )
else:
    items = data

names = {
    (
        item.get("name")
        or item.get("Project Name")
    )
    for item in items
    if isinstance(item, dict)
}

names.discard(None)

if expected not in names:
    raise SystemExit(
        f"ERROR: PROD Pages project not found: {expected}"
    )

print(
    f"PASS: PROD Pages project found: {expected}"
)
PYVERIFY


echo
echo "===== 4/5 PROD FRONTEND BUILD ====="

VITE_MVX_ENV="production" \
VITE_API_BASE_URL="$PROD_API_URL" \
  npm run build

[ -f dist/index.html ] || {
  fail "dist/index.html was not created."
}

if ! grep -Fq \
  '/manifest-production.webmanifest' \
  dist/index.html
then
  fail "PROD manifest metadata is missing from dist/index.html."
fi

if ! grep -Fq \
  '/icons/production/apple-touch-icon.png' \
  dist/index.html
then
  fail "PROD Apple touch icon metadata is missing from dist/index.html."
fi

if ! grep -Fq \
  '/icons/production/favicon-32.png' \
  dist/index.html
then
  fail "PROD favicon metadata is missing from dist/index.html."
fi

if grep -Eq \
  'manifest-(test|demo)\.webmanifest|/icons/(test|demo)/(apple-touch-icon|favicon-32)\.png' \
  dist/index.html
then
  fail "Foreign environment PWA metadata was found in PROD dist/index.html."
fi

echo
echo "PASS: PROD PWA manifest and icon metadata verified."

if ! grep -Rqs \
  "$PROD_API_URL" \
  dist
then
  fail "PROD Worker URL is missing from dist."
fi

if grep -Rqs \
  "$TEST_API_URL" \
  dist
then
  fail "TEST Worker URL was found in PROD dist."
fi

if grep -Rqs \
  "$DEMO_API_URL" \
  dist
then
  fail "DEMO Worker URL was found in PROD dist."
fi

echo
echo "PASS: PROD Worker URL found in dist"
echo "PASS: TEST Worker URL not found in dist"
echo "PASS: DEMO Worker URL not found in dist"


echo
echo "===== 5/5 PREFLIGHT RESULT ====="

echo "PASS: PROD deployment preflight completed."
echo

if [ "$MODE" != "deploy" ]; then
  echo "NO DEPLOYMENT PERFORMED."
  echo
  echo "Production deployment requires:"
  echo "  1. candidate promoted to origin/main"
  echo "  2. local branch main"
  echo "  3. local HEAD exactly equal to origin/main"
  echo "  4. clean working tree"
  echo "  5. explicit command:"
  echo
  echo "     ./scripts/deploy-prod.sh --deploy --confirm-prod"
  echo
  exit 0
fi


echo "===== PROD DEPLOY AUTHORIZATION ====="

[ "$CONFIRM_PROD" -eq 1 ] || {
  fail "PROD deployment requires --confirm-prod."
}

[ "$CURRENT_BRANCH" = "main" ] || {
  fail "PROD deployment is permitted only from branch main."
}

git fetch origin main

REMOTE_MAIN="$(
  git rev-parse origin/main
)"

LOCAL_HEAD="$(
  git rev-parse HEAD
)"

[ "$LOCAL_HEAD" = "$REMOTE_MAIN" ] || {
  fail "Local main HEAD does not exactly match origin/main."
}

STATUS="$(
  git status --porcelain -uall
)"

[ -z "$STATUS" ] || {
  echo "$STATUS"
  fail "Working tree became dirty after preflight."
}

echo
echo "=========================================="
echo "DEPLOYMENT AUTHORIZED: PROD"
echo "=========================================="


echo
echo "===== DEPLOY PROD WORKER ====="

"${WRANGLER_CMD[@]}" deploy \
  --env="" \
  --profile "$PROFILE"


echo
echo "===== DEPLOY PROD FRONTEND ====="

PAGES_ARGS=(
  pages
  deploy
  dist
  --project-name
  "$PROD_PAGES_PROJECT"
  --branch
  "$PROD_PAGES_BRANCH"
  --profile
  "$PROFILE"
)

"${WRANGLER_CMD[@]}" "${PAGES_ARGS[@]}"


echo
echo "===== VERIFY PROD PAGES DEPLOYMENT ====="

PAGES_DEPLOYMENTS="$TMP_DIR/pages-deployments.json"
PAGES_DEPLOYMENTS_ERR="$TMP_DIR/pages-deployments.err"

if ! NO_COLOR=1 \
  "${WRANGLER_CMD[@]}" pages deployment list \
    --project-name "$PROD_PAGES_PROJECT" \
    --environment production \
    --json \
    --profile "$PROFILE" \
    >"$PAGES_DEPLOYMENTS" \
    2>"$PAGES_DEPLOYMENTS_ERR"
then
  cat "$PAGES_DEPLOYMENTS_ERR" >&2
  fail "Unable to verify PROD Pages deployment."
fi

python3 - \
  "$PAGES_DEPLOYMENTS" \
  "$PROD_PAGES_BRANCH" <<'PYVERIFY'
import json
import sys

filename = sys.argv[1]
expected_branch = sys.argv[2]

with open(
    filename,
    "r",
    encoding="utf-8",
) as f:
    deployments = json.load(f)

if isinstance(deployments, dict):
    deployments = (
        deployments.get("result")
        or deployments.get("results")
        or []
    )

if not deployments:
    raise SystemExit(
        "ERROR: No PROD Pages production deployment found."
    )

latest = deployments[0]

environment = (
    latest.get("environment")
    or latest.get("deployment_environment")
    or latest.get("Environment")
)

branch = (
    latest.get("branch")
    or latest.get("Branch")
    or (
        latest.get("source", {})
        .get("config", {})
        .get("branch")
        if isinstance(
            latest.get("source"),
            dict,
        )
        else None
    )
)

deployment_id = (
    latest.get("id")
    or latest.get("Id")
    or latest.get("Deployment ID")
)

deployment_url = (
    latest.get("url")
    or latest.get("Deployment")
    or latest.get("Deployment URL")
)

if environment not in {
    "Production",
    "production",
}:
    raise SystemExit(
        "ERROR: Latest PROD Pages deployment is not Production."
    )

if branch != expected_branch:
    raise SystemExit(
        "ERROR: Latest PROD Pages deployment branch mismatch: "
        f"{branch!r}"
    )

if not deployment_id:
    raise SystemExit(
        "ERROR: Latest PROD Pages deployment ID missing."
    )

if not deployment_url:
    raise SystemExit(
        "ERROR: Latest PROD Pages deployment URL missing."
    )

print(
    "PASS: PROD Pages production deployment verified"
)

print(
    "Deployment ID:",
    deployment_id,
)

print(
    "Deployment URL:",
    deployment_url,
)
PYVERIFY


echo
echo "=========================================="
echo "PASS: PROD DEPLOYMENT COMPLETED"
echo "=========================================="
