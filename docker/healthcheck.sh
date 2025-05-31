#!/bin/bash
set -e

# Health check for Hackloumi Chat application

# Check if PostgreSQL is responding
pg_isready -h localhost -p 5432 -U hackloumi -d hackloumi > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "PostgreSQL health check failed"
    exit 1
fi

# Check if Next.js application is responding
curl -f http://localhost:3000/api/health > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Next.js application health check failed"
    exit 1
fi

echo "Health check passed"
exit 0 