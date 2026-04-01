# GoPromptUp

Accountless, privacy-first prompt leaderboard powered by Epheme patterns.

## MVP Scope

- Model-specific prompt leaderboards
- Up/down voting with one vote per token per prompt per UTC day
- Vote changes allowed within the same day
- IP masking for anti-abuse controls
- Prompt expiration (TTL) plus time-decay ranking

## Repository Layout

- `backend/` Express API
- `frontend/` Static web app
- `docs/` API and architecture notes

## Quick Start

1. Copy `backend/.env.example` to `backend/.env` and adjust values if needed.
2. Install backend deps:
   - `cd backend`
   - `npm install`
3. Install frontend deps:
   - `cd ../frontend`
   - `npm install`
4. Run backend:
   - `cd ../backend`
   - `npm run dev`
5. Run frontend:
   - `cd ../frontend`
   - `npm run dev`
6. Open `http://localhost:5173`.

Backend defaults to `http://localhost:3010`.

## Git Initialization

This folder is intended to be its own git repository.

- `cd gopromptup`
- `git init`
- `git add .`
- `git commit -m "Initial scaffold"`
