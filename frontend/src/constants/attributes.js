export const ATTRIBUTE_LABELS = {
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

export const ATTRIBUTE_SECTIONS = {
  kitchen: ['dink_consistency', 'patience', 'third_shot_drop', 'speed_up_tendency'],
  attack: ['aggression', 'power', 'net_presence', 'counter_attack'],
  defense: ['reset_ability', 'lob_usage', 'court_coverage', 'transition_play'],
  doubles: ['poach_tendency', 'return_pressure'],
};
