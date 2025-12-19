# SiteForgeAI Backend - Render Deployment

This is the backend API for SiteForgeAI, an AI-powered website creation platform.

## Deploy to Render

### Option 1: Using render.yaml (Recommended)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Render will automatically detect the `render.yaml` configuration

### Option 2: Manual Setup
1. Create a new Web Service on Render
2. Set the following:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Environment Variables
Set these in Render dashboard:
- `DATABASE_URL` - Your PostgreSQL connection string
- `SESSION_SECRET` - A random secret for sessions (auto-generated if using render.yaml)
- `JWT_SECRET` - A random secret for JWT tokens (auto-generated if using render.yaml)
- `FRONTEND_URL` - Your Vercel frontend URL (e.g., https://siteforgeai.vercel.app)

### Database Setup
After deployment, run the database migration:
```bash
npm run db:push
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Templates
- `GET /api/templates` - List templates

### Media
- `GET /api/media` - List user's media
- `POST /api/media` - Upload media

### Admin (requires ADMIN role)
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/stats` - Platform statistics
