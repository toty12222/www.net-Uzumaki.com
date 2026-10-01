# AGENTS.md

## Project Overview
A Node.js Express app that serves a Netflix-style streaming store UI and proxies TMDB (The Movie Database) API for content discovery and trailers. Originally deployed on Vercel.

## Setup
- **Runtime**: Node.js (Express 5, CommonJS)
- **Start**: `docker compose -f docker-compose.base44.yml up -d`
- **Port**: 3000 (mapped from container)
- **Health**: `GET /` serves `public/index.html`

## Key Details
- The `public/` directory was missing from the repo (never committed). It was recreated with `index.html` that consumes the `/api/content` and `/api/trailer/:type/:id` endpoints.
- TMDB credentials (`TMDB_API_KEY`, `TMDB_ACCESS_TOKEN`) are loaded from `.env` via `dotenv`. At least one must be set for the API to return data.
- The server defaults to port 3001 but the compose file sets `PORT=3000`.
- `node --watch` provides live reload on file changes — no extra dev dependency needed.
- No build step; static files served directly from `public/`.

## Verifying
- `curl http://localhost:3000/` → HTML page
- `curl http://localhost:3000/api/content` → JSON with content rows (requires TMDB keys)
