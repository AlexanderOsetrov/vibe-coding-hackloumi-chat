# Development Guide

This guide explains how to set up and manage the local development environment for Hackloumi Chat.

## Prerequisites

- **Node.js** (v18 or later)
- **Docker** (Docker Desktop or Rancher Desktop)
- **Git**

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   ./scripts/db.sh setup
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Management

We use a PostgreSQL database running in a Docker container. The `scripts/db.sh` script provides easy management of the local database.

### Database Script Commands

| Command | Description |
|---------|-------------|
| `./scripts/db.sh setup` | **First-time setup**: Creates PostgreSQL container, runs migrations |
| `./scripts/db.sh start` | Start existing database container |
| `./scripts/db.sh stop` | Stop database container |
| `./scripts/db.sh status` | Show database status and connection info |
| `./scripts/db.sh connect` | Open psql session to database |
| `./scripts/db.sh reset` | ⚠️ **Reset database** (deletes all data) |
| `./scripts/db.sh help` | Show all available commands |

### Common Database Workflows

**First time setup:**
```bash
./scripts/db.sh setup
```

**Daily development:**
```bash
# Check if database is running
./scripts/db.sh status

# Start database if stopped
./scripts/db.sh start

# Start your app
npm run dev
```

**Debugging database issues:**
```bash
# Connect to database directly
./scripts/db.sh connect

# Check database status
./scripts/db.sh status

# Reset database if corrupted
./scripts/db.sh reset
```

**When done for the day:**
```bash
# Stop database to save resources
./scripts/db.sh stop
```

## Environment Variables

The application uses these environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `NEXTAUTH_URL` - Base URL for authentication (development: `http://localhost:3000`)

These are automatically configured in `.env` when you run the database setup script.

## Database Schema

The application uses Prisma ORM with the following models:

- **User**: Stores user accounts (id, username, password hash, timestamps)
- **Message**: Stores chat messages (id, content, sender, receiver, timestamps)

### Database Operations

**Generate Prisma client:**
```bash
npx prisma generate
```

**Push schema changes:**
```bash
npx prisma db push
```

**View database in Prisma Studio:**
```bash
npx prisma studio
```

## Development Server

**Start development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Run tests:**
```bash
npm test
```

**Lint code:**
```bash
npm run lint
```

## Application Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── api/            # API routes
│   ├── chat/           # Chat pages
│   ├── login/          # Login page
│   └── register/       # Registration page
├── components/         # React components
├── lib/               # Utility libraries
│   ├── auth.ts        # Authentication utilities
│   └── prisma.ts      # Prisma client
└── generated/         # Generated Prisma client
```

## Troubleshooting

### Database Connection Issues

1. **Check if Docker is running:**
   ```bash
   docker ps
   ```

2. **Check database status:**
   ```bash
   ./scripts/db.sh status
   ```

3. **Restart database:**
   ```bash
   ./scripts/db.sh stop
   ./scripts/db.sh start
   ```

4. **Reset database if corrupted:**
   ```bash
   ./scripts/db.sh reset
   ```

### Next.js Issues

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Environment Variable Issues

1. **Check environment file:**
   ```bash
   cat .env
   ```

2. **Restart development server** after changing environment variables

### Docker Context Issues (Rancher Desktop)

If you're using Rancher Desktop and get Docker connection errors:

```bash
# Switch to rancher-desktop context
docker context use rancher-desktop

# Verify it's working
docker ps
```

## Tips for Development

1. **Use the database script** - It handles Docker context switching and error checking automatically
2. **Check database status first** - Run `./scripts/db.sh status` before starting development
3. **Restart dev server** after environment changes
4. **Use Prisma Studio** for database inspection: `npx prisma studio`
5. **Keep Docker running** - The database container needs Docker to be active

## Production Deployment

For production deployment, you'll need:

1. **PostgreSQL database** (not Docker container)
2. **Environment variables** configured on your hosting platform
3. **Build the application**: `npm run build`
4. **Run migrations**: `npx prisma db push` or `npx prisma migrate deploy`

See the main README.md for deployment-specific instructions. 