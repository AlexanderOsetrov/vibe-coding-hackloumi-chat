#!/bin/bash
set -e

# Initialize PostgreSQL data directory if it doesn't exist
if [ ! -d "/var/lib/postgresql/data/base" ]; then
    echo "Initializing PostgreSQL database..."
    su - postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/data"
    
    # Start PostgreSQL temporarily to set up database
    su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -o \"-c listen_addresses='localhost'\" -w start"
    
    # Create database and user
    su - postgres -c "createdb hackloumi"
    su - postgres -c "psql -c \"CREATE USER hackloumi WITH PASSWORD 'hackloumi';\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE hackloumi TO hackloumi;\""
    su - postgres -c "psql -c \"ALTER USER hackloumi CREATEDB;\""
    
    # Grant schema permissions
    su - postgres -c "psql -d hackloumi -c \"GRANT ALL ON SCHEMA public TO hackloumi;\""
    su - postgres -c "psql -d hackloumi -c \"GRANT CREATE ON SCHEMA public TO hackloumi;\""
    su - postgres -c "psql -d hackloumi -c \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hackloumi;\""
    su - postgres -c "psql -d hackloumi -c \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hackloumi;\""
    
    # Stop PostgreSQL
    su - postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/data -m fast -w stop"
    
    echo "PostgreSQL initialization completed."
fi 