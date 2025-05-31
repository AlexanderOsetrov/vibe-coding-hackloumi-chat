#!/bin/bash
set -e

echo "Starting Hackloumi Chat application..."

# Database configuration from environment variables with defaults
DB_NAME="${POSTGRES_DB:-hackloumi}"
DB_USER="${POSTGRES_USER:-hackloumi}"

echo "Using database configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Initialize database if needed
/docker-entrypoint-initdb.d/init-db.sh

# Ensure log directories exist
mkdir -p /var/log/supervisor /var/log/postgresql

# Ensure uploads directory exists with proper permissions
mkdir -p /app/public/uploads
chmod 755 /app/public/uploads

# Ensure proper ownership of PostgreSQL directories
chown -R postgres:postgres /var/lib/postgresql /var/log/postgresql

# Start PostgreSQL first to ensure it's ready
echo "Starting PostgreSQL..."
su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -l /var/log/postgresql/postgresql.log start"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if su - postgres -c "pg_isready -d $DB_NAME"; then
        echo "PostgreSQL is ready!"
        break
    fi
    echo "Waiting for PostgreSQL... (attempt $i/30)"
    sleep 2
done

# Run database migrations
echo "Running database migrations..."
cd /app
npx prisma generate
npx prisma db push --accept-data-loss || true

# Stop PostgreSQL so supervisord can manage it
echo "Stopping PostgreSQL for supervisord to manage..."
su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data stop"

echo "Starting services with supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf 