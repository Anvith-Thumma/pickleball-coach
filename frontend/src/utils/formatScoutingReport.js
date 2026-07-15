const SECTION_KEYS = [
  { key: 'overview', labels: ['MATCHUP OVERVIEW', 'OVERVIEW'] },
  { key: 'advantages', labels: ['YOUR ADVANTAGES', 'ADVANTAGES'] },
  { key: 'threats', labels: ['OPPONENT THREATS', 'THREATS'] },
  { key: 'gamePlan', labels: ['GAME PLAN'] },
  { key: 'drills', labels: ['PREP DRILLS', 'DRILLS'] },
];

function cleanRawText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .trim();
}

function parseLabeledSections(text) {
  const upper = text.toUpperCase();
  const sections = {};
  const markers = [];

  for (const { key, labels } of SECTION_KEYS) {
    for (const label of labels) {
      const idx = upper.indexOf(`${label}:`);
      if (idx !== -1) {
        markers.push({ key, idx, labelLen: label.length + 1 });
        break;
      }
    }
  }

  markers.sort((a, b) => a.idx - b.idx);
  if (markers.length === 0) return null;

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].idx + markers[i].labelLen;
    const end = i + 1 < markers.length ? markers[i + 1].idx : text.length;
    sections[markers[i].key] = text.slice(start, end).trim();
  }

  return sections;
}

function bulletsFromBlock(block) {
  if (!block) return [];
  return block
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

export function formatScoutingReport(raw) {
  if (!raw?.trim()) return { mode: 'empty' };

  const cleaned = cleanRawText(raw);
  const sections = parseLabeledSections(cleaned);

  if (sections) {
    return {
      mode: 'structured',
      overview: sections.overview || '',
      advantages: bulletsFromBlock(sections.advantages),
      threats: bulletsFromBlock(sections.threats),
      gamePlan: bulletsFromBlock(sections.gamePlan),
      drills: bulletsFromBlock(sections.drills),
    };
  }

  return { mode: 'fallback', body: cleaned };
}
