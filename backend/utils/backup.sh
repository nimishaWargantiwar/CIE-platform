#!/bin/bash
# ==========================================
# MongoDB Backup Script
# ==========================================
# Run daily via cron: 0 2 * * * /path/to/backup.sh
# Keeps last 7 daily backups.

set -euo pipefail

# Configuration (override via environment)
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/pict_cie}"
BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Derived values
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

echo "=========================================="
echo "MongoDB Backup — $(date)"
echo "=========================================="
echo "URI: ${MONGO_URI}"
echo "Backup path: ${BACKUP_PATH}"

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Run mongodump
echo "Starting backup..."
mongodump --uri="${MONGO_URI}" --out="${BACKUP_PATH}" --gzip 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Backup completed: ${BACKUP_PATH}"

  # Compress to single archive
  cd "${BACKUP_DIR}"
  tar -czf "${TIMESTAMP}.tar.gz" "${TIMESTAMP}/"
  rm -rf "${TIMESTAMP}/"
  echo "✅ Compressed to: ${TIMESTAMP}.tar.gz"

  # Cleanup old backups
  echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
  find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
  echo "✅ Cleanup complete."

  # Log remaining backups
  echo "Current backups:"
  ls -lh "${BACKUP_DIR}"/*.tar.gz 2>/dev/null || echo "No backups found."
else
  echo "❌ Backup FAILED!"
  exit 1
fi

echo "=========================================="
echo "Backup finished at $(date)"
echo "=========================================="
