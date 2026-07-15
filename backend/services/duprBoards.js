import { AGE_GROUPS, FORMATS, flatCategoryKey, iterateBoards } from '../utils/duprScraper.js';

export { AGE_GROUPS, FORMATS, flatCategoryKey };

export function listBoardKeys(rankings) {
  return [...iterateBoards(rankings)].map((b) => b.key);
}

export function getBoard(rankings, { ageGroup = 'open', format, category, key }) {
  if (!rankings) return null;

  if (key && rankings.all?.[key]) {
    return rankings.all[key];
  }

  const formatKey = format ?? category;
  if (!formatKey) return null;

  if (rankings.categories?.[ageGroup]?.[formatKey]) {
    return rankings.categories[ageGroup][formatKey];
  }

  const flatKey = flatCategoryKey(ageGroup, formatKey);
  return rankings.all?.[flatKey] ?? rankings.open?.[formatKey] ?? null;
}

export function countTotalPlayers(rankings) {
  return [...iterateBoards(rankings)].reduce((sum, b) => sum + b.board.players.length, 0);
}
