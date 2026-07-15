import { ATTRIBUTE_KEYS } from '../similarity.js';
import { runDnaMatching } from './dnaMatching.js';
import { analyzeMatchup } from './h2hAnalysis.js';
import { getPlayerHistory } from './duprHistory.js';
import { resolveSide } from '../utils/teamProfile.js';
import { iterateBoards } from '../utils/duprScraper.js';

export const COACH_TOOLS = [
  {
    name: 'get_player_profile',
    description:
      'Return the connected player\'s saved Player DNA profile (14 attributes, DUPR estimate, biometrics). Use when advice should be personalized to their style.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'find_similar_pros',
    description:
      'Find pro players with similar DNA to the saved player profile. Returns best match and top similar players with explanations.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_pro_players',
    description:
      'List available pro players in the catalog (name + archetype) for matchup or comparison questions.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional name filter (case-insensitive substring)',
        },
      },
      required: [],
    },
  },
  {
    name: 'analyze_matchup',
    description:
      'Head-to-head style analysis between the player (saved DNA profile) and an opponent pro. Supports singles or doubles.',
    input_schema: {
      type: 'object',
      properties: {
        matchFormat: {
          type: 'string',
          enum: ['singles', 'doubles'],
          description: 'Match format (default singles)',
        },
        opponentProName: {
          type: 'string',
          description: 'Opponent pro name from the catalog (required)',
        },
        partnerProName: {
          type: 'string',
          description: 'Your doubles partner pro name (required for doubles)',
        },
        opponentPartnerProName: {
          type: 'string',
          description: 'Opponent doubles partner pro name (required for doubles)',
        },
      },
      required: ['opponentProName'],
    },
  },
  {
    name: 'search_dupr_rankings',
    description:
      'Search public DUPR leaderboard data by player name. Returns ratings, ranks, and board (format/age group).',
    input_schema: {
      type: 'object',
      properties: {
        playerName: { type: 'string', description: 'Player name or partial name' },
        limit: { type: 'number', description: 'Max results (default 8)' },
      },
      required: ['playerName'],
    },
  },
  {
    name: 'get_dupr_rating_history',
    description:
      'Rating time series for a player across stored DUPR snapshots (if snapshot history exists).',
    input_schema: {
      type: 'object',
      properties: {
        playerName: { type: 'string', description: 'Exact or partial player name' },
      },
      required: ['playerName'],
    },
  },
  {
    name: 'generate_scouting_report',
    description:
      'Full AI scouting brief for a matchup (slower). Use when the player wants tournament-style prep, not quick tips.',
    input_schema: {
      type: 'object',
      properties: {
        matchFormat: { type: 'string', enum: ['singles', 'doubles'] },
        opponentProName: { type: 'string' },
        partnerProName: { type: 'string' },
        opponentPartnerProName: { type: 'string' },
      },
      required: ['opponentProName'],
    },
  },
];

function summarizeProfile(profile) {
  if (!profile?.attributes) {
    return { available: false, message: 'No Player DNA profile saved. Suggest completing the DNA assessment.' };
  }

  const topAttrs = Object.entries(profile.attributes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, val]) => ({ attribute: key, value: val }));

  const lowAttrs = Object.entries(profile.attributes)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key, val]) => ({ attribute: key, value: val }));

  return {
    available: true,
    label: 'You',
    attributes: profile.attributes,
    duprRating:
      profile.biometrics?.duprRating ?? profile.calibration?.dupr ?? null,
    biometrics: profile.biometrics ?? null,
    calibrationNote: profile.calibration?.note ?? null,
    strengths: topAttrs,
    growthEdges: lowAttrs,
  };
}

function summarizeSimilarPlayers(matches, similarPlayers) {
  const best = matches[0];
  return {
    bestMatch: best
      ? {
          name: best.name,
          archetype: best.archetype,
          similarityPct: Math.round((best.similarity ?? 0) * 100),
          combinedScorePct:
            best.combinedScore != null ? Math.round(best.combinedScore * 100) : null,
          duprRating: best.dupr_rating ?? null,
          matchExplanation: best.matchExplanation ?? null,
        }
      : null,
    similarPlayers: (similarPlayers ?? []).slice(0, 5).map((p) => ({
      name: p.name,
      archetype: p.archetype,
      similarityPct: Math.round((p.similarity ?? 0) * 100),
      matchExplanation: p.matchExplanation ?? null,
    })),
  };
}

function summarizeMatchup(analysis) {
  const { playerA, playerB, styleEdge, playerAEdges, playerBEdges, tacticalNotes, clashProfile, explanation } =
    analysis;

  return {
    matchFormat: analysis.matchFormat,
    playerA: { name: playerA.name, archetype: playerA.archetype },
    playerB: { name: playerB.name, archetype: playerB.archetype },
    clashProfile,
    styleAlignmentPct: explanation.overallAlignmentPct,
    styleAdvantage: {
      favors: styleEdge.favored === 'playerA' ? playerA.name : playerB.name,
      confidence: styleEdge.confidence,
      disclaimer: styleEdge.disclaimer,
      keyFactors: styleEdge.keyFactors,
    },
    yourEdges: playerAEdges,
    opponentEdges: playerBEdges,
    tacticalNotes,
  };
}

