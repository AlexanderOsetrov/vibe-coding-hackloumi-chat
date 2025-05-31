#!/bin/bash
set -e

echo "Starting Hackloumi Chat application..."

# Initialize database if needed
/docker-entrypoint-initdb.d/init-db.sh

# Ensure log directories exist
mkdir -p /var/log/supervisor /var/log/postgresql

# Ensure proper ownership of PostgreSQL directories
chown -R postgres:postgres /var/lib/postgresql /var/log/postgresql

# Start PostgreSQL first to ensure it's ready
echo "Starting PostgreSQL..."
su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -l /var/log/postgresql/postgresql.log start"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if su - postgres -c "pg_isready -d hackloumi"; then
        echo "PostgreSQL is ready!"
        break
    fi
    echo "Waiting for PostgreSQL... (attempt $i/30)"
    sleep 2
done

# Run database migrations
echo "Running database migrations..."
cd /app
npx prisma db push --accept-data-loss || true

# Stop PostgreSQL so supervisord can manage it
echo "Stopping PostgreSQL for supervisord to manage..."
su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data stop"

echo "Starting services with supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf 