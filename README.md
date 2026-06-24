# ProgTalk

A full-stack discussion forum web application with moderation, topic trees, user roles, and real-time communication.

## Project in 30 Seconds

ProgTalk is a community-driven full-stack platform inspired by classic discussion forums. Users can create topics and posts, reply to each other, manage moderation rules, and receive real-time updates through WebSockets.

Core highlights:
- advanced permission model (user/admin + topic-level moderation),
- hierarchical topic structure (topics and subtopics),
- real-time notifications and live updates via Socket.IO,
- security-focused backend: JWT, HttpOnly cookies, Zod validation, rate limiting,
- Dockerized setup with Docker Compose,
- Vue 3 frontend with Pinia and Vue Router.

## Key Features

### Authentication and Profiles
- user registration with admin approval flow,
- login by username or email,
- JWT-based authentication stored in HttpOnly cookies,
- profile update and password change,
- user blocking/unblocking by administrators.

### Forum and Content
- tree-based topic architecture with parent-child relationships,
- topic and post creation,
- post replies,
- post editing, soft deletion, and likes,
- topic and post tagging,
- post pagination with last-read-page tracking.

### Moderation and Administration
- admin dashboard for approvals, user blocks, user deletion, and global tag management,
- moderator promotion/removal,
- topic ownership transfer,
- topic-level user blocking with subtopic exceptions,
- topic closing and hiding.

### Real-Time Layer (Socket.IO)
- notifications for new posts and admin activity,
- live topic state updates (hidden/closed/moderation changes),
- reply and post-like notifications,
- live admin dashboard refresh.

## Tech Stack

### Backend
- Node.js, Express 5
- MongoDB + Mongoose
- Passport + passport-jwt
- Zod (request validation)
- Socket.IO
- express-rate-limit
- bcrypt, jsonwebtoken, cookie-parser, cors

### Frontend
- Vue 3 (Composition API)
- Pinia
- Vue Router
- Vite
- Axios
- markdown-it + DOMPurify + highlight.js

### DevOps
- Docker, Docker Compose
- HTTPS setup (certificate included in project)

## Architecture Overview

- Monorepo with backend and frontend modules.
- REST API exposed under /api.
- WebSocket server runs on the same HTTPS server instance.
- Data persisted in MongoDB.
- Frontend build can be served directly by backend.

## Project Structure

- controllers/ - API business logic (auth, posts, topics, admin)
- models/ - Mongoose schemas
- routes/ - REST routes
- middleware/ - auth guards, rate limit, socket bootstrap
- validation/ - Zod schemas and validation helpers
- services/ - shared domain services (for example tag scope rules)
- scripts/ - seed and utility scripts
- frontend/ - Vue 3 application

## Running with Docker (Recommended)

### 1. Requirements
- Docker
- Docker Compose

### 2. Start
```bash
docker compose up --build
```

After startup:
- backend HTTPS: https://localhost:3443
- backend HTTP redirect: http://localhost:3000
- MongoDB: localhost:27017

## Running Locally (Without Docker)

### 1. Backend
```bash
npm install
node index.js
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Default frontend port: 5173.

## Environment Configuration

Example backend environment variables:

```env
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=ProgTalk
PORT=3000
HTTPS_PORT=3443
API_HOST=0.0.0.0
JWT_SECRET=change_me
CORS_ORIGINS=https://localhost:5173,https://127.0.0.1:5173
```

Frontend (Vite) environment variables:

```env
VITE_API_HOST=localhost
VITE_API_PORT=3443
VITE_API_PROTOCOL=https
VITE_DEV_PORT=5173
```

## Seed Data

The project includes scripts to populate MongoDB with sample users and topics:

```bash
node scripts/seedInitialData.js
```

Sample seeded accounts:
- admin1 / Admin123!
- admin2 / Admin123!
- user1 / User123!
- user2 / User123!
- user3 / User123!

Note: test credentials must be changed for production deployments.

## Security Notes

- JWT-based route protection with Passport,
- HttpOnly secure cookie usage,
- role-based authorization,
- Zod validation for request payloads,
- dedicated rate limits for auth/write/admin endpoints,
- CORS allowlist configuration.

## Author

Szymon Lato
