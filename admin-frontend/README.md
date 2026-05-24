# NetQuest Admin Frontend

Admin dashboard for the NetQuest CCNA learning platform. Built with React, TypeScript, and Vite for fast development and optimal performance.

## Features

- 🔐 JWT-based admin authentication
- 👥 User management dashboard (view, edit, delete, reset progress)
- 📊 Analytics overview (total users, active users, engagement metrics)
- 🔍 Advanced search and filtering
- 📱 Fully responsive design
- 🎨 Dark theme with cyan/green accent colors
- ⚡ Fast development with Vite
- 📦 Built with TypeScript for type safety

## Prerequisites

- Node.js 18+
- npm or yarn
- Admin Backend running (see `/admin-backend` directory)

## Setup

### 1. Install Dependencies

```bash
cd admin-frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update if needed:

```bash
cp .env.example .env
```

**Environment variables:**
```
REACT_APP_API_URL=http://localhost:3001/api
```

> **Note:** For production, update the API URL to match your backend deployment.

### 3. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3000` with HMR (Hot Module Replacement) enabled.

## Available Scripts

### Development

```bash
npm run dev
```

Starts the Vite development server with fast HMR. Open [http://localhost:3000](http://localhost:3000) to view in the browser.

### Build

```bash
npm run build
```

Builds the app for production to the `dist/` folder.

### Preview

```bash
npm run preview
```

Locally preview the production build.

### Linting

```bash
npm run lint
```

Run ESLint to check code quality.

### Type Checking

```bash
npm run type-check
```

Check TypeScript types without emitting files.

## Project Structure

```
admin-frontend/
├── src/
│   ├── components/           # Reusable React components
│   │   └── Layout.tsx       # Main layout with sidebar
│   ├── pages/               # Page components (routes)
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── UsersPage.tsx
│   │   └── UserDetailPage.tsx
│   ├── services/            # API client and services
│   │   └── api.ts
│   ├── App.tsx              # Main app component with routing
│   ├── App.css              # App styles
│   ├── index.css            # Global styles
│   └── main.tsx             # Entry point
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── package.json
├── .env.example
└── README.md
```

## Key Components

### LoginPage
- Email/password authentication
- JWT token storage
- Error handling with user feedback

### DashboardPage
- Overview analytics cards (total users, new users, active users, engagement)
- Latest analytics snapshot
- Quick actions to navigate to user management

### UsersPage
- Paginated user list (20 per page)
- Search by email or username
- Filter by status (all users, admins only, regular users)
- Bulk actions: view details, reset progress, delete user
- Table sorting and responsive design

### UserDetailPage
- Detailed user profile with inline editing
- User statistics (lessons, quizzes, average score)
- Recent quiz attempts with scores
- Session history (devices, browsers, duration)
- Quick actions: reset progress, delete user
- Edit form with validation

## API Integration

The app communicates with the admin backend API (`/api`). The proxy is configured in `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  }
}
```

### Authentication Flow

1. User logs in on `/login` page
2. Backend validates credentials and returns JWT token
3. Token stored in localStorage as `admin_token`
4. Token attached to all subsequent API requests
5. 401 responses trigger logout and redirect to login

### API Endpoints Used

```
POST   /api/admin/auth/login              - Login
GET    /api/admin/users                   - List users (paginated)
GET    /api/admin/users/:userId           - Get user details
PUT    /api/admin/users/:userId           - Update user
DELETE /api/admin/users/:userId           - Delete user
POST   /api/admin/users/:userId/reset-progress - Reset progress
GET    /api/admin/analytics/overview      - Get analytics
```

See `/admin-backend/README.md` for complete API documentation.

## Styling

### CSS Architecture

- Global styles: `src/index.css` (CSS variables, resets, typography)
- Component styles: Colocated CSS files next to components
- Theme variables defined as CSS custom properties:
  - Colors: `--bg-primary`, `--accent-cyan`, `--accent-green`, etc.
  - Sizing: Consistent padding/margin scale
  - Effects: Shadows, transitions, borders

### Color Scheme

| Element | Color |
|---------|-------|
| Background | #0a0e1a |
| Panel | #1a202a |
| Border | #2a3040 |
| Accent Cyan | #00d4ff |
| Accent Green | #00ff88 |
| Accent Orange | #ff8c00 |
| Error | #ff3333 |

### Responsive Design

- Mobile: < 480px
- Tablet: 480px - 768px
- Desktop: > 768px

Breakpoints defined in component CSS files using media queries.

## Deployment

### Self-Hosted (Recommended)

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Copy `dist/` to your web server**
   ```bash
   scp -r dist/* your-server:/var/www/admin-dashboard/
   ```

3. **Configure web server (Apache/Nginx)**
   ```nginx
   server {
       listen 80;
       server_name admin-api.yourdomain.com;

       root /var/www/admin-dashboard;
       index index.html;

       location / {
           try_files $uri /index.html;
       }

       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Update .env for production**
   ```
   REACT_APP_API_URL=https://admin-api.yourdomain.com/api
   ```

### Docker

```dockerfile
FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

Build and run:
```bash
docker build -t netquest-admin-frontend .
docker run -p 3000:3000 -e REACT_APP_API_URL=http://api:3001/api netquest-admin-frontend
```

## Security Considerations

- ✅ JWT tokens stored in localStorage (vulnerable to XSS; consider httpOnly cookies in production)
- ✅ CORS configured on backend
- ✅ No sensitive data in frontend code
- ✅ Environment variables for API URLs
- ⚠️ Use HTTPS in production
- ⚠️ Implement rate limiting on backend
- ⚠️ Consider adding 2FA for admin accounts

## Performance

- **Vite** for fast HMR and optimized builds
- **React 18** with concurrent features
- **Code splitting** via React Router
- **Lazy loading** of page components
- **CSS custom properties** for efficient theming

### Build Size

- Development: ~5MB (with sourcemaps)
- Production: ~200KB gzipped (optimized)

## Troubleshooting

### "Cannot GET /" on page refresh

The app uses client-side routing. Configure your web server to serve `index.html` for all routes:

**Apache** (`.htaccess`):
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

**Nginx**:
```nginx
location / {
    try_files $uri /index.html;
}
```

### API requests failing (CORS)

Ensure the backend has CORS configured for your frontend origin:

Backend `.env`:
```
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

### Token expiration / "Unauthorized" errors

Tokens expire after 24 hours. Users must log in again. For production, consider:
- Refresh token flow
- Automatic logout with warning
- Silent token refresh

## Development Tips

### Hot Reload

Vite provides near-instant HMR for:
- React components
- CSS changes
- TypeScript files

No manual refresh needed during development.

### TypeScript Strict Mode

All files use TypeScript strict mode for safety. Install TypeScript extension in your IDE:
- VSCode: `ms-vscode.vscode-typescript-vue-plugin`

### API Development

To test API endpoints:

```bash
# Login
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@netquest.com","password":"password"}'

# Get users (with token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/admin/users
```

## Contributing

- Create feature branches from `main`
- Keep TypeScript strict mode enabled
- Write components as functional components with hooks
- Co-locate styles with components
- Test on multiple screen sizes before committing

## Roadmap

- [ ] Advanced analytics charts (Recharts integration)
- [ ] User activity graphs
- [ ] Export user data (CSV, PDF)
- [ ] Bulk user operations
- [ ] Audit log viewer
- [ ] Email notifications
- [ ] Real-time updates (WebSocket)
- [ ] Dark/light theme toggle
- [ ] Accessibility improvements (WCAG 2.1 AA)
- [ ] Unit and integration tests

## License

MIT

## Support

For issues or questions:
1. Check the backend logs: `docker logs netquest-admin`
2. Check browser console: F12 → Console tab
3. Verify API connectivity: `curl http://localhost:3001/health`
4. Check firewall/proxy rules if using self-hosted setup
