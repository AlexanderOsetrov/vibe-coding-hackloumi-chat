# Development Guide

This comprehensive guide explains how to set up, develop, and manage the Hackloumi Chat application.

## Prerequisites

- **Node.js** (v18 or later)
- **Docker** (Docker Desktop or Rancher Desktop)
- **Git**

## Quick Start

1. **Install dependencies:**

   ```bash
   make install
   ```

2. **Set up the database:**

   ```bash
   make db-setup
   ```

3. **Start the development server:**

   ```bash
   make dev
   ```

   > 💡 **Smart Database Verification**: The `make dev` command automatically verifies your database is running and ready. If the database container exists but is stopped, it will be started automatically. If no database is found, you'll get helpful setup instructions.

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Available Commands

Use `make help` to see all available commands organized by category:

```bash
make help
```

### 📦 Development Commands

- `make dev` - Start development environment (with automatic database verification)
- `make install` - Install dependencies
- `make test` - Run tests
- `make test-watch` - Run tests in watch mode

### 🗄️ Database Management

- `make db-setup` - Create and start PostgreSQL container for development
- `make db-start` - Start existing database container
- `make db-stop` - Stop database container
- `make db-restart` - Restart database container
- `make db-status` - Show database status
- `make db-connect` - Connect to database using psql
- `make db-reset` - Reset database (DESTRUCTIVE)

### 🐳 Docker Deployment

- `make deploy` - Build and deploy using docker-compose
- `make build` - Build Docker image
- `make start/stop/restart` - Manage containers
- `make logs` - Show application logs
- `make status` - Check deployment health

### 🛠️ Utilities

- `make verify-db` - Manually verify database status
- `make clean` - Clean up development artifacts
- `make shell` - Get shell inside running container
- `make db-studio` - Open Prisma Studio

## Database Setup

### Option 1: Using Make Commands (Recommended)

The easiest way to set up the database is using the integrated Makefile:

```bash
make db-setup
```

This will:

- Create a PostgreSQL Docker container
- Set up the database with proper configuration
- Generate Prisma client
- Run database migrations
- Create the necessary environment variables

### Option 2: Legacy Database Script

⚠️ **DEPRECATED**: The database script `./scripts/db.sh` is deprecated in favor of the Makefile approach:

| Legacy Command            | New Command       |
| ------------------------- | ----------------- |
| `./scripts/db.sh setup`   | `make db-setup`   |
| `./scripts/db.sh start`   | `make db-start`   |
| `./scripts/db.sh stop`    | `make db-stop`    |
| `./scripts/db.sh status`  | `make db-status`  |
| `./scripts/db.sh connect` | `make db-connect` |
| `./scripts/db.sh reset`   | `make db-reset`   |

### Option 3: Manual PostgreSQL Setup

If you prefer to use an existing PostgreSQL installation:

1. **Install PostgreSQL** on your system
2. **Create a database:**

   ```sql
   CREATE DATABASE hackloumi_chat;
   ```

3. **Create environment variables** by creating a `.env` file in the project root:

   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/hackloumi_chat?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   ```

4. **Generate Prisma client:**

   ```bash
   npx prisma generate
   ```

5. **Run database migrations:**
   ```bash
   npx prisma db push
   ```

## Database Management

We use a PostgreSQL database running in a Docker container. The Makefile provides comprehensive database management commands with improved organization and colored output.

### Common Database Workflows

**First time setup:**

```bash
make db-setup
```

**Daily development:**

```bash
# Check if database is running
make db-status

# Start database if stopped
make db-start

# Start your app
make dev
```

**Debugging database issues:**

```bash
# Connect to database directly
make db-connect

# Check database status
make db-status

