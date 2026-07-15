/**
 * Light formatting for coach chat — bullets, bold, paragraphs.
 * No full markdown parser; keeps bundle small.
 */

function stripMarkdownArtifacts(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/^#+\s*/gm, '')
    .replace(/^---+$/gm, '')
    .trim();
}

function isBulletLine(line) {
  return /^(\d+\.|[-•*])\s+/.test(line.trim());
}

function cleanBullet(line) {
  return line.trim().replace(/^(\d+\.|[-•*])\s+/, '');
}

function parseInline(text) {
  const parts = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    parts.push({ type: 'bold', value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}

export function formatChatMessage(raw) {
  if (!raw?.trim()) return { blocks: [] };

  const cleaned = stripMarkdownArtifacts(raw);
  const paragraphs = cleaned.split(/\n\n+/).filter(Boolean);
  const blocks = [];

  for (const para of paragraphs) {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
    const allBullets = lines.length > 0 && lines.every(isBulletLine);

    if (allBullets) {
      blocks.push({
        type: 'list',
        items: lines.map((l) => ({ parts: parseInline(cleanBullet(l)) })),
      });
    } else if (lines.length > 1 && lines.some(isBulletLine)) {
      for (const line of lines) {
        if (isBulletLine(line)) {
          blocks.push({
            type: 'list',
            items: [{ parts: parseInline(cleanBullet(line)) }],
          });
        } else {
          blocks.push({ type: 'paragraph', parts: parseInline(line) });
        }
      }
    } else {
      blocks.push({
        type: 'paragraph',
        parts: parseInline(lines.join(' ')),
      });
    }
  }

  return { blocks };
}

/** Strip skill-level prefix from stored user messages for display. */
export function displayUserMessage(content) {
  return content.replace(/^\[Skill level:\s*\w+\]\s*/i, '').trim();
}
