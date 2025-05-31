# M1 Setup Guide - Bare Minimum Chat

This guide will help you set up and run the M1 implementation of Hacklumi Chat.

## Prerequisites

- Node.js ≥ 18
- PostgreSQL database
- npm or yarn

## Database Setup

### Option 1: Local PostgreSQL

1. Install PostgreSQL on your system
2. Create a database:
```sql
CREATE DATABASE hackloumi_chat;
```

3. Create a `.env.local` file in the project root:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/hackloumi_chat?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### Option 2: Docker PostgreSQL

Run PostgreSQL in Docker:
```bash
docker run --name hackloumi-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=hackloumi_chat \
  -p 5432:5432 \
  -d postgres:16
```

## Installation & Setup

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Run database migrations:
```bash
npx prisma db push
```

4. Start the development server:
```bash
npm run dev
```

## Usage

1. Open http://localhost:3000
2. Click "Create Account" to register a new user
3. After registration, you'll be redirected to the chat page
4. Enter a username to start a chat with that user
5. The chat URL will be `/chat/[username]`

## M1 Features Implemented

✅ **User registration form** (username + password ×2)
✅ **Password hashed with Argon2**, stored in PostgreSQL
✅ **JWT auth cookie** issued on login
✅ **`/chat/[user]` page** with textarea & send button
✅ **POST `/api/messages`** persists message
✅ **GET `/api/messages?peer=`** polls for new messages (simple polling, not true long-polling yet)

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/messages` - Send a message
- `GET /api/messages?peer=username` - Get messages with a user

## Database Schema

### Users Table
- `id` (String, Primary Key)
- `username` (String, Unique)
- `password` (String, Argon2 hashed)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Messages Table
- `id` (String, Primary Key)
- `content` (String)
- `senderId` (String, Foreign Key)
- `receiverId` (String, Foreign Key)
- `createdAt` (DateTime)

## Security Features

- Passwords hashed with Argon2
- JWT tokens with 24-hour expiration
- HTTP-only cookies for token storage
- Input validation and sanitization
- SQL injection protection via Prisma

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with Argon2 password hashing
- **Testing**: Vitest 2, Testing Library React 16
- **Code Quality**: ESLint, Prettier, Husky

## Known Limitations (M1)

- Simple polling instead of true long-polling
- No contact management yet
- No group chats
- No file uploads
- No search functionality
- Basic UI without advanced features

These will be addressed in future milestones (M2-M10). 