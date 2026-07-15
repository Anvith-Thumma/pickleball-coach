/**
 * Calibrate self-reported DNA against DUPR / skill level to reduce over/under-estimation.
 */

const SKILL_TO_DUPR = {
  beginner: 2.8,
  intermediate: 3.8,
  advanced: 4.8,
  competitive: 5.8,
  elite: 6.5,
};

export function resolveDuprRating(intake) {
  if (intake?.duprRating != null && !Number.isNaN(intake.duprRating)) {
    return Math.min(8, Math.max(2, intake.duprRating));
  }
  if (intake?.skillLevel && SKILL_TO_DUPR[intake.skillLevel]) {
    return SKILL_TO_DUPR[intake.skillLevel];
  }
  return null;
}

/** Expected overall skill floor from rating (2.0–7.5+ → ~0.22–0.95). */
export function ratingToBaseline(dupr) {
  const t = (dupr - 2.0) / (7.0 - 2.0);
  return Math.round(Math.min(0.95, Math.max(0.22, 0.22 + t * 0.7)) * 1000) / 1000;
}

function mean(values) {
  if (!values.length) return 0.5;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * @param {Record<string, number>} surveyAttributes - raw from questionnaire
 * @param {object} intake - biometrics + rating
 */
export function calibrateProfile(surveyAttributes, intake = {}) {
  const dupr = resolveDuprRating(intake);
  if (dupr == null) {
    return {
      attributes: surveyAttributes,
      calibration: null,
    };
  }

  const baseline = ratingToBaseline(dupr);
  const surveyMean = mean(Object.values(surveyAttributes));
  const gap = surveyMean - baseline;

  // Pull attributes toward rating-implied level when self-assessment diverges
  const strength = Math.min(0.45, Math.abs(gap) * 0.9);
  const direction = gap > 0 ? -1 : 1;

  const attributes = {};
  for (const [key, val] of Object.entries(surveyAttributes)) {
    const adjusted = val + direction * strength * Math.min(0.25, Math.abs(val - baseline));
    attributes[key] = Math.round(Math.min(1, Math.max(0, adjusted)) * 100) / 100;
  }

  const calibratedMean = mean(Object.values(attributes));

  let note;
  if (gap > 0.12) {
    note = 'Adjusted slightly down — your answers rated higher than your DUPR/skill level suggests.';
  } else if (gap < -0.12) {
    note = 'Adjusted slightly up — your answers rated lower than your DUPR/skill level suggests.';
  } else {
    note = 'Your self-assessment aligned well with your stated rating.';
  }

  return {
    attributes,
    calibration: {
      dupr,
      surveyMean: Math.round(surveyMean * 1000) / 1000,
      baseline: Math.round(baseline * 1000) / 1000,
      calibratedMean: Math.round(calibratedMean * 1000) / 1000,
      gap: Math.round(gap * 1000) / 1000,
      note,
    },
  };
}

export function buildFullProfile(answers, questions, attributeKeys, intake) {
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

  const rawAttributes = {};
  for (const key of attributeKeys) {
    const { total, count } = sums[key];
    const raw = count > 0 ? total / count : 0.5;
    rawAttributes[key] = Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100;
  }

  const { attributes, calibration } = calibrateProfile(rawAttributes, intake);
  const vector = attributeKeys.map((k) => attributes[k]);

  return {
    attributes,
    rawAttributes,
    vector,
    biometrics: intake,
    calibration,
  };
}
