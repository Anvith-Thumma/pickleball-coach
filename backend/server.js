import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { streamCoachingChat, generateDNAReport, generateScoutingReport } from './agent.js';
import { ATTRIBUTE_KEYS } from './similarity.js';
import { runDnaMatching } from './services/dnaMatching.js';
import { analyzeMatchup } from './services/h2hAnalysis.js';
import { getPlayerHistory, listSnapshots, rebuildIndexFromFiles } from './services/duprHistory.js';
import { researchProPlayer, isTavilyConfigured } from './services/tavily.js';
import { resolveSide } from './utils/teamProfile.js';
import { AGE_GROUPS, FORMATS } from './utils/duprScraper.js';
import { getBoard, listBoardKeys } from './services/duprBoards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Render (and most PaaS hosts) sit behind a reverse proxy, so express-rate-limit
// needs this to correctly identify each client's real IP via X-Forwarded-For.
app.set('trust proxy', 1);

function loadPros() {
  const enrichedPath = join(__dirname, 'data', 'pros-enriched.json');
  const basePath = join(__dirname, 'data', 'pros.json');

  if (existsSync(enrichedPath)) {
    const data = JSON.parse(readFileSync(enrichedPath, 'utf-8'));
    console.log(`Loaded ${data.pros.length} pros from pros-enriched.json`);
    return data;
  }

  console.log('Using pros.json (run npm run enrich:pros for Tavily cache)');
  return JSON.parse(readFileSync(basePath, 'utf-8'));
}

const prosData = loadPros();

let duprRankings = null;
try {
  duprRankings = JSON.parse(
    readFileSync(join(__dirname, 'data', 'dupr-rankings.json'), 'utf-8')
  );
} catch {
  console.warn('dupr-rankings.json not found — run: npm run scrape:dupr');
}

// Comma-separated exact origins, e.g. CORS_ORIGIN=https://pickleball-coach.vercel.app
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Matches any Vercel preview deployment of this project, e.g.
// https://pickleball-coach-git-feature-x-anvith.vercel.app
const vercelPreviewPattern = /^https:\/\/pickleball-coach[a-z0-9-]*\.vercel\.app$/i;

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin/non-browser request (curl, health checks) — allow.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
        return callback(null, true);
      }
      // Reject without throwing — an Error here would surface a stack trace
      // to the client via Express's default error handler.
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
  })
);
app.use(express.json({ limit: '1mb' }));

const cheapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // static/read-only data (pros list, questions, health, dupr rankings/history)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a minute.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6, // each request can fan out to multiple Anthropic/Tavily/Exa calls — keep tight
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a minute and try again.' },
});

app.use('/api/chat', aiLimiter);
app.use('/api/similarity', aiLimiter);
app.use('/api/scouting', aiLimiter);
app.use('/api', cheapLimiter);

let questionsData = null;
try {
  questionsData = JSON.parse(
    readFileSync(join(__dirname, 'data', 'questions.json'), 'utf-8')
  );
} catch {
  console.warn('questions.json not found');
}

app.get('/api/questions', (_req, res) => {
  if (!questionsData) {
    return res.status(503).json({ error: 'Assessment questions not loaded' });
  }
  res.json({
    attributeKeys: questionsData.ATTRIBUTE_KEYS,
    sections: questionsData.SECTIONS,
    questions: questionsData.QUESTIONS,
    questionCount: questionsData.QUESTIONS.length,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    integrations: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      tavily: isTavilyConfigured(),
      exa: Boolean(process.env.EXA_API_KEY),
    },
  });
});

app.get('/api/dupr/rankings', (req, res) => {
  if (!duprRankings) {
    return res.status(503).json({
      error: 'DUPR rankings not loaded. Run: cd backend && npm run scrape:dupr',
    });
  }

  const { category, format, ageGroup, board: boardKey } = req.query;
  const formatKey = format ?? category;

  if (ageGroup && !formatKey && !boardKey) {
    const group = duprRankings.categories?.[ageGroup];
    if (!group) {
      return res.status(404).json({
        error: 'Unknown age group',
        ageGroups: AGE_GROUPS,
      });
    }
    return res.json({
      scrapedAt: duprRankings.scrapedAt,
      ageGroup,
      boards: group,
    });
  }

  if (formatKey || boardKey) {
    const data = getBoard(duprRankings, {
      ageGroup: ageGroup ?? 'open',
      format: formatKey,
      key: boardKey,
    });
    if (!data?.players) {
      return res.status(404).json({
        error: 'Unknown board',
        ageGroups: AGE_GROUPS,
        formats: FORMATS.map((f) => f.key),
        boards: listBoardKeys(duprRankings),
      });
    }
    return res.json({
      scrapedAt: duprRankings.scrapedAt,
      ...data,
    });
  }

  res.json({
    scrapedAt: duprRankings.scrapedAt,
    disclaimer: duprRankings.disclaimer,
    summary: duprRankings.summary ?? {
      ageGroups: AGE_GROUPS,
      formats: FORMATS.map((f) => f.key),
    },
    ageGroups: AGE_GROUPS,
    formats: FORMATS.map((f) => f.key),
    boards: listBoardKeys(duprRankings),
    categories: duprRankings.categories ?? { open: duprRankings.open },
    all: duprRankings.all,
  });
});

