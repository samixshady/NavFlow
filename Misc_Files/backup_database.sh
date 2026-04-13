#!/bin/bash
# Database Backup Script for Render PostgreSQL
# Usage: ./backup_database.sh

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "NavFlow Database Backup Script"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set it with your Render database URL:"
    echo "export DATABASE_URL='postgresql://user:password@host/database'"
    exit 1
fi

# Create backup directory if it doesn't exist
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/navflow_backup_$TIMESTAMP.sql"

echo "Starting backup..."
echo "Backup file: $BACKUP_FILE"
echo ""

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup completed successfully!${NC}"
    echo "File size: $FILE_SIZE"
    echo "Location: $BACKUP_FILE"
    
    # Compress backup
    gzip $BACKUP_FILE
    echo -e "${GREEN}✓ Backup compressed${NC}"
    echo "Compressed file: ${BACKUP_FILE}.gz"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "Backup Complete"
echo "========================================="
