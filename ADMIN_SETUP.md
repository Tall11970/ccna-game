# NetQuest Admin Dashboard Setup Guide

Complete guide for setting up the admin backend and frontend dashboard for the NetQuest CCNA learning platform.

## Overview

The admin system consists of two parts:
1. **Backend** (`/admin-backend`): Express.js + TypeScript REST API
2. **Frontend** (`/admin-frontend`): React + TypeScript Dashboard UI

Both are designed for self-hosted deployment on your existing Linux/Apache infrastructure.

## Prerequisites

- Node.js 18+ installed
- Supabase project created (free tier sufficient)
- Database migrations applied
- Git configured

## Architecture

```
┌─────────────────────────────────────────────┐
│          Admin Dashboard (Frontend)          │
│  React 18 + TypeScript + Vite               │
│  Port: 3000                                  │
└──────────────────┬──────────────────────────┘
                   │ HTTP Requests
                   ▼
┌─────────────────────────────────────────────┐
│        Admin Backend API (Express.js)        │
│  TypeScript + Supabase                      │
│  Port: 3001                                  │
└──────────────────┬──────────────────────────┘
                   │ Database Queries
                   ▼
┌─────────────────────────────────────────────┐
│     Supabase PostgreSQL Database             │
│  (profiles, users, analytics tables)         │
└─────────────────────────────────────────────┘
```

## Phase 1: Backend Setup

### 1.1 Install Backend Dependencies

```bash
cd admin-backend
npm install
```

### 1.2 Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
PORT=3001
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_KEY=your-anon-key

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

CORS_ORIGIN=http://localhost:3000,http://localhost:5173

ADMIN_EMAIL=admin@netquest.com
ADMIN_PASSWORD=your-initial-password
```

### 1.3 Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your NetQuest project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this private!)

### 1.4 Initialize Database

Apply migrations to create admin tables:

```bash
npm run db:init
```

This creates 10 new tables:
- events (user action tracking)
- user_sessions (session history)
- quiz_attempts (quiz history)
- lesson_completion (lesson progress)
- animation_engagement (animation tracking)
- analytics_snapshots (daily aggregates)
- admin_audit_log (admin action audit trail)
- performance_metrics (system metrics)
- error_logs (error tracking)
- feature_flags (A/B testing)

And adds columns to profiles table:
- is_admin (boolean)
- last_admin_login (timestamp)
- admin_notes (text)

### 1.5 Create Admin User

You need to create the first admin manually via Supabase dashboard:

1. Go to Supabase dashboard → **Authentication** → **Users**
2. Click **Create user** → Enter your admin email/password
3. Go to **Database** → **profiles** table
4. Find the row with your email
5. Set:
   - `is_admin = true`
   - `last_admin_login = NOW()`

### 1.6 Test Backend

```bash
npm run dev
```

Test the API:

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@netquest.com",
    "password": "your-password"
  }'
```

You should get a response with `token` and `user` fields.

## Phase 2: Frontend Setup

### 2.1 Install Frontend Dependencies

```bash
cd admin-frontend
npm install
```

### 2.2 Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```
REACT_APP_API_URL=http://localhost:3001/api
```

### 2.3 Start Frontend Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the login page.

### 2.4 Test Login

Login with your admin credentials created in Phase 1:
- Email: admin@netquest.com
- Password: (your chosen password)

You should see:
1. Dashboard with analytics overview
2. Sidebar navigation (Dashboard, Users)
3. Ability to view and manage users

## Phase 3: Production Deployment

### 3.1 Build Frontend

```bash
cd admin-frontend
npm run build
```

This creates an optimized `dist/` folder ready for deployment.

### 3.2 Deploy Backend

#### Option A: PM2 (Recommended)

```bash
cd admin-backend
npm install -g pm2
npm run build
pm2 start dist/index.js --name "netquest-admin"
pm2 save
pm2 startup
```

#### Option B: SystemD Service

Create `/etc/systemd/system/netquest-admin.service`:

```ini
[Unit]
Description=NetQuest Admin Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/netquest/admin-backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable netquest-admin
sudo systemctl start netquest-admin
sudo systemctl status netquest-admin
```

#### Option C: Docker

```bash
cd admin-backend
docker build -t netquest-admin .
docker run -d \
  --name netquest-admin \
  -p 3001:3001 \
  --env-file .env \
  -v /var/log/netquest:/app/logs \
  netquest-admin
```

### 3.3 Deploy Frontend

#### Option A: Serve with Node.js

```bash
cd admin-frontend
npm run build
npm install -g serve
serve -s dist -l 3000
```

#### Option B: Nginx (Recommended)

Create `/etc/nginx/sites-available/admin-dashboard`:

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    root /var/www/admin-dashboard/dist;
    index index.html;

    # SPA routing - always serve index.html
    location / {
        try_files $uri /index.html;
    }

    # API proxy to backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/admin-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Option C: Apache with .htaccess

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Add to VirtualHost:

```apache
<VirtualHost *:80>
    ServerName admin.yourdomain.com
    DocumentRoot /var/www/admin-dashboard/dist

    <Directory /var/www/admin-dashboard/dist>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api
</VirtualHost>
```

### 3.4 SSL/TLS (HTTPS)

#### Using Let's Encrypt with Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d admin.yourdomain.com
```

Certbot automatically updates Nginx config for HTTPS.

### 3.5 Update Environment Variables

Backend `.env`:

```
NODE_ENV=production
CORS_ORIGIN=https://admin.yourdomain.com
JWT_SECRET=your-super-secret-long-random-string
```

