/**
 * PROTOTYPE ONLY — scrapes public DUPR rankings HTML.
 * Not for production. Respect DUPR ToS; prefer official API/partner access when shipping.
 *
 * Usage: node scripts/scrape-dupr-rankings.js
 * Output: backend/data/dupr-rankings.json
 *
 * For daily history, use: npm run snapshot:dupr
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { fetchDuprRankings } from '../utils/duprScraper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'data', 'dupr-rankings.json');

async function main() {
  console.log('Fetching DUPR rankings...');
  const output = await fetchDuprRankings();

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUT_PATH}`);

  const { summary } = output;
  console.log(
    `  ${summary.boardsCount} boards, ${summary.totalEntries} entries, ${summary.uniquePlayers} unique players`
  );
  for (const ageGroup of ['open', 'senior', 'junior']) {
    for (const format of ['mens_doubles', 'womens_singles']) {
      const board = output.categories[ageGroup][format];
      console.log(
        `  ${ageGroup}/${format}: #1 ${board.players[0].name} (${board.players[0].rating})`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
