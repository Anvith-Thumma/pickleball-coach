import { ATTRIBUTE_KEYS } from '../similarity.js';

const ATTRIBUTE_LABELS = {
  dink_consistency: 'Dink Consistency',
  aggression: 'Aggression',
  net_presence: 'Net Presence',
  power: 'Power',
  reset_ability: 'Reset Ability',
  third_shot_drop: '3rd Shot Drop',
  patience: 'Patience',
  speed_up_tendency: 'Speed-Up',
  lob_usage: 'Lob Usage',
  court_coverage: 'Court Coverage',
  transition_play: 'Transition Play',
  counter_attack: 'Counter Attack',
  return_pressure: 'Return Pressure',
  poach_tendency: 'Poach Tendency',
};

/**
 * Explain why two attribute profiles match or diverge.
 * @param {Record<string, number>} attrsA
 * @param {Record<string, number>} attrsB
 * @param {{ labelA?: string, labelB?: string }} opts
 */
export function explainMatch(attrsA, attrsB, opts = {}) {
  const labelA = opts.labelA ?? 'You';
  const labelB = opts.labelB ?? 'Opponent';

  const rows = ATTRIBUTE_KEYS.map((key) => {
    const a = attrsA[key] ?? 0.5;
    const b = attrsB[key] ?? 0.5;
    const diff = Math.abs(a - b);
    const alignment = 1 - diff;
    return {
      key,
      label: ATTRIBUTE_LABELS[key] ?? key,
      a: Math.round(a * 100) / 100,
      b: Math.round(b * 100) / 100,
      diff: Math.round(diff * 100) / 100,
      alignment: Math.round(alignment * 1000) / 1000,
      advantage: diff < 0.08 ? 'even' : a > b ? 'a' : 'b',
    };
  });

  const topAlignments = [...rows].sort((x, y) => y.alignment - x.alignment).slice(0, 3);
  const topGaps = [...rows].sort((x, y) => y.diff - x.diff).slice(0, 2);

  const overallAlignment =
    rows.reduce((sum, r) => sum + r.alignment, 0) / Math.max(rows.length, 1);

  const alignmentSummary = topAlignments
    .map((r) => `${r.label} (${Math.round(r.alignment * 100)}% aligned)`)
    .join(', ');

  const gapSummary = topGaps
    .map((r) => {
      const leader = r.advantage === 'a' ? labelA : labelB;
      return `${r.label} (+${Math.round(r.diff * 100)}% ${leader})`;
    })
    .join(', ');

  return {
    overallAlignmentPct: Math.round(overallAlignment * 100),
    topAlignments: topAlignments.map((r) => ({
      attribute: r.key,
      label: r.label,
      alignmentPct: Math.round(r.alignment * 100),
      yourValue: r.a,
      theirValue: r.b,
    })),
    topGaps: topGaps.map((r) => ({
      attribute: r.key,
      label: r.label,
      gapPct: Math.round(r.diff * 100),
      leader: r.advantage === 'a' ? labelA : labelB,
    })),
    attributeDeltas: rows,
    summary: `Strongest alignment in ${alignmentSummary}. Biggest gaps: ${gapSummary}.`,
  };
}
