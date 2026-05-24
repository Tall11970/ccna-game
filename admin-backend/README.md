# NetQuest Admin Backend

Admin dashboard backend API for the NetQuest CCNA learning platform. Provides user management, analytics, and reporting endpoints secured with JWT authentication.

## Features

- 🔐 JWT-based admin authentication
- 👥 User management (CRUD, reset progress, ban)
- 📊 Analytics and metrics aggregation
- 📝 Audit logging of all admin actions
- 🚀 Express.js with TypeScript
- 📦 Supabase integration
- 🛡️ Helmet security headers + CORS

## Prerequisites

- Node.js 18+
- Supabase project (free tier works fine)
- PostgreSQL database (included with Supabase)

## Setup

### 1. Install Dependencies

```bash
cd admin-backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required environment variables:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-key
ADMIN_EMAIL=admin@netquest.com
ADMIN_PASSWORD=change-this
```

### 3. Initialize Database

Run the migration to create analytics tables:

```bash
npm run db:init
```

This executes `/migrations/001_create_admin_tables.sql` in your Supabase database.

### 4. Create Admin User

The first admin user should be created manually via Supabase dashboard:

1. Go to your Supabase project
2. Create a new user with your admin email in the `auth.users` table
3. Add `is_admin = true` to that user's profile in the `profiles` table

### 5. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

## API Endpoints

### Authentication

**POST** `/api/admin/auth/login`
- Login with email/password
- Returns JWT token valid for 24 hours

```bash
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@netquest.com",
    "password": "your-password"
  }'
```

### User Management

**GET** `/api/admin/users` (paginated)
- List all users with filtering and search
- Query params: `page`, `limit`, `search`, `status`

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/admin/users?page=1&limit=20&search=john
```

**GET** `/api/admin/users/:userId`
- Get detailed user profile with quiz history and sessions

**PUT** `/api/admin/users/:userId`
- Update user (username, level, xp_points, exam_type, admin_notes)

**DELETE** `/api/admin/users/:userId`
- Soft delete user from the system

**POST** `/api/admin/users/:userId/reset-progress`
- Reset user's progress (level, XP, quiz attempts, lessons)

### Analytics

**GET** `/api/admin/analytics/overview`
- Get dashboard overview metrics (total users, new users, active users)

More analytics endpoints coming soon!

## Project Structure

```
admin-backend/
├── src/
│   ├── index.ts              # Main server file
│   ├── middleware/           # Auth, logging, etc.
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic
│   ├── types/               # TypeScript types
│   └── utils/               # Helper functions
├── migrations/
│   └── 001_create_admin_tables.sql  # Database schema
├── scripts/
│   ├── initDatabase.ts      # Run migrations
│   └── seedAdminUser.ts     # Create first admin (planned)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Database Schema

### New Tables Created

1. **events** - Track all user actions (lessons, quizzes, logins, etc.)
2. **user_sessions** - Track user sessions and devices
3. **quiz_attempts** - Store quiz attempt history
4. **lesson_completion** - Track completed lessons per user
5. **animation_engagement** - Track animation plays and watch time
6. **analytics_snapshots** - Daily aggregated analytics
7. **admin_audit_log** - Log all admin actions
8. **performance_metrics** - System performance tracking
9. **error_logs** - Application error tracking
10. **feature_flags** - Feature flags for A/B testing

Modified tables:
- **profiles** - Added `is_admin`, `last_admin_login`, `admin_notes` columns

## Development

### Build for Production

```bash
npm run build
```

Outputs to `/dist` directory.

### Run Production Build

```bash
npm run start
```

### Linting

```bash
npm run lint
```

### Testing (planned)

```bash
npm run test
```

## Deployment

### On Your Own Server

1. **Install Node.js**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone repo**
   ```bash
   cd /var/www
   git clone your-repo.git netquest
   cd netquest/admin-backend
   ```

3. **Install dependencies**
   ```bash
   npm install --production
   ```

4. **Setup .env**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   nano .env
   ```

5. **Initialize database**
   ```bash
   npm run db:init
   ```

6. **Build**
   ```bash
   npm run build
   ```

7. **Run with PM2 (recommended for auto-restart)**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "netquest-admin"
   pm2 save
   pm2 startup
   ```

### With Docker (optional)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t netquest-admin .
docker run -p 3001:3001 --env-file .env netquest-admin
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name admin-api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Security

- ✅ JWT authentication on all admin routes
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Input validation with Zod (planned)
- ✅ Rate limiting (planned)
- ✅ Audit logging of all admin actions
- ⚠️ Change `JWT_SECRET` in production!
- ⚠️ Use HTTPS in production

## Monitoring

### Logs

Backend logs to console in development. For production, consider:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for APM

### Health Check

```bash
curl http://localhost:3001/health
```

## Roadmap

- [ ] Complete analytics endpoints
- [ ] Report generation (PDF, CSV)
- [ ] Input validation with Zod
- [ ] Rate limiting
- [ ] Scheduled analytics aggregation
- [ ] WebSocket support for real-time dashboards
- [ ] Admin account management
- [ ] Role-based access control (RBAC)
- [ ] 2FA for admin accounts
- [ ] Comprehensive test suite

## Troubleshooting

### "Missing Supabase credentials"

Make sure `.env` file exists and has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### Database migration fails

Verify you're using the `SERVICE_ROLE_KEY` (not ANON_KEY) for migrations.

### Login returns "User is not an admin"

Ensure the user in `profiles` table has `is_admin = true`.

### CORS errors from frontend

Add your frontend URL to `CORS_ORIGIN` in `.env`:
```
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://yourdomain.com
```

## Contributing

- Create feature branches from `main`
- Keep TypeScript strict mode enabled
- Write tests for new features
- Update this README when adding new endpoints

## License

MIT

## Support

For issues, please open a GitHub issue with:
- Description of the problem
- Steps to reproduce
- Error messages/logs
- Environment details (Node version, OS, etc.)
