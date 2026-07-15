/**
 * Prevent closely related pros (e.g. Leigh Waters + Anna Leigh Waters) from
 * appearing together in top match results.
 */

/** Pros that should not appear together in top-N (family / household). */
const EXCLUSIVE_GROUPS = [
  ['Anna Leigh Waters', 'Leigh Waters'],
  ['Ben Johns', 'Collin Johns'],
  ['Johanna Johns', 'Collin Johns'],
  ['JW Johnson', 'Hunter Johnson', 'Jorja Johnson'],
  ['Jackie Kawamoto', 'Jade Kawamoto'],
];

function normalize(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function lastName(name) {
  const parts = normalize(name).split(' ');
  return parts[parts.length - 1] || '';
}

/**
 * True if two pros should not both appear in the same top-match list.
 */
export function areConflictingMatches(nameA, nameB) {
  const a = normalize(nameA);
  const b = normalize(nameB);
  if (a === b) return true;

  for (const group of EXCLUSIVE_GROUPS) {
    const ga = group.map(normalize);
    if (ga.includes(a) && ga.includes(b)) return true;
  }

  if (lastName(nameA) !== lastName(nameB)) return false;

  // Same last name and one full name contained in the other (e.g. "leigh waters" in "anna leigh waters")
  if (a.includes(b) || b.includes(a)) return true;

  return false;
}

/**
 * Greedily pick top matches, skipping names that conflict with already selected.
 * @param {Array<{ name: string, combinedScore?: number, similarity?: number }>} ranked - sorted best-first
 * @param {number} count
 */
export function selectUniqueMatches(ranked, count = 3) {
  const selected = [];

  for (const match of ranked) {
    const conflicts = selected.some((s) =>
      areConflictingMatches(s.name, match.name)
    );
    if (conflicts) continue;
    selected.push(match);
    if (selected.length >= count) break;
  }

  return selected;
}