function buildPlayerAPayload(playerProfile) {
  if (!playerProfile?.attributes) {
    throw new Error('No saved Player DNA profile. Complete the DNA assessment first.');
  }
  return {
    label: 'You',
    attributes: playerProfile.attributes,
    dupr_rating:
      playerProfile.biometrics?.duprRating ?? playerProfile.calibration?.dupr ?? null,
  };
}

function resolveMatchupFromInput(input, playerProfile, pros) {
  const matchFormat = input.matchFormat === 'doubles' ? 'doubles' : 'singles';
  const opponentProName = input.opponentProName?.trim();
  if (!opponentProName) {
    throw new Error('opponentProName is required');
  }

  const playerA = buildPlayerAPayload(playerProfile);
  const playerB = { proName: opponentProName };

  let partnerA = null;
  let partnerB = null;

  if (matchFormat === 'doubles') {
    const partnerProName = input.partnerProName?.trim();
    const opponentPartnerProName = input.opponentPartnerProName?.trim();
    if (!partnerProName || !opponentPartnerProName) {
      throw new Error('Doubles requires partnerProName and opponentPartnerProName');
    }
    partnerA = { proName: partnerProName };
    partnerB = { proName: opponentPartnerProName };
  }

  const resolvedA = resolveSide(playerA, partnerA, pros, {
    format: matchFormat,
    sideLabel: 'Your team',
  });
  const resolvedB = resolveSide(playerB, partnerB, pros, {
    format: matchFormat,
    sideLabel: 'Opponent team',
  });

  return { matchFormat, resolvedA, resolvedB };
}

function searchDuprByName(duprRankings, playerName, limit = 8) {
  if (!duprRankings) {
    return { available: false, message: 'DUPR rankings not loaded on server.' };
  }

  const q = playerName.toLowerCase().trim();
  const results = [];

  for (const { key, ageGroup, format, board } of iterateBoards(duprRankings)) {
    for (const p of board.players) {
      if (p.name.toLowerCase().includes(q)) {
        results.push({
          name: p.name,
          rating: p.rating,
          rank: p.rank,
          board: key,
          ageGroup,
          format,
        });
      }
    }
  }

  results.sort((a, b) => a.rank - b.rank);
  return { available: true, query: playerName, count: results.length, results: results.slice(0, limit) };
}

export async function executeCoachTool(name, input, ctx) {
  const { pros, duprRankings, playerProfile } = ctx;

  switch (name) {
    case 'get_player_profile':
      return summarizeProfile(playerProfile);

    case 'find_similar_pros': {
      if (!playerProfile?.vector && !playerProfile?.attributes) {
        return { error: 'No saved Player DNA profile. Complete the DNA assessment first.' };
      }
      const vector =
        playerProfile.vector ??
        ATTRIBUTE_KEYS.map((k) => playerProfile.attributes[k] ?? 0.5);
      const { matches, similarPlayers } = await runDnaMatching(
        vector,
        playerProfile.attributes,
        pros
      );
      return summarizeSimilarPlayers(matches, similarPlayers);
    }

    case 'list_pro_players': {
      const query = input.query?.toLowerCase().trim();
      let list = pros.map((p) => ({ name: p.name, archetype: p.archetype }));
      if (query) {
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.archetype?.toLowerCase().includes(query)
        );
      }
      return { count: list.length, pros: list.slice(0, 40) };
    }

    case 'analyze_matchup': {
      const { resolvedA, resolvedB, matchFormat } = resolveMatchupFromInput(
        input,
        playerProfile,
        pros
      );
      const analysis = analyzeMatchup(resolvedA, resolvedB, { matchFormat });
      return summarizeMatchup(analysis);
    }

    case 'search_dupr_rankings':
      return searchDuprByName(duprRankings, input.playerName, input.limit ?? 8);

    case 'get_dupr_rating_history': {
      const history = getPlayerHistory(
        input.playerName,
        input.format ?? null,
        input.ageGroup ?? null
      );
      return history;
    }

    case 'generate_scouting_report': {
      const { generateScoutingReport } = await import('../agent.js');
      const { resolvedA, resolvedB, matchFormat } = resolveMatchupFromInput(
        input,
        playerProfile,
        pros
      );
      const analysis = analyzeMatchup(resolvedA, resolvedB, { matchFormat });
      const scoutingReport = await generateScoutingReport(analysis, 'playerA');
      return {
        matchup: summarizeMatchup(analysis),
        scoutingReport,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
