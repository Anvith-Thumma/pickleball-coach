const TAVILY_URL = 'https://api.tavily.com/search';

const PICKLEBALL_DOMAINS = [
  'dupr.com',
  'ppatour.com',
  'pickleball.com',
  'pickleballtournaments.com',
  'thepickler.com',
  'pickleballunion.com',
];

const ADVICE_KEYWORDS =
  /drill|strateg|tip|how to|improve|train|technique|coach|lesson|practice|kitchen|dink|third shot|drop|reset|speed.?up|playstyle|develop|skill/i;

const LOW_VALUE_KEYWORDS =
  /^(?!.*(drill|tip|strateg|how to|improve|coach|lesson)).*(tournament draw|bracket results|prize pool|sponsor deal|signed with)/i;

function getApiKey() {
  const key = process.env.TAVILY_API_KEY;
  if (!key || key === 'your_tavily_api_key_here') {
    return null;
  }
  return key;
}

export function isTavilyConfigured() {
  return Boolean(getApiKey());
}

function filterAdviceSources(results) {
  return results
    .filter((r) => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      if (LOW_VALUE_KEYWORDS.test(text)) return false;
      return ADVICE_KEYWORDS.test(text);
    })
    .slice(0, 4);
}

/**
 * @param {string} query
 * @param {{ maxResults?: number, includeAnswer?: boolean }} [opts]
 */
export async function tavilySearch(query, opts = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { results: [], answer: null, configured: false };
  }

  const res = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: opts.maxResults ?? 8,
      include_answer: opts.includeAnswer ?? true,
      include_domains: PICKLEBALL_DOMAINS,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tavily error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return {
    configured: true,
    answer: data.answer ?? null,
    results: (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score,
    })),
  };
}

/**
 * Coaching-focused research: drills & strategy for users who match this pro's style.
 */
export async function researchPlaystyleAdvice(pro, userAttributes = null) {
  const styleHint = pro.archetype || 'all-court';
  const bio = pro.bio_snippet || '';

  let userHint = '';
  if (userAttributes) {
    const topTraits = Object.entries(userAttributes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k, v]) => k.replace(/_/g, ' '))
      .join(', ');
    userHint = ` The recreational player has high ${topTraits}.`;
  }

  const query = `pickleball drills strategy tips how to improve playing like ${pro.name} ${styleHint} style ${bio}${userHint} kitchen dinks third shot training for amateur players`;

  const data = await tavilySearch(query, { maxResults: 8, includeAnswer: true });
  const adviceResults = filterAdviceSources(data.results);
  const sources =
    adviceResults.length > 0 ? adviceResults : data.results.slice(0, 3);

  const summary =
    data.answer ||
    sources
      .map((r) => r.snippet)
      .join(' ')
      .slice(0, 500) ||
    null;

  return {
    research_summary: summary,
    sources: sources.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: (r.snippet || '').slice(0, 280),
      type: 'advice',
    })),
    configured: data.configured,
  };
}

/** @deprecated Use researchPlaystyleAdvice — kept for enrich script compatibility */
export async function researchProPlayer(name, userAttributes = null) {
  return researchPlaystyleAdvice(
    { name, archetype: '', bio_snippet: '' },
    userAttributes
  );
}
