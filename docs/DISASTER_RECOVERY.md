# MVX Disaster Recovery Procedure

Stage: 2I-SR13  
Scope: MVX Housing System

## 1. Purpose

This procedure describes how to restore MVX after loss or corruption of the Cloudflare environment, D1 databases, R2 certificate storage, Worker deployment, or frontend deployment.

The procedure assumes that the source repository is available from GitHub and that a valid backup created by `scripts/mvx-backup.sh` is available.

## 2. Recovery inventory

### Source code and configuration
Stored in GitHub:
- application source code
- `worker.js`
- `wrangler.jsonc`
- `scripts/mvx-backup.sh`

### Main D1
Database:
- `housing-db`

Backup file:
- `housing-db.sql`

### PII D1
Database:
- `housing-pii-db`

Backup file:
- `housing-pii-db.sql`

### R2
Bucket:
- `mvx-water-meter-certificates`

Backup location:
- `r2/`

Object manifest:
- `r2-manifest.tsv`

### Required Worker secrets
- `JWT_SECRET`
- `PII_ENCRYPTION_KEY`
- `PII_HMAC_KEY`
- `VAPID_PRIVATE_KEY`

Important:
- `PII_ENCRYPTION_KEY` is critical for decrypting PII.
- `PII_HMAC_KEY` is required for the deterministic PII search index.
- `VAPID_PRIVATE_KEY` must correspond to the `VAPID_PUBLIC_KEY` stored in `wrangler.jsonc`.
- `JWT_SECRET` may be regenerated during disaster recovery. Regenerating it invalidates all existing JWTs and forces users to log in again.

Secret values must never be committed to Git.

## 3. Validate the backup before restoration

Set the backup directory:

```bash
BACKUP_DIR="$HOME/MVX-Backups/backup-YYYYMMDD-HHMMSS"
```

Verify checksums:

```bash
cd "$BACKUP_DIR"
shasum -a 256 -c SHA256SUMS
```

Expected result:
- every listed file reports `OK`.

Test both SQL dumps locally:

```bash
TEST_DIR="$(mktemp -d)"

sqlite3 "$TEST_DIR/housing-db.sqlite"   < "$BACKUP_DIR/housing-db.sql"

sqlite3 "$TEST_DIR/housing-pii-db.sqlite"   < "$BACKUP_DIR/housing-pii-db.sql"

sqlite3 "$TEST_DIR/housing-db.sqlite"   "PRAGMA integrity_check;"

sqlite3 "$TEST_DIR/housing-pii-db.sqlite"   "PRAGMA integrity_check;"

rm -rf "$TEST_DIR"
```

Expected result for both databases:
- `ok`

Do not continue with a backup that fails checksum or integrity validation.

## 4. Restore or recreate Cloudflare resources

Use the Cloudflare account/profile intended for MVX.

Confirm authentication:

```bash
npx wrangler whoami
```

Expected account:
- `MVX-System`

If the original D1 databases and R2 bucket still exist, they may be reused.

If they were lost, recreate:
- Main D1 database
- PII D1 database
- R2 bucket

If new D1 database IDs are created, update them in `wrangler.jsonc` before deployment.

## 5. Restore Main D1

For an empty recreated database:

```bash
npx wrangler d1 execute housing-db   --remote   --profile mvx-system   --file "$BACKUP_DIR/housing-db.sql"
```

After restoration:

```bash
npx wrangler d1 execute housing-db   --remote   --profile mvx-system   --command "
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS apartments FROM apartments;
SELECT COUNT(*) AS meters FROM water_meters;
"
```

Compare the results with the backup or known production state.

## 6. Restore PII D1

```bash
npx wrangler d1 execute housing-pii-db   --remote   --profile mvx-system   --file "$BACKUP_DIR/housing-pii-db.sql"
```

After restoration, verify only counts and schema unless PII review is specifically required:

```bash
npx wrangler d1 execute housing-pii-db   --remote   --profile mvx-system   --command "
SELECT COUNT(*) AS pii_users FROM user_pii;
SELECT COUNT(*) AS search_tokens FROM pii_search_tokens;
"
```

