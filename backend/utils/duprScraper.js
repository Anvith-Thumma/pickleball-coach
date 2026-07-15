/**
 * Shared DUPR rankings scrape logic (prototype — public HTML only).
 *
 * Public page exposes 12 top-50 boards:
 *   open / senior / junior  ×  men's doubles, women's doubles, men's singles, women's singles
 *
 * Not on the public rankings page (in-app subscores / partner API only):
 *   mixed doubles, 50+, 65+, and other age-band ratings
 */

export const RANKINGS_URL = 'https://www.dupr.com/rankings';

export const AGE_GROUPS = ['open', 'senior', 'junior'];

export const FORMATS = [
  { key: 'mens_doubles', label: "Men's Doubles" },
  { key: 'womens_doubles', label: "Women's Doubles" },
  { key: 'mens_singles', label: "Men's Singles" },
  { key: 'womens_singles', label: "Women's Singles" },
];

/** Flat key used in legacy `all` map */
export function flatCategoryKey(ageGroup, formatKey) {
  return ageGroup === 'open' ? formatKey : `${ageGroup}_${formatKey}`;
}

const PLAYER_ROW_RE =
  /class="heading-table name">([^<]+)<\/div>[\s\S]*?fs-cmsfilter-field="age"[^>]*>(\d+)<[\s\S]*?class="heading-table right">([\d.]+)</g;

const COLLECTION_SPLIT = 'post_list ranking-collection w-dyn-items';

/**
 * Parse player rows from one leaderboard HTML chunk.
 */
export function parsePlayersFromChunk(chunkHtml) {
  const players = [];
  let m;
  while ((m = PLAYER_ROW_RE.exec(chunkHtml)) !== null) {
    players.push({
      rank: players.length + 1,
      name: m[1].trim(),
      age: parseInt(m[2], 10),
      rating: parseFloat(m[3]),
    });
  }
  return players;
}

/**
 * Split page HTML into 12 ranking collection blocks (Open/Senior/Junior × 4 formats).
 */
export function parseRankingSections(html) {
  const parts = html.split(COLLECTION_SPLIT);
  if (parts.length < 13) {
    throw new Error(
      `Expected 12 ranking sections, found ${parts.length - 1}. Page structure may have changed.`
    );
  }

  const sections = [];
  let sectionIndex = 0;

  for (const ageGroup of AGE_GROUPS) {
    for (const format of FORMATS) {
      sectionIndex += 1;
      const chunk = parts[sectionIndex];
      const players = parsePlayersFromChunk(chunk);

      if (players.length === 0) {
        throw new Error(`No players parsed for ${ageGroup} ${format.key} (section ${sectionIndex})`);
      }

      sections.push({
        key: flatCategoryKey(ageGroup, format.key),
        ageGroup,
        format: format.key,
        label: format.label,
        players,
      });
    }
  }

  return sections;
}

/**
 * Build nested + flat category maps from parsed sections.
 */
export function buildCategoryMaps(sections) {
  const categories = Object.fromEntries(AGE_GROUPS.map((g) => [g, {}]));
  const all = {};

  for (const section of sections) {
    const board = {
      label: section.label,
      ageGroup: section.ageGroup,
      format: section.format,
      playerCount: section.players.length,
      players: section.players,
    };

    categories[section.ageGroup][section.format] = board;
    all[section.key] = board;
  }

  const allNames = sections.flatMap((s) => s.players.map((p) => p.name));
  const uniquePlayers = new Set(allNames).size;

  return {
    categories,
    all,
    summary: {
      boardsCount: sections.length,
      totalEntries: allNames.length,
      uniquePlayers,
      ageGroups: AGE_GROUPS,
      formats: FORMATS.map((f) => f.key),
      playersPerBoard: sections[0]?.players.length ?? 0,
      notOnPublicPage: [
        'mixed_doubles',
        'age_50_plus',
        'age_65_plus',
        'career_high',
        'format_subscores',
      ],
      note:
        'Public rankings page lists top 50 per board for Open, Senior, and Junior only. Mixed doubles and 50+/65+ age-band ratings require the DUPR app or Partner API.',
    },
  };
}

export async function fetchDuprRankings() {
  const res = await fetch(RANKINGS_URL, {
    headers: {
      'User-Agent': 'PickleballCoach-Prototype/1.0 (dev scraper)',
      Accept: 'text/html',
      'Cache-Control': 'no-cache',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const sections = parseRankingSections(html);
  const { categories, all, summary } = buildCategoryMaps(sections);

  return {
    source: RANKINGS_URL,
    scrapedAt: new Date().toISOString(),
    disclaimer: 'PROTOTYPE — scraped from public rankings page. Not affiliated with DUPR.',
    summary,
    categories,
    /** @deprecated use `categories` — kept for backward compatibility */
    open: categories.open,
    all,
  };
}

/**
 * Iterate every board in a rankings payload.
 */
export function* iterateBoards(rankings) {
  if (rankings?.categories) {
    for (const ageGroup of AGE_GROUPS) {
      const group = rankings.categories[ageGroup];
      if (!group) continue;
      for (const format of FORMATS) {
        const board = group[format.key];
        if (board?.players?.length) {
          yield { ageGroup, format: format.key, key: flatCategoryKey(ageGroup, format.key), board };
        }
      }
    }
    return;
  }

  if (rankings?.all) {
    for (const [key, board] of Object.entries(rankings.all)) {
      if (board?.players?.length) {
        yield {
          ageGroup: board.ageGroup ?? 'open',
          format: board.format ?? key,
          key,
          board,
        };
      }
    }
  }
}
