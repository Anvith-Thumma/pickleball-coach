import { ATTRIBUTE_KEYS, cosineSimilarity } from '../similarity.js';
import { explainMatch } from '../utils/matchExplain.js';

/** Hand-tuned weights for interpretable style-edge scoring (prototype). */
const STYLE_EDGE_WEIGHTS = {
  net_presence: 0.11,
  aggression: 0.1,
  power: 0.09,
  reset_ability: 0.09,
  third_shot_drop: 0.08,
  dink_consistency: 0.08,
  patience: 0.07,
  speed_up_tendency: 0.07,
  court_coverage: 0.07,
  transition_play: 0.07,
  counter_attack: 0.07,
  return_pressure: 0.06,
  poach_tendency: 0.06,
  lob_usage: 0.05,
};

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Score competitive edge from attribute differentials (heuristic, not trained).
 */
function computeStyleEdge(attrsA, attrsB) {
  let rawScore = 0;
  const factors = [];

  for (const key of ATTRIBUTE_KEYS) {
    const a = attrsA[key] ?? 0.5;
    const b = attrsB[key] ?? 0.5;
    const delta = a - b;
    const weight = STYLE_EDGE_WEIGHTS[key] ?? 0.08;
    const contribution = delta * weight;
    rawScore += contribution;

    if (Math.abs(delta) >= 0.12) {
      factors.push({
        attribute: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        delta: Math.round(delta * 100) / 100,
        favors: delta > 0 ? 'playerA' : 'playerB',
        weight: Math.round(weight * 100) / 100,
      });
    }
  }

  factors.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const playerAWinProb = Math.round(sigmoid(rawScore * 4) * 1000) / 1000;
  const favored = playerAWinProb >= 0.5 ? 'playerA' : 'playerB';
  const confidence = Math.round(Math.abs(playerAWinProb - 0.5) * 2 * 100) / 100;

  return {
    favored,
    playerAWinProb,
    playerBWinProb: Math.round((1 - playerAWinProb) * 1000) / 1000,
    confidence,
    styleDistance: Math.round((1 - cosineSimilarity(
      ATTRIBUTE_KEYS.map((k) => attrsA[k] ?? 0.5),
      ATTRIBUTE_KEYS.map((k) => attrsB[k] ?? 0.5)
    )) * 1000) / 1000,
    keyFactors: factors.slice(0, 4),
    disclaimer:
      'Style advantage is a playing-style estimate from DNA attributes — not a prediction of who will win.',
  };
}

function buildTacticalNotes(attrsA, attrsB, playerALabel, playerBLabel, matchFormat = 'singles') {
  const notes = [];
  const aNet = attrsA.net_presence ?? 0.5;
  const bNet = attrsB.net_presence ?? 0.5;
  const aAgg = attrsA.aggression ?? 0.5;
  const bAgg = attrsB.aggression ?? 0.5;
  const aReset = attrsA.reset_ability ?? 0.5;
  const bReset = attrsB.reset_ability ?? 0.5;
  const aPat = attrsA.patience ?? 0.5;
  const aCoverage = attrsA.court_coverage ?? 0.5;
  const bCoverage = attrsB.court_coverage ?? 0.5;

  if (matchFormat === 'doubles') {
    if (aNet > bNet + 0.12) {
      notes.push(
        `${playerALabel} has the stronger net tandem — look to seize the kitchen and force the opposing team back.`
      );
    } else if (bNet > aNet + 0.12) {
      notes.push(
        `${playerBLabel} likely controls the NVZ — ${playerALabel} should reset, lob, and hunt counter-attack chances.`
      );
    }

    if (aCoverage > bCoverage + 0.12) {
      notes.push(`${playerALabel} covers more court — exploit open lanes and attack the weaker defender.`);
    } else if (bCoverage > aCoverage + 0.12) {
      notes.push(`${playerBLabel} has better team coverage — avoid targeting the middle; play to corners.`);
    }

    notes.push('Communicate switches and who takes the middle ball — doubles margins often come from team positioning.');
  } else {
    if (aNet > bNet + 0.15) {
      notes.push(`${playerALabel} should press the net and force speed-ups before ${playerBLabel} settles.`);
    } else if (bNet > aNet + 0.15) {
      notes.push(`${playerBLabel} owns the kitchen — ${playerALabel} should prioritize resets and lob pressure.`);
    }
  }

  if (aAgg > bAgg + 0.15 && bReset < 0.55) {
    notes.push(`${playerALabel} can attack mid-rally; ${playerBLabel} may struggle to neutralize pace.`);
  } else if (bAgg > aAgg + 0.15 && aReset < 0.55) {
    notes.push(`${playerBLabel} should look for early speed-ups against ${playerALabel}'s reset game.`);
  }

  if (aPat > 0.65 && bAgg > 0.65) {
    notes.push(`Patience vs aggression clash — longer dink rallies favor ${playerALabel}.`);
  }

  if (notes.length === 0) {
    notes.push('Similar styles — margins come from shot selection, not raw attributes.');
  }

  return notes;
}

/**
 * Full head-to-head analysis between two attribute profiles.
 */
export function analyzeMatchup(playerA, playerB, options = {}) {
  const matchFormat = options.matchFormat ?? playerA.format ?? playerB.format ?? 'singles';
  const attrsA = playerA.attributes;
  const attrsB = playerB.attributes;
  const labelA = playerA.label ?? playerA.name ?? 'Player A';
  const labelB = playerB.label ?? playerB.name ?? 'Player B';

  const explanation = explainMatch(attrsA, attrsB, { labelA, labelB });
  const styleEdge = computeStyleEdge(attrsA, attrsB);
  const tacticalNotes = buildTacticalNotes(attrsA, attrsB, labelA, labelB, matchFormat);

  const playerAEdges = explanation.attributeDeltas
    .filter((r) => r.advantage === 'a' && r.diff >= 0.1)
    .sort((x, y) => y.diff - x.diff)
    .slice(0, 3)
    .map((r) => ({ attribute: r.key, label: r.label, margin: Math.round(r.diff * 100) }));

  const playerBEdges = explanation.attributeDeltas
    .filter((r) => r.advantage === 'b' && r.diff >= 0.1)
    .sort((x, y) => y.diff - x.diff)
    .slice(0, 3)
    .map((r) => ({ attribute: r.key, label: r.label, margin: Math.round(r.diff * 100) }));

  return {
    matchFormat,
    playerA: {
      name: labelA,
      attributes: attrsA,
      archetype: playerA.archetype ?? null,
      members: playerA.members ?? null,
    },
    playerB: {
      name: labelB,
      attributes: attrsB,
      archetype: playerB.archetype ?? null,
      members: playerB.members ?? null,
    },
    explanation,
    styleEdge,
    playerAEdges,
    playerBEdges,
    tacticalNotes,
    metricGuide: {
      styleAlignment:
        'How similar your playing styles are (0–100%). High = mirror match; low = very different approaches.',
      styleAdvantage:
        'Which side’s attribute profile fits better in a style clash. This is NOT a win probability — it shows who has the stylistic edge on paper.',
      attributeEdges:
        'Specific skills where one side scores meaningfully higher (e.g. net game, resets). Use these to plan tactics.',
      clashProfile:
        'A plain-language read on whether this is a mirror match, complementary styles, or a sharp contrast.',
    },
    clashProfile:
      styleEdge.styleDistance < 0.25
        ? 'Mirror match — small tactical adjustments decide rallies.'
        : styleEdge.styleDistance < 0.45
          ? 'Complementary styles — each player has clear lanes to attack.'
          : 'Contrasting styles — game plan matters more than raw consistency.',
  };
}
