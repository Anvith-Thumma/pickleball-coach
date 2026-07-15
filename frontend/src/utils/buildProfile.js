/**
 * Build normalized attribute profile from assessment answers.
 */
export function buildProfile(answers, questions, attributeKeys) {
  const sums = Object.fromEntries(attributeKeys.map((k) => [k, { total: 0, count: 0 }]));

  questions.forEach((q, idx) => {
    const option = q.options[answers[idx]];
    if (!option?.weights) return;
    for (const [key, val] of Object.entries(option.weights)) {
      if (sums[key]) {
        sums[key].total += val;
        sums[key].count += 1;
      }
    }
  });

  const attributes = {};
  for (const key of attributeKeys) {
    const { total, count } = sums[key];
    const raw = count > 0 ? total / count : 0.5;
    attributes[key] = Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100;
  }

  const vector = attributeKeys.map((k) => attributes[k]);
  return { attributes, vector };
}
