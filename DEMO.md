# Pickleball Coach — Demo Guide

**Live app:** [http://localhost:5173](http://localhost:5173)  
**API health:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## Before the demo (15 min prior)

### 1. Start servers

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Confirm health returns `"anthropic": true`:

```bash
curl http://localhost:3001/api/health
```

### 2. Pre-load Player DNA (do NOT live-quiz during demo)

The assessment is **22 questions** (~5–8 min). Complete it once before presenting:

1. Open **Player DNA** tab
2. Fill intake (skill level, optional DUPR)
3. Finish all questions → wait for DNA report + pro match
4. Leave the profile saved (don’t click **Remove saved DNA**)

If you need a clean slate first: **Player DNA** → **Remove saved DNA** → retake.

### 3. Browser prep

- Use **Chrome or Safari**, one tab, full screen
- Zoom 100%, close unrelated tabs
- Disable notifications
- Optional: clear Coach Chat history by refreshing (profile stays in localStorage)

### 4. Know your fallback lines

| If this happens | Say / do |
|-----------------|----------|
| Chat takes 5–10s | “Claude is streaming live — not canned responses.” |
| Similarity/DNA slow | “Running cosine match + AI report against 50+ pro profiles.” |
| API error | Show Matchup Lab (works without new Claude call for H2H) |
| No DNA saved | Demo Coach Chat + Matchup with two pros only |

---

## Demo script (~8 minutes)

### Opening (30 sec)

> “Pickleball Coach is an AI coaching app for recreational and competitive players. It combines strategy chat, a Player DNA style profile, pro similarity matching, and matchup analytics — like a 2K build card plus a scout’s notebook for pickleball.”

---

### 1. Coach Chat (2 min)

**Tab:** Coach Chat · **Level:** Intermediate

Click a starter prompt or type:

- *“When should I speed up vs keep dinking?”*
- *“Give me a drill to improve my third shot drop”*

**Point out:** streaming response, skill-level adaptation, formatted bullets.

**If DNA is saved**, ask:

- *“What should I work on based on my Player DNA?”*

**Point out:** brief “Loading your DNA profile…” — coach pulls live profile data (tool use).

---

### 2. Player DNA (2 min)

**Tab:** Player DNA

**If pre-completed:** walk through the report:

- **Radar / attributes** — 14 dimensions (dinks, net presence, poach tendency, etc.)
- **Pro match** — “You play most like…”
- **Similar players** — top 5 with explanations
- **DNA report** — 2K-style archetype write-up

Click **Analyze matchup** on a similar pro → jumps to Matchup Lab.

**If not pre-completed:** show intake + 2–3 sample questions, then say *“Full quiz takes ~5 min — I completed it beforehand.”*

---

### 3. Matchup Lab (3 min)

**Tab:** Matchup Lab

**Setup:**

- Format: **Doubles** (or Singles)
- **You:** Player DNA profile
- **Opponent:** Ben Johns (+ partner for doubles, e.g. Anna Leigh Waters)
- Click **Analyze matchup**

**Walk through H2H panel:**

- Style alignment vs style *edge* (not win prediction — be clear)
- Attribute edges (net game, resets, etc.)
- Tactical notes

Click **Generate scouting report** (~10–20 sec):

- Tournament-prep brief: advantages, threats, game plan, drills

---

### 4. Close / vision (30 sec)

> “Today this is style- and attribute-driven coaching. The separate **pickleball-analytics-pipeline** project will add real match video — ball tracking, shot type, player location — so we can recommend statistically best shots by situation. Pickleball Coach is the consumer-facing layer on top.”

---

## One-liner feature map

| Tab | What it shows |
|-----|----------------|
| **Coach Chat** | AI strategy + drills; personalized when DNA saved |
| **Player DNA** | 22-question assessment → 14 attributes → pro match |
| **Matchup Lab** | H2H style analysis + AI scouting vs any pro |

---

## Suggested demo personas

Pick one intake profile before the demo so the story is consistent:

| Persona | Skill | DUPR | Story |
|---------|-------|------|-------|
| Recreational dinker | Intermediate | 3.5 | Patient kitchen game, weak speed-ups |
| Aggressive rec player | Advanced | 4.5 | Likes hands battles, weak resets |
| Competitive doubles | Competitive | 5.5 | Poaches a lot, transition focus |

---

## Quick reference — API-backed features

All require backend running + `ANTHROPIC_API_KEY` in `.env`:

- Coach Chat, DNA report, Scouting report → **Claude**
- Similarity / H2H → **local** (pros.json + math)
- DUPR rankings → **cached JSON** (no live scrape during demo)

---

## After the demo

```bash
# Stop servers: Ctrl+C in both terminals
```

To reset DNA for next audience: **Player DNA** → **Remove saved DNA**.
