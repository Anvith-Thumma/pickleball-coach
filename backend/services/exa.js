import Exa from 'exa-js';
import { attributesToProfileText, proToSearchText } from '../utils/profileText.js';

let client = null;

function getClient() {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey || apiKey === 'your_exa_api_key_here') {
    return null;
  }
  if (!client) {
    client = new Exa(apiKey);
  }
  return client;
}

export function isExaConfigured() {
  return Boolean(getClient());
}

/**
 * Semantic search for pro players / playing styles matching user profile.
 * @returns {{ results: Array<{ title, url, snippet, score }>, configured: boolean }}
 */
export async function searchSimilarPlayers(userAttributes) {
  const exa = getClient();
  if (!exa) {
    return { results: [], configured: false };
  }

  const query = `${attributesToProfileText(userAttributes)} Find professional pickleball players with similar playing style.`;

  const response = await exa.search(query, {
    type: 'auto',
    numResults: 10,
    category: 'news',
    highlights: { highlightsPerUrl: 2, numSentences: 2, query },
  });

  const results = (response.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.highlights?.[0] || r.text?.slice(0, 280) || '',
    score: r.score ?? null,
    publishedDate: r.publishedDate ?? null,
  }));

  return { results, configured: true };
}

/**
 * Score how well Exa results align with known pro names.
 * @param {Array<{ name: string }>} pros
 * @param {Array<{ title: string, url: string, snippet: string, score: number|null }>} exaResults
 */
export function scoreProsFromExaResults(pros, exaResults) {
  const nameScores = new Map();

  for (const pro of pros) {
    const fullLower = pro.name.toLowerCase();
    const parts = fullLower.split(/\s+/);
    let best = 0;

    for (let i = 0; i < exaResults.length; i++) {
      const r = exaResults[i];
      const hay = `${r.title} ${r.snippet} ${r.url}`.toLowerCase();
      const fullMatch = hay.includes(fullLower);
      // Require first + last name (avoids matching all "Waters" / "Johns" family)
      const firstLast =
        parts.length >= 2 &&
        hay.includes(parts[0]) &&
        hay.includes(parts[parts.length - 1]);
      if (!fullMatch && !firstLast) continue;

      const rankScore = 1 - i / Math.max(exaResults.length, 1);
      const exaScore = typeof r.score === 'number' ? r.score : 0.5;
      best = Math.max(best, rankScore * 0.6 + exaScore * 0.4);
    }

    nameScores.set(pro.name, best);
  }

  return nameScores;
}

export async function searchProContext(pro) {
  const exa = getClient();
  if (!exa) {
    return { results: [], configured: false };
  }

  const response = await exa.search(proToSearchText(pro), {
    type: 'fast',
    numResults: 3,
    highlights: { highlightsPerUrl: 1, numSentences: 2 },
  });

  return {
    configured: true,
    results: (response.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.highlights?.[0] || '',
    })),
  };
}
