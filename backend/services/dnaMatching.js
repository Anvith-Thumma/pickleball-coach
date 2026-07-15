import { findTopMatches, blendScores } from '../similarity.js';
import { searchSimilarPlayers, scoreProsFromExaResults, isExaConfigured } from './exa.js';
import {
  buildDuprLookup,
  loadDuprRankings,
  mergeDuprIntoPro,
  enrichMatchForResponse,
} from './playerResearch.js';
import { isTavilyConfigured } from './tavily.js';
import { selectUniqueMatches } from '../utils/proDedup.js';
import { explainMatch } from '../utils/matchExplain.js';

const CANDIDATE_POOL = 12;
const PRIMARY_MATCHES = 1;
const SIMILAR_PLAYER_COUNT = 5;

/**
 * @param {number[]} userVector
 * @param {Record<string, number>} attributes
 * @param {Array} pros - full pro list with optional enrichment fields
 */
export async function runDnaMatching(userVector, attributes, pros) {
  const duprRankings = loadDuprRankings();
  const duprLookup = buildDuprLookup(duprRankings);

  const prosWithDupr = pros.map((p) => mergeDuprIntoPro(p, duprLookup));
  const proByName = new Map(prosWithDupr.map((p) => [p.name, p]));

  const cosineCandidates = findTopMatches(userVector, prosWithDupr, CANDIDATE_POOL);

  let exaResults = [];
  let exaConfigured = false;

  if (isExaConfigured()) {
    try {
      const exa = await searchSimilarPlayers(attributes);
      exaResults = exa.results;
      exaConfigured = exa.configured;
    } catch (err) {
      console.warn('Exa search failed:', err.message);
    }
  }

  const exaNameScores = exaConfigured
    ? scoreProsFromExaResults(prosWithDupr, exaResults)
    : new Map();

  const blended = cosineCandidates.map((c) => {
    const semanticScore = exaNameScores.get(c.name) ?? 0;
    const combinedScore = blendScores(c.similarity, semanticScore);
    return {
      ...c,
      semanticScore: Math.round(semanticScore * 1000) / 1000,
      combinedScore,
    };
  });

  blended.sort((a, b) => b.combinedScore - a.combinedScore);

  const discoveredNames = new Set(blended.map((b) => b.name));

  if (exaConfigured && exaResults.length > 0) {
    for (const pro of prosWithDupr) {
      if (discoveredNames.has(pro.name)) continue;
      const semanticScore = exaNameScores.get(pro.name) ?? 0;
      if (semanticScore < 0.35) continue;

      blended.push({
        name: pro.name,
        archetype: pro.archetype,
        bio_snippet: pro.bio_snippet,
        attributes: pro.attributes,
        similarity: 0,
        semanticScore: Math.round(semanticScore * 1000) / 1000,
        combinedScore: semanticScore * 0.85,
        discoveredViaExa: true,
      });
      discoveredNames.add(pro.name);
    }

    blended.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  const similarSlice = selectUniqueMatches(blended, SIMILAR_PLAYER_COUNT);
  const primarySlice = similarSlice.slice(0, PRIMARY_MATCHES);

  const enrichedPrimary = await Promise.all(
    primarySlice.map(async (m) => {
      const proRecord = proByName.get(m.name);
      const matchPayload = {
        name: m.name,
        archetype: m.archetype,
        bio_snippet: m.bio_snippet,
        attributes: m.attributes,
        similarity: m.similarity,
        semanticScore: m.semanticScore,
        combinedScore: Math.round(m.combinedScore * 1000) / 1000,
        discoveredViaExa: m.discoveredViaExa ?? false,
      };
      const enriched = await enrichMatchForResponse(matchPayload, proRecord, attributes);
      return {
        ...enriched,
        matchExplanation: explainMatch(attributes, m.attributes, {
          labelA: 'You',
          labelB: m.name,
        }),
      };
    })
  );

  const similarPlayers = similarSlice.map((m, i) => ({
    rank: i + 1,
    name: m.name,
    archetype: m.archetype,
    bio_snippet: m.bio_snippet,
    attributes: m.attributes,
    similarity: m.similarity,
    combinedScore: Math.round(m.combinedScore * 1000) / 1000,
    dupr_rating: proByName.get(m.name)?.dupr_rating ?? m.dupr_rating ?? null,
    dupr_category: proByName.get(m.name)?.dupr_category ?? m.dupr_category ?? null,
    matchExplanation: explainMatch(attributes, m.attributes, {
      labelA: 'You',
      labelB: m.name,
    }),
  }));

  return {
    matches: enrichedPrimary,
    similarPlayers,
    enrichment: {
      exaConfigured,
      tavilyConfigured: isTavilyConfigured(),
      duprLoaded: Boolean(duprRankings),
      cached: enrichedPrimary.some((m) => m.research_summary && m.sources?.length),
      fetchedAt: new Date().toISOString(),
    },
  };
}
