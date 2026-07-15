import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { researchPlaystyleAdvice, isTavilyConfigured } from './tavily.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

/** @type {Map<string, { research_summary, sources, fetchedAt }>} */
const runtimeCache = new Map();
const RUNTIME_TTL_MS = 60 * 60 * 1000;

function cacheKey(proName, userAttributes) {
  if (!userAttributes) return proName;
  const sig = Object.values(userAttributes)
    .map((v) => Math.round(v * 10))
    .join('');
  return `${proName}:${sig}`;
}

export function loadDuprRankings() {
  const path = join(DATA_DIR, 'dupr-rankings.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function buildDuprLookup(duprRankings) {
  const lookup = new Map();
  if (!duprRankings) return lookup;

  const boards =
    duprRankings.all ??
    Object.fromEntries(
      Object.entries(duprRankings.open ?? {}).map(([k, v]) => [k, v])
    );

  for (const [boardKey, board] of Object.entries(boards)) {
    for (const player of board.players ?? []) {
      const existing = lookup.get(player.name);
      if (!existing || player.rating > existing.rating) {
        lookup.set(player.name, {
          dupr_rating: player.rating,
          dupr_category: board.format ?? boardKey,
          dupr_age_group: board.ageGroup ?? 'open',
          dupr_board: boardKey,
          dupr_rank: player.rank,
        });
      }
    }
  }
  return lookup;
}

export function mergeDuprIntoPro(pro, duprLookup) {
  const dupr = duprLookup.get(pro.name);
  if (!dupr) return { ...pro };
  return {
    ...pro,
    dupr_rating: dupr.dupr_rating,
    dupr_category: dupr.dupr_category,
    dupr_rank: dupr.dupr_rank,
  };
}

export async function fetchRuntimeResearch(proRecord, userAttributes = null) {
  if (!isTavilyConfigured() || !proRecord) {
    return null;
  }

  const key = cacheKey(proRecord.name, userAttributes);
  const cached = runtimeCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < RUNTIME_TTL_MS) {
    return cached;
  }

  try {
    const data = await researchPlaystyleAdvice(proRecord, userAttributes);
    const entry = {
      research_summary: data.research_summary,
      sources: data.sources,
      fetchedAt: Date.now(),
    };
    runtimeCache.set(key, entry);
    return entry;
  } catch (err) {
    console.warn(`Tavily runtime fetch failed for ${proRecord.name}:`, err.message);
    return null;
  }
}

function isAdviceCached(sources) {
  if (!sources?.length) return false;
  return sources.some((s) => s.type === 'advice');
}

export async function enrichMatchForResponse(match, proRecord, userAttributes = null) {
  const base = {
    ...match,
    dupr_rating: proRecord?.dupr_rating ?? match.dupr_rating ?? null,
    dupr_category: proRecord?.dupr_category ?? match.dupr_category ?? null,
    dupr_rank: proRecord?.dupr_rank ?? match.dupr_rank ?? null,
    research_summary:
      proRecord?.research_summary ?? match.research_summary ?? null,
    sources: proRecord?.sources?.length ? proRecord.sources : match.sources ?? [],
  };

  const hasCachedAdvice =
    base.research_summary && isAdviceCached(base.sources);

  if (hasCachedAdvice || !isTavilyConfigured()) {
    return base;
  }

  const fresh = await fetchRuntimeResearch(
    proRecord ?? { name: match.name, archetype: match.archetype, bio_snippet: match.bio_snippet },
    userAttributes
  );
  if (!fresh) return base;

  return {
    ...base,
    research_summary: fresh.research_summary ?? base.research_summary,
    sources: fresh.sources?.length ? fresh.sources : base.sources,
    research_fetched_at: new Date(fresh.fetchedAt).toISOString(),
  };
}
