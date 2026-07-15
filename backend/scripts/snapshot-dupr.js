/**
 * Daily DUPR snapshot — appends to dupr-history/ and refreshes dupr-rankings.json.
 *
 * Usage: node scripts/snapshot-dupr.js
 * Cron example: 0 6 * * * cd /path/to/backend && node scripts/snapshot-dupr.js
 */

import { fetchDuprRankings } from '../utils/duprScraper.js';
import { saveSnapshot, listSnapshots } from '../services/duprHistory.js';

async function main() {
  console.log('Fetching DUPR rankings snapshot...');
  const rankings = await fetchDuprRankings();
  const result = saveSnapshot(rankings);

  console.log(
    result.updated
      ? `Updated snapshot for ${result.date}`
      : `Saved new snapshot for ${result.date}`
  );
  console.log(`  File: ${result.filePath}`);

  const { count, latestDate } = listSnapshots();
  console.log(`  History: ${count} snapshot(s), latest ${latestDate}`);

  const { summary } = rankings;
  console.log(
    `  ${summary.boardsCount} boards, ${summary.uniquePlayers} unique players across demographics`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
