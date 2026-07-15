import { ATTRIBUTE_KEYS } from '../similarity.js';

const ATTRIBUTE_PHRASES = {
  dink_consistency: 'dink consistency',
  aggression: 'aggression and attacking intent',
  net_presence: 'net presence and kitchen dominance',
  power: 'power on drives and put-aways',
  reset_ability: 'defensive reset ability',
  third_shot_drop: 'third shot drop preference',
  patience: 'rally patience',
  speed_up_tendency: 'speed-up tendency at the kitchen',
  lob_usage: 'lob usage',
  court_coverage: 'court coverage and mobility',
};

export function attributesToProfileText(attributes) {
  const lines = ATTRIBUTE_KEYS.map((key) => {
    const val = attributes[key] ?? 0.5;
    const level = val >= 0.75 ? 'high' : val >= 0.45 ? 'moderate' : 'low';
    return `${ATTRIBUTE_PHRASES[key]}: ${level} (${val.toFixed(2)})`;
  });

  return `Pickleball player profile with ${lines.join('; ')}.`;
}

export function proToSearchText(pro) {
  const attrs = pro.attributes
    ? Object.entries(pro.attributes)
        .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`)
        .join(', ')
    : '';
  return `${pro.name} professional pickleball player, archetype ${pro.archetype}. ${pro.bio_snippet || ''} Playing style: ${attrs}`;
}