Frontend `.env`:

```
REACT_APP_API_URL=https://admin.yourdomain.com/api
```

Rebuild and redeploy:

```bash
cd admin-frontend
npm run build
# Upload dist/ to server
```

## Features Walkthrough

### Dashboard

**Analytics Overview:**
- Total users registered
- New users this month
- Active users (last 7 days)
- Engagement rate
- Latest analytics snapshot

**Quick Actions:**
- Link to manage users
- Link to advanced analytics (coming soon)

### User Management

**Search & Filter:**
- Search by email or username
- Filter by role (all users, admins, regular users)
- Pagination (20 users per page)

**User Actions:**
- 👁️ View details
- 🔄 Reset progress (reset level to 1, XP to 0)
- 🗑️ Delete user

### User Details

**User Profile:**
- Email, username, level, XP points
- Exam type, admin status
- Timestamps (joined, last updated, last admin login)
- Admin notes (for internal tracking)

**Inline Editing:**
- Edit username, level, XP, exam type, admin notes
- Save changes with single click

**Statistics:**
- Lessons completed
- Quizzes taken
- Average quiz score

**Quiz History:**
- Topic, score, correct/total, time spent
- Most recent 10 attempts

**Session History:**
- Device type, browser, start date, duration
- Most recent 10 sessions

## API Reference

### Authentication

```
POST /api/admin/auth/login
Content-Type: application/json

{
  "email": "admin@netquest.com",
  "password": "password"
}

Response:
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@netquest.com",
    "name": "admin@netquest.com"
  }
}
```

All subsequent requests require:

```
Authorization: Bearer {token}
```

### Endpoints

**GET /api/admin/users?page=1&limit=20&search=&status=active**

```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

**GET /api/admin/users/:userId**

```json
{
  "user": {...},
  "quizzes": [...],
  "sessions": [...],
  "completions": [...],
  "stats": {...}
}
```

**PUT /api/admin/users/:userId**

```json
{
  "username": "newusername",
  "level": 10,
  "xp_points": 5000,
  "exam_type": "CCNA",
  "admin_notes": "..."
}
```

**DELETE /api/admin/users/:userId**

Soft delete (removes from auth system).

**POST /api/admin/users/:userId/reset-progress**

Resets level to 1, XP to 0, deletes quiz attempts and completions.

**GET /api/admin/analytics/overview**

```json
{
  "totalUsers": 100,
  "newUsersThisMonth": 15,
  "activeUsersLast7Days": 42,
  "latestSnapshot": {...}
}
```

## Monitoring & Logs

### Backend Logs

**Development:**
```bash
npm run dev
# Logs output to console
```

**Production (PM2):**
```bash
pm2 logs netquest-admin
pm2 save logs netquest-admin > /var/log/netquest-admin.log
```

**Production (Docker):**
```bash
docker logs -f netquest-admin
docker logs netquest-admin > /var/log/netquest-admin.log
```

### Frontend Logs

Browser console (F12 → Console tab):
- API request logs
- Authentication events
- Component lifecycle logs

### Error Tracking

Errors are logged to Supabase `error_logs` table:

```sql
SELECT 
  error_type, 
  error_message, 
  occurred_at 
FROM error_logs
WHERE resolved = false
ORDER BY occurred_at DESC
LIMIT 20;
```

## Troubleshooting

### "Cannot connect to backend" on frontend

1. Check backend is running: `curl http://localhost:3001/health`
2. Check CORS origin in backend `.env` includes frontend URL
3. Check firewall allows port 3001
4. Frontend `.env` has correct API URL

### "Invalid token" / "Unauthorized"

1. Token expired (24h TTL) - user must log in again
2. Token not being sent - check `Authorization` header
3. Backend JWT_SECRET changed - all tokens invalid

### Database migration fails

1. Check `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key)
2. Check database has sufficient permissions
3. Run manually via Supabase dashboard → SQL Editor

### Nginx/Apache proxy errors

1. Check backend is running on port 3001
2. Check firewall allows localhost:3001
3. Check ProxyPass rules match API path
4. Reload web server after config changes

## Security Checklist

- ✅ JWT_SECRET is strong random string (min 32 characters)
- ✅ SUPABASE_SERVICE_ROLE_KEY not exposed in .env
- ✅ HTTPS enabled (SSL/TLS certificate installed)
- ✅ CORS_ORIGIN restricted to your domain
- ✅ Database backups configured (Supabase handles automatically)
- ✅ Admin password changed from default
- ✅ Firewall restricts admin dashboard to trusted IPs (optional)

## Next Steps

### Short Term
- [ ] Test full admin workflow (login, manage users, view analytics)
- [ ] Set up SSL/TLS certificate
- [ ] Deploy to production
- [ ] Configure monitoring and log aggregation

### Medium Term
- [ ] Implement role-based access control (RBAC)
- [ ] Add 2FA for admin accounts
- [ ] Build advanced analytics with charts
- [ ] Add scheduled reports and exports
- [ ] Implement real-time updates with WebSocket

### Long Term
- [ ] Mobile app management (iOS, Android)
- [ ] Advanced user segmentation
- [ ] Custom dashboard widgets
- [ ] API integrations (Slack, email notifications)
- [ ] Admin account management UI

## Support & Documentation

- Backend API docs: See `/admin-backend/README.md`
- Frontend component docs: See `/admin-frontend/README.md`
- Supabase docs: https://supabase.com/docs
- React docs: https://react.dev

## License

MIT - See individual LICENSE files in backend and frontend directories