Do not print decrypted PII during routine recovery validation.

## 7. Restore R2 certificate objects

If `r2-manifest.tsv` is empty, there are no certificate objects to restore.

If objects exist, restore every object using its original R2 key.

Example:

```bash
npx wrangler r2 object put   "mvx-water-meter-certificates/<object-key>"   --remote   --profile mvx-system   --file "$BACKUP_DIR/r2/<object-key>"
```

Preserve the exact object key stored in:
- `water_meter_calibrations.certificate_file_key`

After restoration, verify that every object referenced in D1 exists in R2.

## 8. Restore Worker secrets

### PII encryption

Restore the original value:

```bash
npx wrangler secret put PII_ENCRYPTION_KEY   --profile mvx-system
```

This key must be the same key that was used before the backup was created.

### PII HMAC

```bash
npx wrangler secret put PII_HMAC_KEY   --profile mvx-system
```

Use the original saved value.

### VAPID private key

```bash
npx wrangler secret put VAPID_PRIVATE_KEY   --profile mvx-system
```

Use the private key paired with the public key in `wrangler.jsonc`.

### JWT secret

If the original value is unavailable, generate a new strong random value and upload it:

```bash
openssl rand -base64 48
```

Then:

```bash
npx wrangler secret put JWT_SECRET   --profile mvx-system
```

A new JWT secret intentionally invalidates all old sessions.

## 9. Deploy the Worker

From the repository root:

```bash
npx wrangler deploy --profile mvx-system
```

Verify:
- correct D1 bindings
- correct R2 binding
- expected public environment variables
- Cron trigger
- successful Worker version deployment

## 10. Restore frontend

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Deploy production Pages:

```bash
npx wrangler pages deploy dist   --project-name mvx-housing-system   --profile mvx-system
```

## 11. Post-recovery verification

Verify in this order:

1. Login works.
2. `/api/me` returns the current user.
3. Admin access works for an admin account.
4. Resident access works for a resident account.
5. Main D1 data is present.
6. PII search works.
7. PII decrypt/read paths work.
8. Water meter data and history are present.
9. Announcements are present.
10. R2 certificate downloads work for every restored certificate.
11. Push subscription status works.
12. Send one test urgent announcement and confirm push delivery.
13. Confirm `security_audit_log` records login/admin actions.
14. Confirm the daily retention Cron remains configured.

## 12. VAPID recovery note

If the original `VAPID_PRIVATE_KEY` is lost:
- generate a new VAPID key pair;
- update `VAPID_PUBLIC_KEY` in `wrangler.jsonc`;
- upload the new `VAPID_PRIVATE_KEY`;
- deploy the Worker;
- users must recreate push subscriptions.

Existing subscriptions created with the old public key may fail with:
- `VapidPkHashMismatch`

## 13. PII recovery note

Loss of `PII_ENCRYPTION_KEY` is a critical unrecoverable event for encrypted PII.

A valid `housing-pii-db.sql` backup without the matching encryption key is not sufficient to recover encrypted personal data.

The key must therefore be stored separately from:
- Cloudflare
- GitHub
- ordinary MVX backup folders

Recommended storage:
- trusted password manager
- macOS Keychain
- a second offline encrypted copy

## 14. Backup operation

Create a new backup manually:

```bash
./scripts/mvx-backup.sh
```

The script:
- exports both D1 databases;
- performs local integrity checks;
- backs up referenced R2 certificate objects;
- creates manifests;
- creates SHA-256 checksums;
- never exports Worker secret values.

## 15. Recovery principle

Restore in this order:

1. Git repository and `wrangler.jsonc`
2. Cloudflare D1/R2 resources
3. Main D1
4. PII D1
5. R2 objects
6. Worker secrets
7. Worker deployment
8. Frontend deployment
9. Functional verification
10. Push verification

Do not delete the backup used for recovery until the restored production environment has passed all verification steps.
