import { ATTRIBUTE_LABELS } from '../constants/attributes.js';

const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_R = 148;
const LEVELS = [0.25, 0.5, 0.75, 1];

export default function AttributeRadar({ attributes }) {
  const keys = Object.keys(ATTRIBUTE_LABELS).filter((k) => k in attributes);
  const n = keys.length;
  if (n === 0) return null;

  const angleAt = (i) => (2 * Math.PI * i) / n - Math.PI / 2;

  const pointAt = (value, i) => {
    const a = angleAt(i);
    const r = value * MAX_R;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  };

  const dataPoints = keys.map((key, i) => ({
    ...pointAt(attributes[key], i),
    key,
    label: ATTRIBUTE_LABELS[key],
    value: attributes[key],
  }));

  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const axes = keys.map((key, i) => {
    const end = pointAt(1, i);
    const labelPt = pointAt(1.14, i);
    return { key, end, labelPt, label: ATTRIBUTE_LABELS[key] };
  });

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[380px] h-auto"
        role="img"
        aria-label="Player attribute radar chart"
      >
        <defs>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.35)" />
            <stop offset="50%" stopColor="rgba(56, 189, 248, 0.28)" />
            <stop offset="100%" stopColor="rgba(167, 139, 250, 0.32)" />
          </linearGradient>
          <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {LEVELS.map((level) => (
          <polygon
            key={level}
            points={keys.map((_, i) => {
              const p = pointAt(level, i);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1"
          />
        ))}

        {axes.map(({ key, end }) => (
          <line
            key={key}
            x1={CX}
            y1={CY}
            x2={end.x}
            y2={end.y}
            stroke="rgba(0,0,0,0.07)"
            strokeWidth="1"
          />
        ))}

        <polygon
          points={polygon}
          fill="url(#radarFill)"
          stroke="url(#radarStroke)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {dataPoints.map((p) => (
          <circle
            key={p.key}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="white"
            stroke="url(#radarStroke)"
            strokeWidth="2"
          />
        ))}

        {axes.map(({ key, labelPt, label }) => (
          <text
            key={key}
            x={labelPt.x}
            y={labelPt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#6e6e73]"
            style={{ fontSize: '9px', fontWeight: 500 }}
          >
            {label.length > 14 ? `${label.slice(0, 12)}…` : label}
          </text>
        ))}
      </svg>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 w-full max-w-md mt-2">
        {dataPoints.map((p) => (
          <div key={p.key} className="flex justify-between text-xs text-zinc-500">
            <span className="truncate pr-2">{p.label}</span>
            <span className="font-mono text-zinc-900 tabular-nums">{p.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
