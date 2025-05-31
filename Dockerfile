# Multi-stage Dockerfile for Hackloumi Chat
# Stage 1: Build the Next.js application 
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies including dev deps (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client for the current platform
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Runtime with Node.js and PostgreSQL
FROM node:18-slim AS runtime

# Install system dependencies and PostgreSQL 16
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    supervisor \
    curl \
    gnupg \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg \
    && echo "deb http://apt.postgresql.org/pub/repos/apt/ bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y \
    postgresql-16 \
    postgresql-client-16 \
    postgresql-contrib-16 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Create postgres user and data directory
RUN useradd -m postgres || true
RUN mkdir -p /var/lib/postgresql/data /var/log/postgresql
RUN chown -R postgres:postgres /var/lib/postgresql /var/log/postgresql

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/src/generated ./src/generated/
COPY --from=builder /app/node_modules ./node_modules/

# Copy remaining necessary files
COPY next.config.ts ./
COPY tsconfig.json ./
COPY src ./src/

# Create supervisord configuration
RUN mkdir -p /etc/supervisor/conf.d
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create PostgreSQL initialization script
COPY docker/init-db.sh /docker-entrypoint-initdb.d/init-db.sh
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh

# Create startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

# Health check script
COPY docker/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

# Expose ports
EXPOSE 3000 5432

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /healthcheck.sh

# Use supervisord to manage both services
CMD ["/start.sh"] 