import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { iterateBoards } from '../utils/duprScraper.js';
import { countTotalPlayers } from './duprBoards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const HISTORY_DIR = join(DATA_DIR, 'dupr-history');
const INDEX_PATH = join(HISTORY_DIR, 'index.json');
const LATEST_PATH = join(DATA_DIR, 'dupr-rankings.json');

function ensureHistoryDir() {
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

function loadIndex() {
  ensureHistoryDir();
  if (!existsSync(INDEX_PATH)) {
    return { snapshots: [] };
  }
  return JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
}

function saveIndex(index) {
  ensureHistoryDir();
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

/**
 * Append a rankings scrape to history (one file per calendar day).
 * @param {object} rankingsPayload - output from fetchDuprRankings()
 */
export function saveSnapshot(rankingsPayload) {
  ensureHistoryDir();

  const date = rankingsPayload.scrapedAt.slice(0, 10);
  const filename = `${date}.json`;
  const filePath = join(HISTORY_DIR, filename);

  writeFileSync(filePath, JSON.stringify(rankingsPayload, null, 2));
  writeFileSync(LATEST_PATH, JSON.stringify(rankingsPayload, null, 2));

  const index = loadIndex();
  const existing = index.snapshots.findIndex((s) => s.date === date);

  const entry = {
    date,
    scrapedAt: rankingsPayload.scrapedAt,
    file: filename,
    playerCount: countTotalPlayers(rankingsPayload),
    boardsCount: rankingsPayload.summary?.boardsCount ?? 12,
    uniquePlayers: rankingsPayload.summary?.uniquePlayers ?? null,
  };

  if (existing >= 0) {
    index.snapshots[existing] = entry;
  } else {
    index.snapshots.push(entry);
  }

  index.snapshots.sort((a, b) => a.date.localeCompare(b.date));
  saveIndex(index);

  return { date, filePath, updated: existing >= 0 };
}

export function listSnapshots() {
  const index = loadIndex();
  return {
    count: index.snapshots.length,
    snapshots: index.snapshots,
    latestDate: index.snapshots.at(-1)?.date ?? null,
  };
}

/**
 * Rating time series for a player across stored snapshots.
 */
export function getPlayerHistory(playerName, category = null, ageGroup = null) {
  ensureHistoryDir();
  const index = loadIndex();
  const normalized = playerName.toLowerCase().trim();
  const series = [];

  for (const snap of index.snapshots) {
    const filePath = join(HISTORY_DIR, snap.file);
    if (!existsSync(filePath)) continue;

    const data = JSON.parse(readFileSync(filePath, 'utf-8'));

    for (const { ageGroup: ag, format, key, board } of iterateBoards(data)) {
      if (category && format !== category && key !== category) continue;
      if (ageGroup && ag !== ageGroup) continue;

      const player = board.players?.find(
        (p) => p.name.toLowerCase().trim() === normalized
      );
      if (player) {
        series.push({
          date: snap.date,
          scrapedAt: snap.scrapedAt,
          board: key,
          ageGroup: ag,
          format,
          rank: player.rank,
          rating: player.rating,
          age: player.age,
        });
      }
    }
  }

  return {
    playerName,
    category: category ?? 'all_boards',
    ageGroup: ageGroup ?? 'all',
    dataPoints: series.length,
    series,
    ratingDelta:
      series.length >= 2
        ? Math.round((series.at(-1).rating - series[0].rating) * 1000) / 1000
        : null,
  };
}

/** Bootstrap index from existing snapshot files if index is empty. */
export function rebuildIndexFromFiles() {
  ensureHistoryDir();
  const files = readdirSync(HISTORY_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();

  const snapshots = files.map((file) => {
    const data = JSON.parse(readFileSync(join(HISTORY_DIR, file), 'utf-8'));
    return {
      date: file.replace('.json', ''),
      scrapedAt: data.scrapedAt,
      file,
      playerCount: countTotalPlayers(data),
      boardsCount: data.summary?.boardsCount ?? 12,
    };
  });

  saveIndex({ snapshots });
  return snapshots.length;
}
