import { ATTRIBUTE_KEYS } from '../similarity.js';
import { buildDuprLookup, loadDuprRankings, mergeDuprIntoPro } from '../services/playerResearch.js';

/**
 * Resolve API player payload to a normalized profile.
 * @param {{ proName?: string, name?: string, label?: string, attributes?: Record<string, number> }} payload
 * @param {Array} pros
 */
export function resolvePlayer(payload, pros) {
  if (!payload) {
    throw new Error('Player payload is required');
  }

  const duprLookup = buildDuprLookup(loadDuprRankings());

  if (payload.proName || payload.name) {
    const search = (payload.proName ?? payload.name).toLowerCase().trim();
    const pro = pros.find((p) => p.name.toLowerCase().trim() === search);
    if (!pro) {
      throw new Error(`Pro not found: ${payload.proName ?? payload.name}`);
    }
    const merged = mergeDuprIntoPro(pro, duprLookup);
    return {
      name: merged.name,
      label: payload.label ?? merged.name,
      archetype: merged.archetype,
      attributes: merged.attributes,
      dupr_rating: merged.dupr_rating ?? null,
      dupr_category: merged.dupr_category ?? null,
      bio_snippet: merged.bio_snippet,
    };
  }

  if (payload.attributes) {
    const attributes = Object.fromEntries(
      ATTRIBUTE_KEYS.map((key) => [key, payload.attributes[key] ?? 0.5])
    );
    return {
      name: payload.label ?? 'Custom Player',
      label: payload.label ?? 'Custom Player',
      archetype: payload.archetype ?? null,
      attributes,
      dupr_rating: payload.dupr_rating ?? null,
      dupr_category: null,
      bio_snippet: null,
    };
  }

  throw new Error('Provide proName or attributes for each player');
}
