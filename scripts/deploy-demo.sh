#!/bin/bash

set -euo pipefail

# MVX DEMO Deployment
#
# Safe deployment entry point for the isolated MVX DEMO environment.
#
# Default:
#   ./scripts/deploy-demo.sh
#
# performs validation only and DOES NOT deploy anything.
#
# Deployment:
#   ./scripts/deploy-demo.sh --deploy
#
# Deployment with tracked uncommitted changes requires an additional,
# explicit acknowledgement:
#   ./scripts/deploy-demo.sh --deploy --allow-dirty
#
# PROD Worker and PROD Pages targets are intentionally not used by this
# script.

PROFILE="${MVX_WRANGLER_PROFILE:-mvx-system}"

DEMO_ENV="demo"
DEMO_WORKER_NAME="mvx-housing-api-demo"

DEMO_MAIN_DB="housing-demo-db"
DEMO_PII_DB="housing-demo-pii-db"
DEMO_OPS_DB="housing-demo-ops-db"
DEMO_R2_BUCKET="mvx-water-meter-certificates-demo"

DEMO_PAGES_PROJECT="mvx-housing-system-demo"
DEMO_PAGES_BRANCH="pr-2-demo"

DEMO_API_URL="https://mvx-housing-api-demo.mvx-system.workers.dev"
PROD_API_URL="https://mvx-housing-api.mvx-system.workers.dev"

PROD_MAIN_DB_ID="ebf27bcc-9980-4564-afe9-db14e444220f"
PROD_PII_DB_ID="5f20d702-446a-4a22-9d91-7ecbdc931bd0"
PROD_OPS_DB_ID="1a464954-9b41-485b-9933-ba42525a34ba"

MODE="check"
ALLOW_DIRTY=0


usage() {
  cat <<'EOF'
Usage:

  ./scripts/deploy-demo.sh
      Run DEMO deployment preflight only.
      Nothing is deployed.

  ./scripts/deploy-demo.sh --deploy
      Run preflight and deploy Worker + frontend to DEMO.
      Tracked Git changes must be clean.

  ./scripts/deploy-demo.sh --deploy --allow-dirty
      Run preflight and explicitly allow deployment of
      tracked uncommitted changes to DEMO.

Options:

  --check
      Validation only. This is the default.

  --deploy
      Perform DEMO deployment after successful preflight.

  --allow-dirty
      Allow DEMO deployment with tracked uncommitted changes.
      Has no effect unless --deploy is also specified.

  --help
      Show this help.
EOF
}


fail() {
  echo
  echo "ERROR: $*" >&2
  exit 1
}


for arg in "$@"; do
  case "$arg" in
    --check)
      MODE="check"
      ;;
    --deploy)
      MODE="deploy"
      ;;
    --allow-dirty)
      ALLOW_DIRTY=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage
      fail "Unknown argument: $arg"
      ;;
  esac
done


REPO_ROOT="$(
  git rev-parse --show-toplevel 2>/dev/null || true
)"

if [ -z "$REPO_ROOT" ]; then
  fail "Not inside the MVX Git repository."
fi

cd "$REPO_ROOT"


for required_file in \
  worker.js \
  wrangler.jsonc \
  package.json \
  src/services/api.js
do
  if [ ! -f "$required_file" ]; then
    fail "Required repository file is missing: $required_file"
  fi
done


TMP_DIR="$(mktemp -d /tmp/mvx-demo-deploy.XXXXXX)"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT


echo "=========================================="
echo "MVX DEMO DEPLOYMENT"
echo "=========================================="
echo
echo "Mode:          $MODE"
echo "Profile:       $PROFILE"
echo "Worker env:    $DEMO_ENV"
echo "Worker target: $DEMO_WORKER_NAME"
echo "Pages project: $DEMO_PAGES_PROJECT"
echo "Pages branch:  $DEMO_PAGES_BRANCH"
echo "API target:    $DEMO_API_URL"
echo


CURRENT_BRANCH="$(
  git rev-parse --abbrev-ref HEAD
)"

echo "Current Git branch: $CURRENT_BRANCH"
echo


TRACKED_CHANGES="$(
  git status --short --untracked-files=no
)"

if [ -n "$TRACKED_CHANGES" ]; then
  echo "Tracked changes:"
  printf '%s\n' "$TRACKED_CHANGES"
else
  echo "Tracked changes: none"
fi

echo


if \
  [ "$MODE" = "deploy" ] && \
  [ -n "$TRACKED_CHANGES" ] && \
  [ "$ALLOW_DIRTY" -ne 1 ]
then
  fail \
    "Tracked changes are present. Commit them first, or explicitly use --allow-dirty for DEMO."
fi


echo "===== 1/5 SOURCE VALIDATION ====="

git diff --check

node --check worker.js

if ! grep -Fq \
  "\"name\": \"$DEMO_WORKER_NAME\"" \
  wrangler.jsonc
then
  fail \
    "DEMO Worker name was not found in wrangler.jsonc."
fi

echo "PASS: source validation"
echo


echo "===== 2/5 DEMO WORKER DRY RUN ====="

WORKER_DRY_RUN="$TMP_DIR/worker-dry-run.txt"

if ! NO_COLOR=1 \
  npx wrangler deploy \
    --env "$DEMO_ENV" \
    --profile "$PROFILE" \
    --dry-run \
    >"$WORKER_DRY_RUN" 2>&1
then
  cat "$WORKER_DRY_RUN"
  fail "Wrangler DEMO Worker dry-run failed."
fi

cat "$WORKER_DRY_RUN"

for required_value in \
  "$DEMO_MAIN_DB" \
  "$DEMO_PII_DB" \
  "$DEMO_OPS_DB" \
  "$DEMO_R2_BUCKET" \
  '"demo"'