app.get('/api/pros', (_req, res) => {
  res.json({
    count: prosData.pros.length,
    pros: prosData.pros.map((p) => ({
      name: p.name,
      archetype: p.archetype,
      dupr_rating: p.dupr_rating ?? null,
    })),
  });
});

app.get('/api/pros/:name/context', aiLimiter, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const pro = prosData.pros.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (!pro) {
      return res.status(404).json({ error: 'Pro not found' });
    }

    let research = {
      research_summary: pro.research_summary,
      sources: pro.sources ?? [],
    };

    if (!research.research_summary && isTavilyConfigured()) {
      research = await researchProPlayer(pro.name);
    }

    res.json({
      name: pro.name,
      archetype: pro.archetype,
      dupr_rating: pro.dupr_rating ?? null,
      dupr_category: pro.dupr_category ?? null,
      ...research,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, playerProfile } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    for (const m of messages) {
      if (!m.role || m.content == null) {
        return res.status(400).json({ error: 'Each message needs role and content' });
      }
      if (!['user', 'assistant'].includes(m.role)) {
        return res.status(400).json({ error: 'Invalid message role' });
      }
      if (typeof m.content !== 'string') {
        return res.status(400).json({ error: 'Message content must be a string' });
      }
    }
    await streamCoachingChat(messages, res, {
      pros: prosData.pros,
      duprRankings,
      playerProfile: playerProfile ?? null,
    });
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Chat failed' });
    }
  }
});

app.get('/api/dupr/history', (req, res) => {
  const { player, category } = req.query;

  if (player) {
    return res.json(
      getPlayerHistory(
        decodeURIComponent(player),
        req.query.format ?? category ?? null,
        req.query.ageGroup ?? null
      )
    );
  }

  const meta = listSnapshots();
  if (meta.count === 0) {
    const rebuilt = rebuildIndexFromFiles();
    if (rebuilt > 0) {
      return res.json(listSnapshots());
    }
  }

  res.json(meta);
});

function resolveMatchupSides(body) {
  const matchFormat = body.matchFormat === 'singles' ? 'singles' : 'doubles';

  if (!body.playerA || !body.playerB) {
    throw new Error('playerA and playerB are required');
  }

  if (matchFormat === 'doubles') {
    if (!body.partnerA || !body.partnerB) {
      throw new Error('Doubles requires partnerA and partnerB (one pro per side)');
    }
  }

  const resolvedA = resolveSide(body.playerA, body.partnerA ?? null, prosData.pros, {
    format: matchFormat,
    sideLabel: 'Your team',
  });
  const resolvedB = resolveSide(body.playerB, body.partnerB ?? null, prosData.pros, {
    format: matchFormat,
    sideLabel: 'Opponent team',
  });

  return { matchFormat, resolvedA, resolvedB };
}

app.post('/api/matchup', async (req, res) => {
  try {
    const { matchFormat, resolvedA, resolvedB } = resolveMatchupSides(req.body);
    const analysis = analyzeMatchup(resolvedA, resolvedB, { matchFormat });

    res.json({ analysis, matchFormat });
  } catch (err) {
    console.error('Matchup error:', err);
    res.status(400).json({ error: err.message || 'Matchup analysis failed' });
  }
});

app.post('/api/scouting', async (req, res) => {
  try {
    const { focusPlayer = 'playerA', includeAnalysis = true } = req.body;
    const { matchFormat, resolvedA, resolvedB } = resolveMatchupSides(req.body);
    const analysis = analyzeMatchup(resolvedA, resolvedB, { matchFormat });

    let scoutingReport = null;
    try {
      scoutingReport = await generateScoutingReport(analysis, focusPlayer);
    } catch (reportErr) {
      console.error('Scouting report error:', reportErr);
    }

    res.json({
      analysis: includeAnalysis ? analysis : undefined,
      scoutingReport,
      focusPlayer,
    });
  } catch (err) {
    console.error('Scouting error:', err);
    res.status(400).json({ error: err.message || 'Scouting failed' });
  }
});

app.post('/api/similarity', async (req, res) => {
  try {
    const { vector, attributes } = req.body;

    let userVector = vector;
    if (!userVector && attributes) {
      userVector = ATTRIBUTE_KEYS.map((key) => attributes[key] ?? 0.5);
    }

    if (!Array.isArray(userVector) || userVector.length !== ATTRIBUTE_KEYS.length) {
      return res.status(400).json({
        error: `vector must be an array of ${ATTRIBUTE_KEYS.length} floats`,
      });
    }

    const userProfile = {
      attributes: attributes ?? Object.fromEntries(
        ATTRIBUTE_KEYS.map((key, i) => [key, userVector[i]])
      ),
      vector: userVector,
    };

    const { matches, similarPlayers, enrichment } = await runDnaMatching(
      userVector,
      userProfile.attributes,
      prosData.pros
    );

    let dnaReport = null;
    try {
      dnaReport = await generateDNAReport(userProfile, matches, enrichment);
    } catch (reportErr) {
      console.error('DNA report error:', reportErr);
      dnaReport = null;
    }

    res.json({
      matches,
      similarPlayers,
      userProfile,
      dnaReport,
      attributeKeys: ATTRIBUTE_KEYS,
      enrichment,
    });
  } catch (err) {
    console.error('Similarity error:', err);
    res.status(500).json({ error: err.message || 'Similarity failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Pickleball Coach API running on http://localhost:${PORT}`);
});
