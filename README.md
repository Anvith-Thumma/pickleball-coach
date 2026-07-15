# Pickleball Coach

Full-stack AI pickleball coaching app with streaming chat, a 22-question Player DNA assessment, and pro-player similarity matching powered by cosine similarity.

## Tech Stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express
- **AI:** Anthropic Claude (`claude-sonnet-4-6`)
- **Similarity:** Cosine similarity against 50+ pro player profiles (14-dimension DNA)

## Project Structure

```
pickleball-coach/
├── .env                 # API key (never commit)
├── .env.example
├── frontend/            # React app (port 5173)
├── backend/             # Express API (port 3001)
│   ├── server.js
│   ├── agent.js
│   ├── similarity.js
│   ├── prompts/coach.js
│   ├── data/pros.json
│   ├── data/dupr-rankings.json   # scraped top-50 (prototype)
│   └── scripts/scrape-dupr-rankings.js
└── README.md
```

## Setup

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend (new terminal)
cd frontend
npm install
```

### 2. Configure environment

From the project root, copy the example env file and add your Anthropic API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

> The API key is only read by the backend. The frontend never sees it.

### 3. Run the app

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The Vite dev server proxies `/api/*` requests to the backend on port 3001.

### Demo

See **[DEMO.md](DEMO.md)** for a pre-demo checklist and ~8-minute walkthrough script. **Complete Player DNA before presenting** (22 questions — too long for live demo).

## Features

### Coach Chat
- Ask pickleball strategy, drills, kitchen rules, stacking, erne, ATP, etc.
- Streaming responses via Server-Sent Events
- Skill level selector (Beginner / Intermediate / Advanced)

### Player DNA Assessment
- 22-question questionnaire across kitchen play, attack, defense, movement, doubles IQ, and serve/return
- Answers map to **14 normalized attributes** (0.0–1.0): dinks, aggression, net presence, power, resets, 3rd-shot drop, patience, speed-ups, lobs, coverage, transition, counter-attack, return pressure, poach tendency
- Builds a player vector for similarity matching

### Pro Similarity Engine
- Compares your vector to 30+ pro players in `backend/data/pros.json`
- Returns your best pro match plus top 5 similar players with attribute explanations
- Claude generates a personalized 2K-style DNA report

### Matchup Lab (Tier 1 analytics)
- **Head-to-head analysis:** attribute deltas, style-edge scoring, tactical notes
- **AI scouting reports:** tournament-prep briefs from matchup data
- Use your DNA profile vs any pro, or compare two pros directly

## DUPR rankings (prototype)

Scrapes **all 12 public leaderboards** from [DUPR rankings](https://www.dupr.com/rankings) — top 50 per board:

| Demographic | Formats |
|-------------|---------|
| **Open** | men's doubles, women's doubles, men's singles, women's singles |
| **Senior** | same four formats |
| **Junior** | same four formats |

~600 ranked entries, ~490 unique players. Mixed doubles and 50+/65+ age-band ratings are **not** on the public page (DUPR app / Partner API only).

```bash
cd backend
npm run scrape:dupr    # one-off: writes backend/data/dupr-rankings.json
npm run snapshot:dupr  # daily snapshot → backend/data/dupr-history/
npm run migrate:pros   # extend pro profiles to 14 DNA attributes
```

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dupr/rankings` | All demographics + summary metadata |
| GET | `/api/dupr/rankings?ageGroup=senior&format=mens_doubles` | One board |
| GET | `/api/dupr/rankings?board=junior_womens_singles` | One board (flat key) |
| GET | `/api/dupr/history` | List of stored daily snapshots |
| GET | `/api/dupr/history?player=Ben%20Johns&ageGroup=open` | Rating history across boards |

**Note:** Scraping is for local prototypes only. Use DUPR’s official API or partner access before shipping a public product.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/questions` | Player DNA assessment questions |
| GET | `/api/pros` | Pro catalog for matchup dropdowns |
| GET | `/api/dupr/rankings` | Cached DUPR top-50 boards (prototype) |
| GET | `/api/dupr/history` | DUPR snapshot metadata or player rating history |
| POST | `/api/chat` | Streaming coaching chat (SSE) |
| POST | `/api/similarity` | Pro match + similar players + DNA report |
| POST | `/api/matchup` | Head-to-head style analysis |
| POST | `/api/scouting` | AI scouting report for a matchup |

Rate limit: **30 requests/minute per IP** on all `/api` routes.

## Production Build

```bash
cd frontend && npm run build
cd backend && npm start
```

Serve the `frontend/dist` folder with your preferred static host and point API calls to your deployed backend (update CORS origins in `server.js`).

## Security

- `ANTHROPIC_API_KEY` lives only in `.env` (listed in `.gitignore`)
- All Claude calls are proxied through the backend
- `express-rate-limit` on `/api` routes
- CORS restricted to local dev origins by default