do
  if ! grep -Fq \
    "$required_value" \
    "$WORKER_DRY_RUN"
  then
    fail \
      "Expected DEMO binding not found: $required_value"
  fi
done


for forbidden_id in \
  "$PROD_MAIN_DB_ID" \
  "$PROD_PII_DB_ID" \
  "$PROD_OPS_DB_ID"
do
  if grep -Fq \
    "$forbidden_id" \
    "$WORKER_DRY_RUN"
  then
    fail \
      "PROD D1 binding detected in DEMO dry-run: $forbidden_id"
  fi
done

echo
echo "PASS: DEMO Worker bindings verified"
echo


echo "===== 3/5 DEMO PAGES PROJECT ====="

PAGES_PROJECTS="$TMP_DIR/pages-projects.json"
PAGES_PROJECTS_ERR="$TMP_DIR/pages-projects.err"

if ! NO_COLOR=1 \
  npx wrangler pages project list \
    --json \
    --profile "$PROFILE" \
    >"$PAGES_PROJECTS" \
    2>"$PAGES_PROJECTS_ERR"
then
  cat "$PAGES_PROJECTS_ERR" >&2
  fail "Unable to read Cloudflare Pages projects."
fi

python3 - \
  "$PAGES_PROJECTS" \
  "$DEMO_PAGES_PROJECT" <<'PYVERIFY'
import json
import sys

path = sys.argv[1]
expected = sys.argv[2]

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

names = {
    str(
        item.get("Project Name")
        or item.get("name")
        or item.get("Name")
        or ""
    )
    for item in data
}

if expected not in names:
    raise SystemExit(
        f"ERROR: DEMO Pages project not found: {expected}"
    )

print(
    f"PASS: DEMO Pages project found: {expected}"
)
PYVERIFY

echo


echo "===== 4/5 DEMO FRONTEND BUILD ====="

VITE_API_BASE_URL="$DEMO_API_URL" \
  npm run build

if [ ! -f dist/index.html ]; then
  fail "Frontend build did not create dist/index.html."
fi

if ! grep -Rqs \
  "$DEMO_API_URL" \
  dist
then
  fail "DEMO Worker URL is missing from dist."
fi

if grep -Rqs \
  "$PROD_API_URL" \
  dist
then
  fail "PROD Worker URL was found in DEMO dist."
fi

echo
echo "PASS: DEMO Worker URL found in dist"
echo "PASS: PROD Worker URL not found in dist"
echo


echo "===== 5/5 PREFLIGHT RESULT ====="

echo "PASS: DEMO deployment preflight completed."
echo

if [ "$MODE" != "deploy" ]; then
  echo "NO DEPLOYMENT PERFORMED."
  echo
  echo "To deploy after reviewing this result:"
  echo "  ./scripts/deploy-demo.sh --deploy"
  echo
  exit 0
fi


echo "=========================================="
echo "DEPLOYMENT AUTHORIZED: DEMO ONLY"
echo "=========================================="
echo


echo "===== DEPLOY DEMO WORKER ====="

npx wrangler deploy \
  --env "$DEMO_ENV" \
  --profile "$PROFILE"

echo


echo "===== DEPLOY DEMO FRONTEND ====="

PAGES_ARGS=(
  pages
  deploy
  dist
  --project-name
  "$DEMO_PAGES_PROJECT"
  --branch
  "$DEMO_PAGES_BRANCH"
  --profile
  "$PROFILE"
)

if \
  [ -n "$TRACKED_CHANGES" ] && \
  [ "$ALLOW_DIRTY" -eq 1 ]
then
  PAGES_ARGS+=(
    --commit-dirty=true
  )
fi

npx wrangler "${PAGES_ARGS[@]}"

echo


echo "===== VERIFY DEMO PAGES DEPLOYMENT ====="

PAGES_DEPLOYMENTS="$TMP_DIR/pages-deployments.json"
PAGES_DEPLOYMENTS_ERR="$TMP_DIR/pages-deployments.err"

if ! NO_COLOR=1 \
  npx wrangler pages deployment list \
    --project-name "$DEMO_PAGES_PROJECT" \
    --environment production \
    --json \
    --profile "$PROFILE" \
    >"$PAGES_DEPLOYMENTS" \
    2>"$PAGES_DEPLOYMENTS_ERR"
then
  cat "$PAGES_DEPLOYMENTS_ERR" >&2
  fail "Unable to verify DEMO Pages deployment."
fi

python3 - \
  "$PAGES_DEPLOYMENTS" \
  "$DEMO_PAGES_BRANCH" <<'PYVERIFY'
import json
import sys

path = sys.argv[1]
expected_branch = sys.argv[2]

with open(path, "r", encoding="utf-8") as f:
    deployments = json.load(f)

if not deployments:
    raise SystemExit(
        "ERROR: No DEMO Pages production deployment found."
    )

latest = deployments[0]

environment = str(
    latest.get("Environment") or ""
)

branch = str(
    latest.get("Branch") or ""
)

if environment != "Production":
    raise SystemExit(
        "ERROR: Latest DEMO Pages deployment is not Production."
    )

if branch != expected_branch:
    raise SystemExit(
        "ERROR: Latest DEMO Pages deployment branch mismatch: "
        f"{branch!r}"
    )

print(
    "PASS: DEMO Pages production deployment verified"
)

print(
    "Deployment ID:",
    latest.get("Id")
)

print(
    "Deployment URL:",
    latest.get("Deployment")
)
PYVERIFY

echo
echo "=========================================="
echo "PASS: DEMO DEPLOYMENT COMPLETED"
echo "=========================================="
