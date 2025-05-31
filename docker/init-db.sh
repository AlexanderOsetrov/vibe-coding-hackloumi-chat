#!/bin/bash
set -e

# Database configuration from environment variables with defaults
DB_NAME="${POSTGRES_DB:-hackloumi}"
DB_USER="${POSTGRES_USER:-hackloumi}"
DB_PASSWORD="${POSTGRES_PASSWORD:-hackloumi}"

echo "Initializing PostgreSQL with configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: [HIDDEN]"

# Initialize PostgreSQL data directory if it doesn't exist
if [ ! -d "/var/lib/postgresql/data/base" ]; then
    echo "Initializing PostgreSQL database..."
    su - postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/data"
    
    # Start PostgreSQL temporarily to set up database
    su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -o \"-c listen_addresses='localhost'\" -w start"
    
    # Create database and user
    su - postgres -c "createdb $DB_NAME"
    su - postgres -c "psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\""
    su - postgres -c "psql -c \"ALTER USER $DB_USER CREATEDB;\""
    
    # Grant schema permissions
    su - postgres -c "psql -d $DB_NAME -c \"GRANT ALL ON SCHEMA public TO $DB_USER;\""
    su - postgres -c "psql -d $DB_NAME -c \"GRANT CREATE ON SCHEMA public TO $DB_USER;\""
    su - postgres -c "psql -d $DB_NAME -c \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;\""
    su - postgres -c "psql -d $DB_NAME -c \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;\""
    
    # Stop PostgreSQL
    su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -m fast -w stop"
    
    echo "PostgreSQL initialization completed."
fi 