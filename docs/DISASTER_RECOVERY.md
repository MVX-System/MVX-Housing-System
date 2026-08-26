# MVX Disaster Recovery Procedure

Stage: 2I-SR13  
Scope: MVX Housing System

## 1. Purpose

This procedure describes the backup and disaster-recovery model for MVX and the sequence for restoring the system after loss or corruption of Cloudflare D1 databases, R2 certificate storage, Worker deployment, frontend deployment, or critical configuration.

The production DR model has three layers:

1. Cloudflare D1 Time Travel for short-term point-in-time recovery.
2. R2 Bucket Lock for protection of certificate objects from accidental deletion or overwrite.
3. Weekly encrypted off-platform backup to MEGA through GitHub Actions.

A manual local backup script remains available for additional control backups before critical migrations or major releases.

---

## 2. Production backup architecture

### 2.1 D1 Time Travel

Databases:

- `housing-db`
- `housing-pii-db`

Time Travel has been verified for both databases with:

```bash
npx wrangler d1 time-travel info housing-db   --profile mvx-system

npx wrangler d1 time-travel info housing-pii-db   --profile mvx-system
```

Both databases returned valid current bookmarks.

Time Travel is the first line of recovery for recent accidental changes or corruption.

Do not run `time-travel restore` unless an actual restore is intended.

---

### 2.2 R2 certificate protection

Bucket:

```text
mvx-water-meter-certificates
```

Bucket Lock rule:

```text
name: mvx-certificates-90d
enabled: Yes
prefix: all prefixes
retention: 90 days
```

The rule protects certificate objects against deletion or overwrite during the retention period.

Verify the rule with:

```bash
npx wrangler r2 bucket lock list mvx-water-meter-certificates   --profile mvx-system
```

Bucket Lock is not a substitute for an off-platform backup.

---

### 2.3 Weekly encrypted MEGA backup

Production workflow:

```text
.github/workflows/mvx-weekly-backup.yml
```

Schedule:

```text
Every Sunday at 03:30 UTC
```

The workflow can also be started manually through:

```text
GitHub → Actions → MVX Weekly Encrypted Backup → Run workflow
```

The workflow:

1. exports `housing-db`;
2. exports `housing-pii-db`;
3. restores both SQL dumps into temporary SQLite databases;
4. runs `PRAGMA integrity_check`;
5. extracts all referenced `certificate_file_key` values;
6. downloads referenced R2 certificate objects;
7. creates `manifest.txt`;
8. creates `r2-manifest.tsv`;
9. creates `SHA256SUMS`;
10. builds a compressed archive;
11. encrypts the archive using AES-256-CBC with PBKDF2;
12. uploads the encrypted archive to MEGA;
13. verifies that the uploaded file is visible in MEGA;
14. removes temporary files from the GitHub runner.

MEGA destination:

```text
/MVX-Backups
```

Backup archive format:

```text
backup-YYYYMMDD-HHMMSS.tar.gz.enc
```

Unencrypted backup contents are not stored in GitHub.

---

## 3. GitHub Actions secrets

The weekly backup workflow uses these GitHub repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
MEGA_SESSION
MVX_BACKUP_ENCRYPTION_PASSWORD
```

The Cloudflare API token is restricted to the MVX account and has the permissions required for:

- D1 export;
- R2 read access.

Do not store any secret value in:

- Git;
- workflow YAML;
- documentation;
- issue text;
- commit messages.

The MEGA account password itself is not required by the workflow because authentication uses a MEGA session secret.

---

## 4. Worker secrets required for full recovery

The Worker requires:

```text
JWT_SECRET
PII_ENCRYPTION_KEY
PII_HMAC_KEY
VAPID_PRIVATE_KEY
```

### PII_ENCRYPTION_KEY

Critical.

Loss of this key makes encrypted personal data in `housing-pii-db` unrecoverable even when a valid database backup exists.

It must have an independent copy outside Cloudflare.

### PII_HMAC_KEY

Required for the deterministic PII search index.

It must have an independent copy outside Cloudflare.

### VAPID_PRIVATE_KEY

Must correspond to the `VAPID_PUBLIC_KEY` stored in `wrangler.jsonc`.

The current VAPID pair was rotated during SR13 and verified by successful push delivery.

The private key must have an independent recovery copy.

### JWT_SECRET

The original value is not mandatory for DR.

If it is lost, generate a new strong random value and upload it. Existing JWTs will become invalid and users will be required to log in again.

---

## 5. Source code and configuration recovery

The primary source is the GitHub repository:

```text
MVX-System/MVX-Housing-System
```

Important tracked files include:

```text
worker.js
wrangler.jsonc
scripts/mvx-backup.sh
.github/workflows/mvx-weekly-backup.yml
docs/DISASTER_RECOVERY.md
```

Clone the repository before rebuilding a lost environment.

---

## 6. Manual local backup

A manual backup can be created from a trusted Mac before:

- database migrations;
- schema changes;
- security changes;
- major releases;
- destructive maintenance.

Run:

```bash
cd /Users/jevgenijs/Projects/MVX
./scripts/mvx-backup.sh
```

Default local destination:

```text
~/MVX-Backups/backup-YYYYMMDD-HHMMSS/
```

The script:

- exports both D1 databases;
- validates both SQL dumps locally;
- backs up all referenced R2 certificate objects;
- creates manifests;
- creates SHA-256 checksums;
- does not export Worker secret values.

This manual process is an additional recovery layer, not the primary weekly backup mechanism.

---

## 7. Validate an encrypted MEGA backup

Download an encrypted archive from MEGA:

```bash
mega-get   /MVX-Backups/backup-YYYYMMDD-HHMMSS.tar.gz.enc   "$HOME/MVX-Backups/restore-test/"
```

Decrypt it:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000   -in backup-YYYYMMDD-HHMMSS.tar.gz.enc   -out backup-YYYYMMDD-HHMMSS.tar.gz
```

