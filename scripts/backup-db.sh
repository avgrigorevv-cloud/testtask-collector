#!/bin/bash
# backup-db.sh — cron-safe SQLite backup for testtask-collector.
#
# The live database lives inside the `testtask-db` named Docker volume
# (mounted at /app/prisma/data in the running container, see Dockerfile /
# .github/workflows/deploy.yml / README.md "Деплой"), not at a bare path on
# the host. To reach it without requiring `sqlite3` to be installed on the
# host itself, this script spins up a short-lived Alpine container that
# mounts the volume read-only, installs the `sqlite3` CLI (Alpine's `sqlite`
# package) and runs the SQLite `.backup` command — NOT a raw file copy, so a
# backup taken while the app is writing doesn't end up partially written /
# corrupted (see TECH_DEBT.md #6).
#
# The resulting file is gzip-compressed with a timestamped name and dropped
# in BACKUP_DIR. Backups older than RETENTION_DAYS are pruned.
#
# Usage:
#   ./scripts/backup-db.sh
#   BACKUP_DIR=/mnt/backups ./scripts/backup-db.sh
#   ./scripts/backup-db.sh /mnt/backups 30
#
# Exits non-zero on any failure — intended to be run from cron with output
# redirected to a logfile so failures can be alerted on (e.g. by monitoring
# the logfile / cron's own mail-on-error).

set -euo pipefail

# --- configuration -----------------------------------------------------

VOLUME_NAME="${VOLUME_NAME:-testtask-db}"
DB_FILE_IN_VOLUME="${DB_FILE_IN_VOLUME:-dev.db}"

# BACKUP_DIR: env var, else first positional arg, else default.
BACKUP_DIR="${BACKUP_DIR:-${1:-/var/backups/testtask-collector}}"
# RETENTION_DAYS: env var, else second positional arg, else default.
RETENTION_DAYS="${RETENTION_DAYS:-${2:-14}}"

BACKUP_IMAGE="${BACKUP_IMAGE:-alpine:3.20}"

timestamp="$(date +%Y%m%d-%H%M%S)"
tmp_name="dev-${timestamp}.db"
gz_name="${tmp_name}.gz"

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
    log "ERROR: $*"
    exit 1
}

# --- sanity checks -------------------------------------------------------

command -v docker >/dev/null 2>&1 || fail "docker not found on PATH"

docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1 \
    || fail "docker volume '$VOLUME_NAME' does not exist"

mkdir -p "$BACKUP_DIR" || fail "could not create BACKUP_DIR '$BACKUP_DIR'"

# --- take the backup -------------------------------------------------------

log "starting backup of volume '$VOLUME_NAME' -> $BACKUP_DIR/$gz_name"

# Run sqlite3 .backup from inside a throwaway container that mounts the
# live volume read-only and the host backup dir read-write. Alpine doesn't
# ship sqlite3 by default, so install the `sqlite` package first — this
# keeps the script self-contained without requiring sqlite3 on the bare host.
if ! docker run --rm \
    -v "${VOLUME_NAME}:/data:ro" \
    -v "${BACKUP_DIR}:/backup" \
    "$BACKUP_IMAGE" \
    sh -c "set -e; apk add --no-cache sqlite >/dev/null; \
        test -f \"/data/${DB_FILE_IN_VOLUME}\" || { echo \"db file /data/${DB_FILE_IN_VOLUME} not found in volume\" >&2; exit 1; }; \
        sqlite3 \"/data/${DB_FILE_IN_VOLUME}\" \".backup '/backup/${tmp_name}'\""
then
    fail "sqlite3 .backup failed"
fi

[ -s "${BACKUP_DIR}/${tmp_name}" ] || fail "backup file is missing or empty: ${BACKUP_DIR}/${tmp_name}"

gzip -f "${BACKUP_DIR}/${tmp_name}" || fail "gzip compression failed"

[ -s "${BACKUP_DIR}/${gz_name}" ] || fail "compressed backup is missing or empty: ${BACKUP_DIR}/${gz_name}"

log "backup written: ${BACKUP_DIR}/${gz_name} ($(du -h "${BACKUP_DIR}/${gz_name}" | cut -f1))"

# --- prune old backups -------------------------------------------------------

log "pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}"

find "$BACKUP_DIR" -maxdepth 1 -name 'dev-*.db.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete \
    || fail "pruning old backups failed"

log "done"
