/**
 * Add extended DNA attributes to all pros + append new player profiles.
 * Usage: node scripts/migrate-pro-attributes.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ATTRIBUTE_KEYS } from '../similarity.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROS_PATH = join(__dirname, '..', 'data', 'pros.json');

function round(n) {
  return Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
}

/** Seed new dimensions from existing profile (tuned heuristics). */
export function deriveExtendedAttributes(attrs) {
  const a = attrs;
  return {
    transition_play: round(
      0.35 * (a.reset_ability ?? 0.5) +
        0.35 * (a.court_coverage ?? 0.5) +
        0.3 * (a.third_shot_drop ?? 0.5)
    ),
    counter_attack: round(
      0.4 * (a.aggression ?? 0.5) +
        0.35 * (a.speed_up_tendency ?? 0.5) +
        0.25 * (a.power ?? 0.5)
    ),
    return_pressure: round(
      0.35 * (a.power ?? 0.5) +
        0.35 * (a.aggression ?? 0.5) +
        0.3 * (1 - (a.patience ?? 0.5))
    ),
    poach_tendency: round(
      0.45 * (a.net_presence ?? 0.5) +
        0.35 * (a.court_coverage ?? 0.5) +
        0.2 * (a.aggression ?? 0.5)
    ),
  };
}

function fullAttributes(base) {
  const merged = { ...base, ...deriveExtendedAttributes(base) };
  for (const key of ATTRIBUTE_KEYS) {
    if (merged[key] == null) merged[key] = 0.5;
  }
  return merged;
}

