import { ATTRIBUTE_KEYS } from '../similarity.js';
import { resolvePlayer } from './resolvePlayer.js';

/** Attributes where the stronger player typically drives team play. */
const PEAK_ATTRS = new Set([
  'net_presence',
  'aggression',
  'power',
  'speed_up_tendency',
]);

/**
 * Blend two player profiles into a doubles team vector.
 */
export function blendTeamAttributes(attrsA, attrsB) {
  const blended = {};
  for (const key of ATTRIBUTE_KEYS) {
    const a = attrsA[key] ?? 0.5;
    const b = attrsB[key] ?? 0.5;
    blended[key] =
      PEAK_ATTRS.has(key)
        ? Math.max(a, b)
        : Math.round(((a + b) / 2) * 1000) / 1000;
  }
  return blended;
}

/**
 * Resolve one side of a matchup (singles player or doubles team).
 */
export function resolveSide(primaryPayload, partnerPayload, pros, { format, sideLabel }) {
  const primary = resolvePlayer(primaryPayload, pros);

  if (format !== 'doubles' || !partnerPayload) {
    return {
      name: primary.label ?? primary.name,
      label: primary.label ?? primary.name,
      archetype: primary.archetype,
      attributes: primary.attributes,
      members: [{ name: primary.name, archetype: primary.archetype, role: 'player' }],
      format: 'singles',
    };
  }

  const partner = resolvePlayer(partnerPayload, pros);
  const teamName = `${primary.label ?? primary.name} & ${partner.name}`;

  return {
    name: teamName,
    label: sideLabel ?? teamName,
    archetype: `${primary.archetype ?? 'Player'} + ${partner.archetype ?? 'Partner'}`,
    attributes: blendTeamAttributes(primary.attributes, partner.attributes),
    members: [
      { name: primary.name, archetype: primary.archetype, role: 'primary' },
      { name: partner.name, archetype: partner.archetype, role: 'partner' },
    ],
    format: 'doubles',
  };
}