List the archive before extraction:

```bash
tar -tzf backup-YYYYMMDD-HHMMSS.tar.gz
```

Extract it:

```bash
tar -xzf backup-YYYYMMDD-HHMMSS.tar.gz
```

On macOS verify internal checksums with:

```bash
cd backup-YYYYMMDD-HHMMSS
shasum -a 256 -c SHA256SUMS
```

Expected result:

```text
./housing-db.sql: OK
./housing-pii-db.sql: OK
./manifest.txt: OK
./r2-manifest.tsv: OK
```

If R2 objects are present, their files are also covered by `SHA256SUMS`.

Do not use a backup for recovery if checksum validation fails.

---

## 8. Validate SQL dumps before production restore

Create temporary SQLite databases:

```bash
TEST_DIR="$(mktemp -d)"

sqlite3 "$TEST_DIR/housing-db.sqlite"   < housing-db.sql

sqlite3 "$TEST_DIR/housing-pii-db.sqlite"   < housing-pii-db.sql
```

Run:

```bash
sqlite3 "$TEST_DIR/housing-db.sqlite"   "PRAGMA integrity_check;"

sqlite3 "$TEST_DIR/housing-pii-db.sqlite"   "PRAGMA integrity_check;"
```

Expected result for both:

```text
ok
```

Remove the temporary validation databases:

```bash
rm -rf "$TEST_DIR"
```

---

## 9. Recovery decision: Time Travel or full backup

### Use D1 Time Travel when:

- the database still exists;
- the problem is recent;
- the required recovery point is inside the available Time Travel window;
- only D1 state needs to be rolled back.

### Use the encrypted MEGA backup when:

- the database or account environment must be rebuilt;
- the required recovery point is outside the available Time Travel window;
- independent off-platform recovery is required;
- R2 certificate data must be restored together with D1 state.

Before any production restore, identify the desired recovery point and preserve the current state if possible.

---

## 10. D1 Time Travel restore

First inspect available recovery information:

```bash
npx wrangler d1 time-travel info housing-db   --profile mvx-system
```

or:

```bash
npx wrangler d1 time-travel info housing-pii-db   --profile mvx-system
```

Only when the restore point has been selected should `time-travel restore` be used.

Do not experiment with Time Travel restore against production.

---

## 11. Full Main D1 restore

For an empty recreated database:

```bash
npx wrangler d1 execute housing-db   --remote   --profile mvx-system   --file housing-db.sql
```

After restoration, verify representative counts:

```bash
npx wrangler d1 execute housing-db   --remote   --profile mvx-system   --command "
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS apartments FROM apartments;
SELECT COUNT(*) AS meters FROM water_meters;
"
```

Compare with the backup manifest and known production state.

---

## 12. Full PII D1 restore

For an empty recreated PII database:

```bash
npx wrangler d1 execute housing-pii-db   --remote   --profile mvx-system   --file housing-pii-db.sql
```

Verify schema and counts without printing decrypted PII:

```bash
npx wrangler d1 execute housing-pii-db   --remote   --profile mvx-system   --command "
SELECT COUNT(*) AS pii_users FROM user_pii;
SELECT COUNT(*) AS search_tokens FROM pii_search_tokens;
"
```

