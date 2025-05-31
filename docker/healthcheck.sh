#!/bin/bash
set -e

# Health check for Hackloumi Chat application
# Check if PostgreSQL is ready and Next.js app is responding

# Database configuration from environment variables with defaults
DB_NAME="${POSTGRES_DB:-hackloumi}"
DB_USER="${POSTGRES_USER:-hackloumi}"

# Check PostgreSQL
if ! pg_isready -h localhost -p 5432 -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    echo "PostgreSQL is not ready"
    exit 1
fi

# Check Next.js app
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Next.js app is not responding"
    exit 1
fi

echo "All services are healthy"
exit 0 