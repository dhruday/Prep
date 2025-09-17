# Taskify Backend

## Setup

1. Copy `.env.example` to `.env` and edit MONGO_URI if needed.
2. Install dependencies: `npm install`
3. Run server: `npm run dev` (requires nodemon) or `npm start`

API endpoints are mounted at `/api/tasks`:
- GET /api/tasks
- GET /api/tasks/:id
- POST /api/tasks
- PUT /api/tasks/:id
- DELETE /api/tasks/:id
