export function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

export const ATTRIBUTE_KEYS = [
  'dink_consistency',
  'aggression',
  'net_presence',
  'power',
  'reset_ability',
  'third_shot_drop',
  'patience',
  'speed_up_tendency',
  'lob_usage',
  'court_coverage',
  'transition_play',
  'counter_attack',
  'return_pressure',
  'poach_tendency',
];

export function proToVector(pro) {
  return ATTRIBUTE_KEYS.map((key) => pro.attributes[key]);
}

export function findTopMatches(userVector, pros, topN = 3) {
  const scored = pros.map((pro) => ({
    pro,
    score: cosineSimilarity(userVector, proToVector(pro)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(({ pro, score }) => ({
    name: pro.name,
    archetype: pro.archetype,
    bio_snippet: pro.bio_snippet,
    attributes: pro.attributes,
    similarity: Math.round(score * 1000) / 1000,
    dupr_rating: pro.dupr_rating ?? null,
    dupr_category: pro.dupr_category ?? null,
    dupr_rank: pro.dupr_rank ?? null,
    research_summary: pro.research_summary ?? null,
    sources: pro.sources ?? [],
  }));
}

/** Blend cosine (0–1) and Exa semantic (0–1) into final rank score. */
export function blendScores(cosineScore, semanticScore, cosineWeight = 0.55) {
  const sem = semanticScore ?? 0;
  return cosineWeight * cosineScore + (1 - cosineWeight) * sem;
}
