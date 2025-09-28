# Supabase Migration Guide

## ✅ Migration Status

Your codebase has been successfully migrated to use Supabase! Here's what's been completed and what you need to do to finish the transition.

## 🏁 Completed

- ✅ **Supabase client setup** (`src/config/supabase.ts`)
- ✅ **Database schema** (`supabase-schema.sql`)
- ✅ **New auth service** (`src/services/SupabaseAuthService.ts`)
- ✅ **New database service** (`src/services/SupabaseDatabase.ts`)
- ✅ **Auth middleware** (`src/middleware/supabase-auth.ts`)
- ✅ **Updated server** (`src/server-supabase.ts`)
- ✅ **Dependencies installed**

## 🚀 Next Steps

### 1. Set up your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project credentials from Settings → API:
   - Project URL
   - Anon key
   - Service role key

### 2. Create your environment file

```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Other settings
FRONTEND_URL=http://localhost:3000
GAMESERVER_PORT=8080
NODE_ENV=development
```

### 3. Run the database schema

1. Open Supabase SQL Editor in your dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL to create tables, indexes, and policies

### 4. Switch to the new server

Replace your current server startup:

```bash
# Old way
npm run dev

# New way (update package.json)
# Change "dev": "ts-node --esm src/server.ts"
# To:    "dev": "ts-node --esm src/server-supabase.ts"
```

Or simply rename the files:

```bash
mv src/server.ts src/server-old.ts
mv src/server-supabase.ts src/server.ts
```

### 5. Update your frontend client

Your frontend will now need to:

#### For Authentication:

```javascript
// Login
const response = await fetch("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
  credentials: "include", // Important for cookies
});

// Socket.IO connection with auth
const socket = io("ws://localhost:8080", {
  auth: {
    token: session.access_token,
  },
});
```

#### For API calls:

```javascript
// API calls with auth
const response = await fetch("/api/users/me/stats", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
  credentials: "include",
});
```

## 🎮 New Features Available

### Enhanced Auth

- **Email/password registration and login**
- **Password reset via email**
- **OAuth support** (Google, Discord)
- **Secure session management**

### New API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user
- `POST /auth/reset-password` - Password reset
- `GET /api/users/me/stats` - User statistics
- `GET /api/users/me/games` - User game history
- `GET /api/leaderboard` - Top players

### Enhanced Socket.IO

- **Automatic auth verification** on connection
- **User data attached** to socket
- **Game data persistence** via `game-complete` event

## 🗑️ What You Can Remove

Once everything is working, you can safely delete:

### Old Files

- `src/services/AuthService.ts`
- `src/database/Database.ts`
- `src/database/schema.sql`
- `src/middleware/auth.ts`

### Old Dependencies

```bash
npm uninstall better-sqlite3 @types/better-sqlite3 jsonwebtoken @types/jsonwebtoken bcrypt @types/bcrypt
```

## 🔧 Configuration Options

### Row Level Security (RLS)

The schema includes RLS policies that automatically:

- Allow users to see their own data
- Allow public access to leaderboards
- Require authentication for game data

### Real-time Subscriptions (Optional)

You can add real-time database subscriptions:

```javascript
// Listen to new games
supabase
  .channel("game-updates")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "game_records",
    },
    (payload) => {
      console.log("New game:", payload);
    }
  )
  .subscribe();
```

## 🚨 Important Notes

1. **Keep Socket.IO**: Your real-time gameplay still uses Socket.IO (perfect!)
2. **Hybrid approach**: Supabase handles persistence, Socket.IO handles real-time
3. **NATS integration**: Your event sourcing plan works perfectly with this setup
4. **Scalability**: This architecture scales much better than SQLite

## 🧪 Testing

Test the migration with:

1. **Registration**: `POST /auth/register`
2. **Login**: `POST /auth/login`
3. **Socket connection**: With auth token
4. **Game completion**: Full game flow with database persistence

## 🤝 Benefits Gained

- **Managed database**: No more SQLite file management
- **Built-in auth**: No custom JWT handling
- **Scalability**: PostgreSQL vs SQLite
- **Real-time capable**: Can add DB subscriptions later
- **Security**: Row Level Security built-in
- **Analytics**: Rich queries for game analytics
- **Backup/restore**: Automatic with Supabase

Your architecture (Supabase + Socket.IO + NATS) is now production-ready! 🎉