# Reset database if corrupted
make db-reset
```

**When done for the day:**

```bash
# Stop database to save resources
make db-stop
```

## Deployment Options

### Local Development (Single Services)

For day-to-day development, use standalone database:

```bash
make db-setup    # Setup standalone PostgreSQL
make dev         # Start Next.js dev server
```

### Full Deployment (All-in-One)

For testing production-like environment:

```bash
make deploy      # Build and deploy everything via docker-compose
make status      # Check health
make logs        # Monitor logs
make destroy     # Clean up when done
```

## Environment Variables

The application uses these environment variables (automatically configured when using database commands):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing

## Database Schema

The application uses Prisma ORM with the following models:

### Users Table

- `id` (String, Primary Key, CUID)
- `username` (String, Unique)
- `password` (String, Argon2 hashed)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Messages Table

- `id` (String, Primary Key, CUID)
- `content` (String)
- `senderId` (String, Foreign Key)
- `receiverId` (String, Foreign Key)
- `createdAt` (DateTime)
- Optimized indexes for chat queries

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
make db-studio
```

## Development Server

**Start development server:**

```bash
make dev
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
│   │   ├── auth/       # Authentication endpoints
│   │   └── messages/   # Message handling endpoints
│   ├── chat/           # Chat pages
│   │   └── [user]/     # Dynamic chat routes
│   ├── login/          # Login page
│   └── register/       # Registration page
├── components/         # React components (future use)
├── lib/               # Utility libraries
│   ├── auth.ts        # Authentication utilities
│   └── db.ts          # Prisma client
├── generated/         # Generated Prisma client
└── test/              # Test files
```

## M1 Features Implemented

✅ **User registration form** (username + password ×2)  
✅ **Password hashed with Argon2**, stored in PostgreSQL  
✅ **JWT auth cookie** issued on login  
✅ **`/chat/[user]` page** with textarea & send button  
✅ **POST `/api/messages`** persists message  
✅ **GET `/api/messages?peer=`** polls for new messages (simple polling implementation)

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/messages` - Send a message
- `GET /api/messages?peer=username` - Get messages with a user

## Security Features

- **Passwords hashed with Argon2** - Industry-standard password security
- **JWT tokens with 24-hour expiration** - Secure session management
- **HTTP-only cookies** for token storage - Prevents XSS attacks
- **Input validation and sanitization** - Server-side data validation
- **SQL injection protection** via Prisma ORM

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with Argon2 password hashing
- **Testing**: Vitest 2, Testing Library React 16
- **Code Quality**: ESLint, Prettier, Husky

## Usage

1. Open http://localhost:3000
2. Click "Create Account" to register a new user
3. After registration, you'll be redirected to the chat page
4. Enter a username to start a chat with that user
5. The chat URL will be `/chat/[username]`

## Troubleshooting

### Database Connection Issues

The `make dev` command includes automatic database verification, but if you encounter issues:

1. **Check if Docker is running:**

   ```bash
   docker ps
   ```

2. **Check database status:**

   ```bash
   make db-status
   ```

3. **Restart database:**

   ```bash
   make db-restart
   ```

   Or manually:

   ```bash
   make db-stop
   make db-start
   ```

4. **Reset database if corrupted:**

   ```bash
   make db-reset
   ```

5. **Manual database verification:**
   ```bash
   make verify-db
   ```

### Development Server Issues

1. **Database not running**: The `make dev` command will automatically detect and help resolve database issues

2. **Clear Next.js cache:**

   ```bash
   rm -rf .next
   make dev
   ```

3. **Reinstall dependencies:**
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
2. **Check database status first** - Run `make db-status` before starting development
3. **Restart dev server** after environment changes
4. **Use Prisma Studio** for database inspection: `make db-studio`
5. **Keep Docker running** - The database container needs Docker to be active

## Known Limitations (M1)

- Simple polling instead of true long-polling
- No contact management yet
- No group chats
- No file uploads
- No search functionality
- Basic UI without advanced features

These will be addressed in future milestones (M2-M10).

## Production Deployment

For production deployment, you'll need:

1. **PostgreSQL database** (not Docker container)
2. **Environment variables** configured on your hosting platform
3. **Build the application**: `npm run build`
4. **Run migrations**: `npx prisma db push` or `npx prisma migrate deploy`

See the main README.md for deployment-specific instructions.
