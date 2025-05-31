# Development Guide

This comprehensive guide explains how to set up, develop, and manage the Hackloumi Chat application.

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

## Database Setup

### Option 1: Using the Database Script (Recommended)

The easiest way to set up the database is using our automated script:

```bash
./scripts/db.sh setup
```

This will:

- Create a PostgreSQL Docker container
- Set up the database with proper configuration
- Generate Prisma client
- Run database migrations
- Create the necessary environment variables

### Option 2: Manual PostgreSQL Setup

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

### Option 3: Docker PostgreSQL (Manual)

Run PostgreSQL in Docker manually:

```bash
docker run --name hackloumi-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=hackloumi_chat \
  -p 5432:5432 \
  -d postgres:16
```

## Database Management

We use a PostgreSQL database running in a Docker container. The `scripts/db.sh` script provides easy management of the local database.

### Database Script Commands

| Command                   | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `./scripts/db.sh setup`   | **First-time setup**: Creates PostgreSQL container, runs migrations |
| `./scripts/db.sh start`   | Start existing database container                                   |
| `./scripts/db.sh stop`    | Stop database container                                             |
| `./scripts/db.sh status`  | Show database status and connection info                            |
| `./scripts/db.sh connect` | Open psql session to database                                       |
| `./scripts/db.sh reset`   | ⚠️ **Reset database** (deletes all data)                            |
| `./scripts/db.sh help`    | Show all available commands                                         |

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

The application uses these environment variables (automatically configured when using the database script):

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

## M2 Features Implemented

✅ **Contact management system** with invitation workflow  
✅ **Invite by username** functionality  
✅ **Accept / reject invitation** workflow  
✅ **Contacts shown in sidebar** sorted alphabetically  

## M3 Features Implemented  

✅ **Prisma migration adds `fts` column** (PostgreSQL _tsvector_)  
✅ **GET `/api/search?q=`** returns ranked matches from both direct and group messages  
✅ **Search bar with instant results** and navigation to both direct/group chats  
✅ **Group message search** with proper member verification  

## M4 Features Implemented

✅ **WebSocket realtime messaging** with Socket.IO  
✅ **In‑memory queue** delivers messages to connected peers  
✅ **Delivery ACK** updates message status to _delivered_  
✅ **Fallback to polling** when WebSocket unsupported  
✅ **Real-time typing indicators** for both direct and group chats  
✅ **Online/offline status tracking** for contacts  

## M5 Features Implemented

✅ **Groups table** (`id`, `name`, `owner_id`)  
✅ **Group creation, management, and deletion** endpoints  
✅ **Add / remove participants** with owner approval  
✅ **Broadcast fan‑out** to all members over WebSocket  
✅ **Group chat UI** with member management  
✅ **Real-time group messaging** with proper room handling  

## M6 Features Implemented

✅ **Local file upload** with `/api/upload` endpoint for image storage  
✅ **Markdown parsing** for **bold** / _italic_ / `code` in both direct and group messages  
✅ **LazyImage component** with lazy‑loading and loading states for message images  
✅ **Image support** in both direct messages and group chats with real-time delivery  
✅ **Image upload UI** with preview and metadata display  
✅ **Mixed content support** (text + images in same message)  

## Additional Features Implemented

✅ **Comprehensive error handling** and user feedback  
✅ **TypeScript coverage** throughout the application  
✅ **Test suite** with Vitest and Testing Library  
✅ **Responsive design** with mobile-first approach  
✅ **Modern UI/UX** with sophisticated black and white design system  
✅ **Git repository management** with proper .gitignore for uploads  
✅ **Development tooling** with ESLint, Prettier, and Husky  

## Known Limitations

- No S3 integration yet (using local file storage)
- No deep links implementation (M7)
- No reactions or profiles (M8)
- No performance harness (M9)  
- No production deployment setup (M10)

These will be addressed in future milestones (M7-M10).

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
