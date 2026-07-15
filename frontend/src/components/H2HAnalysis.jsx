import { ATTRIBUTE_LABELS } from '../constants/attributes.js';

function EdgeBar({ label, margin, side, sideLabel }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`w-20 shrink-0 font-medium truncate ${side === 'a' ? 'text-indigo-600' : 'text-violet-600'}`}
        title={sideLabel}
      >
        {sideLabel}
      </span>
      <div className="flex-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${side === 'a' ? 'bg-indigo-400' : 'bg-violet-400'}`}
          style={{ width: `${Math.min(margin, 100)}%` }}
        />
      </div>
      <span className="text-zinc-500 w-24 truncate">{label}</span>
      <span className="font-mono text-zinc-700 tabular-nums">+{margin}%</span>
    </div>
  );
}

function MetricCard({ title, value, subtitle, hint }) {
  return (
    <div className="min-w-[140px]">
      <p className="text-[10px] uppercase tracking-widest text-zinc-400">{title}</p>
      <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
      {subtitle && <p className="text-sm font-medium text-zinc-800 mt-0.5">{subtitle}</p>}
      {hint && <p className="text-[11px] text-zinc-500 mt-1 leading-snug max-w-[220px]">{hint}</p>}
    </div>
  );
}

function TeamCard({ title, player, format }) {
  return (
    <div className="glass-panel-subtle p-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">{title}</p>
      <h4 className="font-semibold text-zinc-900">{player.name}</h4>
      {player.archetype && (
        <p className="text-xs text-blue-600 mt-0.5">{player.archetype}</p>
      )}
      {format === 'doubles' && player.members?.length > 1 && (
        <p className="text-xs text-zinc-500 mt-2">
          {player.members.map((m) => m.name).join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function H2HAnalysis({ analysis }) {
  if (!analysis) return null;

  const {
    matchFormat = 'singles',
    playerA,
    playerB,
    explanation,
    styleEdge,
    playerAEdges,
    playerBEdges,
    tacticalNotes,
    clashProfile,
    metricGuide,
  } = analysis;

  const favoredName =
    styleEdge.favored === 'playerA' ? playerA.name : playerB.name;
  const advantageStrength = Math.round(
    Math.abs(
      (styleEdge.favored === 'playerA' ? styleEdge.playerAWinProb : styleEdge.playerBWinProb) - 0.5
    ) * 200
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          {matchFormat === 'doubles' ? 'Doubles matchup' : 'Singles matchup'}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <TeamCard title="Your side" player={playerA} format={matchFormat} />
        <TeamCard title="Opponent" player={playerB} format={matchFormat} />
      </div>

      <div className="glass-panel p-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
          Key metrics
        </p>

        <div className="flex flex-wrap gap-6 mb-5 pb-5 border-b border-black/5">
          <MetricCard
            title="Style similarity"
            value={`${explanation.overallAlignmentPct}%`}
            hint={
              metricGuide?.styleAlignment ??
              'How alike the two styles are. High = similar game; low = very different.'
            }
          />
          <MetricCard
            title="Style advantage"
            value={`${advantageStrength}%`}
            subtitle={favoredName}
            hint={
              metricGuide?.styleAdvantage ??
              'Who has the stylistic edge on paper — not a win prediction.'
            }
          />
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Matchup type</p>
            <p className="text-sm text-zinc-700 leading-relaxed mt-1">{clashProfile}</p>
          </div>
        </div>

        <p className="text-sm text-zinc-600 mb-4">{explanation.summary}</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">
              {playerA.name} — attribute edges
            </p>
            <p className="text-[11px] text-zinc-500 mb-3">
              Skills where your side scores higher
            </p>
            <div className="space-y-2">
              {playerAEdges.length > 0 ? (
                playerAEdges.map((e) => (
                  <EdgeBar
                    key={e.attribute}
                    label={e.label}
                    margin={e.margin}
                    side="a"
                    sideLabel="You"
                  />
                ))
              ) : (
                <p className="text-xs text-zinc-500">No clear attribute edges</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">
              {playerB.name} — attribute edges
            </p>
            <p className="text-[11px] text-zinc-500 mb-3">
              Skills where their side scores higher
            </p>
            <div className="space-y-2">
              {playerBEdges.length > 0 ? (
                playerBEdges.map((e) => (
                  <EdgeBar
                    key={e.attribute}
                    label={e.label}
                    margin={e.margin}
                    side="b"
                    sideLabel="Them"
                  />
                ))
              ) : (
                <p className="text-xs text-zinc-500">No clear attribute edges</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {tacticalNotes?.length > 0 && (
        <div className="glass-panel-subtle p-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            What to do with this
          </p>
          <ul className="space-y-1.5">
            {tacticalNotes.map((note, i) => (
              <li key={i} className="text-sm text-zinc-700 leading-relaxed flex gap-2">
                <span className="text-blue-500 shrink-0">→</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {explanation.attributeDeltas?.length > 0 && (
        <details className="glass-panel-subtle p-4">
          <summary className="text-xs font-semibold text-zinc-500 uppercase tracking-widest cursor-pointer">
            Full attribute comparison
          </summary>
          <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {explanation.attributeDeltas.map((d) => (
              <div key={d.key} className="flex justify-between text-xs">
                <span className="text-zinc-500">{ATTRIBUTE_LABELS[d.key] || d.label}</span>
                <span className="font-mono tabular-nums text-zinc-700">
                  {d.a.toFixed(2)} vs {d.b.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="text-[10px] text-zinc-400 px-1">{styleEdge.disclaimer}</p>
    </div>
  );
}