Do not print decrypted personal data during routine recovery validation.

---

## 13. Restore R2 certificate objects

Backup R2 objects are stored under:

```text
r2/
```

Original object keys are recorded in:

```text
r2-manifest.tsv
```

Restore each object using its exact original key:

```bash
npx wrangler r2 object put   "mvx-water-meter-certificates/<object-key>"   --remote   --profile mvx-system   --file "r2/<object-key>"
```

The exact object key must remain identical to the value referenced by:

```text
water_meter_calibrations.certificate_file_key
```

After restoration, verify that every D1-referenced certificate object exists in R2.

---

## 14. Restore Worker secrets

Restore the original PII encryption key:

```bash
npx wrangler secret put PII_ENCRYPTION_KEY   --profile mvx-system
```

Restore the original PII HMAC key:

```bash
npx wrangler secret put PII_HMAC_KEY   --profile mvx-system
```

Restore the VAPID private key:

```bash
npx wrangler secret put VAPID_PRIVATE_KEY   --profile mvx-system
```

If the original JWT secret is unavailable, generate a new one:

```bash
openssl rand -base64 48
```

Then upload it:

```bash
npx wrangler secret put JWT_SECRET   --profile mvx-system
```

Never place secret values directly on a shell command line where they may be recorded in shell history.

---

## 15. Deploy Worker

From the repository root:

```bash
npx wrangler deploy --profile mvx-system
```

Verify:

- Main D1 binding;
- PII D1 binding;
- R2 binding;
- public environment variables;
- scheduled retention Cron;
- successful production deployment.

---

## 16. Deploy frontend

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Deploy:

```bash
npx wrangler pages deploy dist   --project-name mvx-housing-system   --profile mvx-system
```

---

## 17. Post-recovery functional verification

Verify in this order:

1. Login works.
2. `/api/me` works.
3. Admin access works.
4. Resident access works.
5. Main D1 data is present.
6. PII decrypt/read paths work.
7. PII search works.
8. Water meter data is present.
9. Water reading history is present.
10. Announcements are present.
11. R2 certificate download works for restored certificates.
12. Push subscriptions can be created.
13. Send one test urgent announcement.
14. Confirm push delivery.
15. Confirm `security_audit_log` records expected security/admin activity.
16. Confirm retention Cron remains configured.
17. Confirm R2 Bucket Lock remains configured.

---

## 18. VAPID recovery

If `VAPID_PRIVATE_KEY` is lost:

1. generate a new VAPID pair;
2. update `VAPID_PUBLIC_KEY` in `wrangler.jsonc`;
3. upload the new `VAPID_PRIVATE_KEY`;
4. deploy the Worker;
5. recreate client push subscriptions.

Old subscriptions associated with the previous VAPID public key may fail with:

```text
VapidPkHashMismatch
```

Stale subscriptions should be deactivated after the new subscription is confirmed working.

---

## 19. Backup verification history

During SR13 the following full recovery chains were tested successfully.

### Manual Mac backup

Verified:

```text
Cloudflare → local backup → encryption → MEGA upload
→ MEGA download → decryption → extraction → SHA-256 OK
```

### GitHub Actions weekly backup

Verified:

```text
GitHub Actions → D1 export → integrity checks
→ encrypted archive → MEGA upload
→ MEGA download on Mac → decryption → extraction
→ SHA-256 OK
```

The GitHub-generated backup was therefore proven recoverable end-to-end.

---

## 20. Recommended operational policy

### Automatic

- D1 Time Travel: continuously available through Cloudflare.
- R2 Bucket Lock: 90-day retention for all certificate objects.
- Encrypted off-platform backup to MEGA: weekly.

### Manual

Run `scripts/mvx-backup.sh`:

- before major migrations;
- before destructive database maintenance;
- before significant security changes;
- before major production releases;
- whenever an additional independent recovery point is desired.

### Retention

Keep a practical set of MEGA archives rather than unlimited copies.

A recommended starting policy is:

- latest 8 weekly backups;
- selected long-term milestone backups before major releases.

Do not implement automatic deletion of old MEGA backups until the retention policy has been explicitly approved and tested.

---

## 21. Recovery order

For a full disaster recovery, restore in this order:

1. Git repository and `wrangler.jsonc`
2. Cloudflare account resources
3. Main D1
4. PII D1
5. R2 certificate objects
6. Worker secrets
7. Worker deployment
8. Frontend deployment
9. Functional verification
10. Push verification
11. Security audit verification
12. Backup automation verification

Do not delete the backup used for recovery until production has passed all verification steps.
