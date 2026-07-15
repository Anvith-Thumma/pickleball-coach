/**
 * Normalize Claude DNA output into structured sections for styled UI.
 */

const SECTION_KEYS = [
  { key: 'archetype', labels: ['ARCHETYPE', 'YOUR ARCHETYPE', 'PLAYER ARCHETYPE'] },
  { key: 'strengths', labels: ['STRENGTHS', 'SIGNATURE STRENGTHS', 'YOUR STRENGTHS'] },
  { key: 'growth', labels: ['GROWTH', 'GROWTH EDGES', 'AREAS TO GROW', 'DEVELOPMENT'] },
  { key: 'nextLevel', labels: ['NEXT LEVEL', 'NEXT LEVEL MISSION', 'YOUR MISSION'] },
];

function cleanRawText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/[🧬🔬⚡🎯📊🏓]/gu, '')
    .replace(/^(player dna report|dna report)\s*$/gim, '')
    .trim();
}

function parseLabeledSections(text) {
  const upper = text.toUpperCase();
  const sections = { archetype: '', strengths: '', growth: '', nextLevel: '', body: text };
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

  if (markers.length === 0) {
    return null;
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].idx + markers[i].labelLen;
    const end = i + 1 < markers.length ? markers[i + 1].idx : text.length;
    const content = text.slice(start, end).trim();
    sections[markers[i].key] = content;
  }

  delete sections.body;
  return sections;
}

function parseFallbackParagraphs(text) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  if (blocks.length === 0) return { paragraphs: [text] };
  if (blocks.length === 1) return { paragraphs: blocks };

  return {
    title: blocks[0].length < 120 ? blocks[0] : null,
    paragraphs: blocks[0].length < 120 ? blocks.slice(1) : blocks,
  };
}

function bulletsFromBlock(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  return bullets.length > 0 ? bullets : null;
}

export function formatDnaReport(raw) {
  if (!raw?.trim()) return { mode: 'empty' };

  const cleaned = cleanRawText(raw);
  const labeled = parseLabeledSections(cleaned);

  if (labeled) {
    return {
      mode: 'structured',
      archetype: labeled.archetype?.replace(/^[-•]\s*/, '') || '',
      strengths: bulletsFromBlock(labeled.strengths) || [labeled.strengths].filter(Boolean),
      growth: bulletsFromBlock(labeled.growth) || [labeled.growth].filter(Boolean),
      nextLevel: labeled.nextLevel || '',
    };
  }

  const fallback = parseFallbackParagraphs(cleaned);
  const last = fallback.paragraphs[fallback.paragraphs.length - 1];
  const rest = fallback.paragraphs.slice(0, -1);

  return {
    mode: 'fallback',
    title: fallback.title || rest[0] || '',
    paragraphs: fallback.title ? rest : rest.slice(1),
    nextLevel: last?.toLowerCase().includes('next') ? last : null,
    allParagraphs: fallback.paragraphs,
  };
}