const NEW_PROS = [
  {
    name: 'Will Howells',
    archetype: 'The Grinder',
    bio_snippet: 'Relentless consistency and depth — wears opponents down in long rallies',
    attributes: {
      dink_consistency: 0.91, aggression: 0.62, net_presence: 0.84, power: 0.78,
      reset_ability: 0.89, third_shot_drop: 0.86, patience: 0.92, speed_up_tendency: 0.48,
      lob_usage: 0.38, court_coverage: 0.88, transition_play: 0.87, counter_attack: 0.58,
      return_pressure: 0.65, poach_tendency: 0.72,
    },
  },
  {
    name: 'Eric Oncins',
    archetype: 'The Lefty Wizard',
    bio_snippet: 'Angles and spin from the left side, creates chaos with variety',
    attributes: {
      dink_consistency: 0.88, aggression: 0.78, net_presence: 0.89, power: 0.84,
      reset_ability: 0.82, third_shot_drop: 0.76, patience: 0.72, speed_up_tendency: 0.76,
      lob_usage: 0.42, court_coverage: 0.90, transition_play: 0.83, counter_attack: 0.80,
      return_pressure: 0.78, poach_tendency: 0.85,
    },
  },
  {
    name: 'Noe Khlif',
    archetype: 'The French Flash',
    bio_snippet: 'Explosive hands and athletic counters at the kitchen',
    attributes: {
      dink_consistency: 0.85, aggression: 0.86, net_presence: 0.91, power: 0.88,
      reset_ability: 0.80, third_shot_drop: 0.70, patience: 0.65, speed_up_tendency: 0.88,
      lob_usage: 0.28, court_coverage: 0.92, transition_play: 0.82, counter_attack: 0.90,
      return_pressure: 0.82, poach_tendency: 0.88,
    },
  },
  {
    name: 'Jaume Martinez Vich',
    archetype: 'The Spanish Maestro',
    bio_snippet: 'Touch and tactical variety — constructs points with craft over pace',
    attributes: {
      dink_consistency: 0.94, aggression: 0.60, net_presence: 0.86, power: 0.72,
      reset_ability: 0.91, third_shot_drop: 0.92, patience: 0.93, speed_up_tendency: 0.44,
      lob_usage: 0.45, court_coverage: 0.87, transition_play: 0.90, counter_attack: 0.55,
      return_pressure: 0.58, poach_tendency: 0.70,
    },
  },
  {
    name: 'Pablo Tellez',
    archetype: 'The Heavy Roller',
    bio_snippet: 'Topspin drives and physical presence — bullies the transition zone',
    attributes: {
      dink_consistency: 0.80, aggression: 0.90, net_presence: 0.85, power: 0.95,
      reset_ability: 0.74, third_shot_drop: 0.55, patience: 0.52, speed_up_tendency: 0.82,
      lob_usage: 0.22, court_coverage: 0.84, transition_play: 0.76, counter_attack: 0.86,
      return_pressure: 0.88, poach_tendency: 0.68,
    },
  },
  {
    name: 'Quang Duong',
    archetype: 'The Touch Artist',
    bio_snippet: 'Soft hands and disguise — resets and dinks with elite feel',
    attributes: {
      dink_consistency: 0.96, aggression: 0.55, net_presence: 0.88, power: 0.68,
      reset_ability: 0.95, third_shot_drop: 0.90, patience: 0.94, speed_up_tendency: 0.40,
      lob_usage: 0.40, court_coverage: 0.86, transition_play: 0.92, counter_attack: 0.50,
      return_pressure: 0.55, poach_tendency: 0.78,
    },
  },
  {
    name: 'Jonathan Truong',
    archetype: 'The Quick Stick',
    bio_snippet: 'Fast hands in firefights, thrives in rapid net exchanges',
    attributes: {
      dink_consistency: 0.87, aggression: 0.82, net_presence: 0.92, power: 0.80,
      reset_ability: 0.83, third_shot_drop: 0.72, patience: 0.68, speed_up_tendency: 0.86,
      lob_usage: 0.30, court_coverage: 0.91, transition_play: 0.84, counter_attack: 0.84,
      return_pressure: 0.74, poach_tendency: 0.90,
    },
  },
  {
    name: 'Hurricane Tyra Black',
    archetype: 'The Storm',
    bio_snippet: 'Athletic aggression and pace — takes over points with energy',
    attributes: {
      dink_consistency: 0.84, aggression: 0.92, net_presence: 0.93, power: 0.94,
      reset_ability: 0.78, third_shot_drop: 0.68, patience: 0.58, speed_up_tendency: 0.90,
      lob_usage: 0.26, court_coverage: 0.94, transition_play: 0.80, counter_attack: 0.92,
      return_pressure: 0.85, poach_tendency: 0.88,
    },
  },
  {
    name: 'Jorja Johnson',
    archetype: 'The Rising Force',
    bio_snippet: 'Youthful athleticism with growing net dominance',
    attributes: {
      dink_consistency: 0.86, aggression: 0.84, net_presence: 0.90, power: 0.90,
      reset_ability: 0.82, third_shot_drop: 0.74, patience: 0.70, speed_up_tendency: 0.84,
      lob_usage: 0.28, court_coverage: 0.93, transition_play: 0.82, counter_attack: 0.86,
      return_pressure: 0.80, poach_tendency: 0.86,
    },
  },
  {
    name: 'Jackie Kawamoto',
    archetype: 'The Poach Queen',
    bio_snippet: 'Reads the game and covers the middle — classic aggressive doubles IQ',
    attributes: {
      dink_consistency: 0.90, aggression: 0.76, net_presence: 0.92, power: 0.78,
      reset_ability: 0.88, third_shot_drop: 0.84, patience: 0.82, speed_up_tendency: 0.62,
      lob_usage: 0.35, court_coverage: 0.94, transition_play: 0.88, counter_attack: 0.68,
      return_pressure: 0.70, poach_tendency: 0.96,
    },
  },
  {
    name: 'Jade Kawamoto',
    archetype: 'The Finisher',
    bio_snippet: 'Closes points with speed-ups and sharp net instincts',
    attributes: {
      dink_consistency: 0.88, aggression: 0.86, net_presence: 0.94, power: 0.86,
      reset_ability: 0.84, third_shot_drop: 0.78, patience: 0.74, speed_up_tendency: 0.88,
      lob_usage: 0.30, court_coverage: 0.92, transition_play: 0.85, counter_attack: 0.88,
      return_pressure: 0.78, poach_tendency: 0.90,
    },
  },
  {
    name: 'Christopher Haworth',
    archetype: 'The Singles King',
    bio_snippet: 'Court coverage and consistency — built for one-on-one chess matches',
    attributes: {
      dink_consistency: 0.92, aggression: 0.72, net_presence: 0.82, power: 0.80,
      reset_ability: 0.90, third_shot_drop: 0.88, patience: 0.90, speed_up_tendency: 0.58,
      lob_usage: 0.42, court_coverage: 0.96, transition_play: 0.92, counter_attack: 0.68,
      return_pressure: 0.72, poach_tendency: 0.45,
    },
  },
  {
    name: 'Tyler Loong',
    archetype: 'The Veteran',
    bio_snippet: 'Experience and pattern recognition — rarely beats himself',
    attributes: {
      dink_consistency: 0.93, aggression: 0.64, net_presence: 0.88, power: 0.76,
      reset_ability: 0.92, third_shot_drop: 0.90, patience: 0.94, speed_up_tendency: 0.48,
      lob_usage: 0.44, court_coverage: 0.88, transition_play: 0.90, counter_attack: 0.58,
      return_pressure: 0.62, poach_tendency: 0.76,
    },
  },
  {
    name: 'Julian Arnold',
    archetype: 'The Mover',
    bio_snippet: 'Elite footwork and transition game — always in position',
    attributes: {
      dink_consistency: 0.89, aggression: 0.70, net_presence: 0.86, power: 0.78,
      reset_ability: 0.88, third_shot_drop: 0.82, patience: 0.80, speed_up_tendency: 0.65,
      lob_usage: 0.36, court_coverage: 0.96, transition_play: 0.94, counter_attack: 0.72,
      return_pressure: 0.68, poach_tendency: 0.82,
    },
  },
  {
    name: 'Rachel Rohrabacher',
    archetype: 'The Closer',
    bio_snippet: 'Finishes points at the net with poise and placement',
    attributes: {
      dink_consistency: 0.90, aggression: 0.80, net_presence: 0.93, power: 0.84,
      reset_ability: 0.86, third_shot_drop: 0.80, patience: 0.78, speed_up_tendency: 0.78,
      lob_usage: 0.32, court_coverage: 0.91, transition_play: 0.86, counter_attack: 0.82,
      return_pressure: 0.76, poach_tendency: 0.88,
    },
  },
  {
    name: 'Megan Fudge',
    archetype: 'The Wall',
    bio_snippet: 'Defensive resets and patience — forces opponents to hit extra shots',
    attributes: {
      dink_consistency: 0.94, aggression: 0.52, net_presence: 0.84, power: 0.68,
      reset_ability: 0.96, third_shot_drop: 0.90, patience: 0.96, speed_up_tendency: 0.35,
      lob_usage: 0.48, court_coverage: 0.90, transition_play: 0.92, counter_attack: 0.48,
      return_pressure: 0.52, poach_tendency: 0.72,
    },
  },
  {
    name: 'Kate Fahey',
    archetype: 'The Left Side General',
    bio_snippet: 'Directs doubles play from the left with smart aggression',
    attributes: {
      dink_consistency: 0.91, aggression: 0.74, net_presence: 0.90, power: 0.80,
      reset_ability: 0.88, third_shot_drop: 0.86, patience: 0.84, speed_up_tendency: 0.60,
      lob_usage: 0.38, court_coverage: 0.92, transition_play: 0.88, counter_attack: 0.70,
      return_pressure: 0.68, poach_tendency: 0.84,
    },
  },
  {
    name: 'Travis Rettenmaier',
    archetype: 'The Chaos Agent',
    bio_snippet: 'Unpredictable pace and erne threats — keeps opponents guessing',
    attributes: {
      dink_consistency: 0.82, aggression: 0.88, net_presence: 0.87, power: 0.90,
      reset_ability: 0.76, third_shot_drop: 0.62, patience: 0.55, speed_up_tendency: 0.86,
      lob_usage: 0.30, court_coverage: 0.88, transition_play: 0.78, counter_attack: 0.88,
      return_pressure: 0.84, poach_tendency: 0.80,
    },
  },
  {
    name: 'Nicolas Acevedo',
    archetype: 'The Power Monger',
    bio_snippet: 'Raw pace off both wings — looks to dominate with drives',
    attributes: {
      dink_consistency: 0.78, aggression: 0.92, net_presence: 0.84, power: 0.97,
      reset_ability: 0.70, third_shot_drop: 0.50, patience: 0.48, speed_up_tendency: 0.88,
      lob_usage: 0.20, court_coverage: 0.82, transition_play: 0.72, counter_attack: 0.90,
      return_pressure: 0.92, poach_tendency: 0.65,
    },
  },
  {
    name: 'Robert Slutsky',
    archetype: 'The Counter Puncher',
    bio_snippet: 'Absorbs pace then flips rallies with sharp counters',
    attributes: {
      dink_consistency: 0.88, aggression: 0.76, net_presence: 0.86, power: 0.82,
      reset_ability: 0.90, third_shot_drop: 0.78, patience: 0.82, speed_up_tendency: 0.72,
      lob_usage: 0.34, court_coverage: 0.90, transition_play: 0.88, counter_attack: 0.86,
      return_pressure: 0.74, poach_tendency: 0.78,
    },
  },
];

function main() {
  const data = JSON.parse(readFileSync(PROS_PATH, 'utf-8'));
  const existing = new Set(data.pros.map((p) => p.name.toLowerCase()));

  data.pros = data.pros.map((pro) => ({
    ...pro,
    attributes: fullAttributes(pro.attributes),
  }));

  let added = 0;
  for (const pro of NEW_PROS) {
    if (existing.has(pro.name.toLowerCase())) continue;
    data.pros.push({
      ...pro,
      attributes: fullAttributes(pro.attributes),
    });
    added += 1;
  }

  writeFileSync(PROS_PATH, JSON.stringify(data, null, 2));
  console.log(`Updated ${data.pros.length - added} existing pros with 14 attributes`);
  console.log(`Added ${added} new pros (total: ${data.pros.length})`);
}

main();
