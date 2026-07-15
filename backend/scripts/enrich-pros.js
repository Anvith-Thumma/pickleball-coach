/**
 * Batch-enrich pros.json with DUPR ratings + Tavily research.
 * Usage: npm run enrich:pros
 * Output: backend/data/pros-enriched.json
 */

import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { researchPlaystyleAdvice, isTavilyConfigured } from '../services/tavily.js';
import { buildDuprLookup, loadDuprRankings, mergeDuprIntoPro } from '../services/playerResearch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', '.env') });
const DATA_DIR = join(__dirname, '..', 'data');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const prosPath = join(DATA_DIR, 'pros.json');
  const outPath = join(DATA_DIR, 'pros-enriched.json');

  const { pros } = JSON.parse(readFileSync(prosPath, 'utf-8'));
  const duprLookup = buildDuprLookup(loadDuprRankings());

  console.log(`Enriching ${pros.length} pros...`);
  console.log(`Tavily: ${isTavilyConfigured() ? 'enabled' : 'skipped (no API key)'}`);
  console.log(`DUPR lookup: ${duprLookup.size} names matched in rankings\n`);

  const enriched = [];

  for (let i = 0; i < pros.length; i++) {
    const pro = pros[i];
    let record = mergeDuprIntoPro(pro, duprLookup);

    if (isTavilyConfigured()) {
      try {
        console.log(`[${i + 1}/${pros.length}] Tavily: ${pro.name}`);
        const research = await researchPlaystyleAdvice(pro);
        record = {
          ...record,
          research_summary: research.research_summary,
          sources: research.sources,
          enriched_at: new Date().toISOString(),
        };
        await delay(1100);
      } catch (err) {
        console.warn(`  Tavily failed for ${pro.name}:`, err.message);
      }
    } else {
      record.enriched_at = record.enriched_at ?? null;
    }

    enriched.push(record);
  }

  const output = {
    enrichedAt: new Date().toISOString(),
    source: prosPath,
    pros: enriched,
  };

  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
