import { ATTRIBUTE_LABELS } from '../constants/attributes.js';

function SimilarPlayerCard({ player, onAnalyze }) {
  const matchPct =
    player.combinedScore != null
      ? Math.round(player.combinedScore * 100)
      : player.similarity != null
        ? Math.round(player.similarity * 100)
        : null;

  const explanation = player.matchExplanation;

  return (
    <div className="glass-panel-subtle p-4 flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            #{player.rank} similar
          </p>
          <h4 className="text-base font-semibold text-zinc-900">{player.name}</h4>
          <p className="text-xs text-blue-600 font-medium">{player.archetype}</p>
        </div>
        {matchPct != null && (
          <span className="text-xs font-mono text-zinc-500 tabular-nums shrink-0">
            {matchPct}%
          </span>
        )}
      </div>

      {player.dupr_rating != null && (
        <p className="text-xs text-zinc-500 mb-2">Rating {player.dupr_rating}</p>
      )}

      {explanation && (
        <div className="mt-auto pt-3 border-t border-black/5 space-y-2">
          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
            {explanation.summary}
          </p>
          {explanation.topAlignments?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {explanation.topAlignments.map((a) => (
                <span
                  key={a.attribute}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 border border-white/80 text-zinc-600"
                >
                  {ATTRIBUTE_LABELS[a.attribute] || a.label} {a.alignmentPct}%
                </span>
              ))}
            </div>
          )}
          {onAnalyze && (
            <button
              type="button"
              onClick={() => onAnalyze(player)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
            >
              Analyze matchup →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SimilarPlayers({ players, onAnalyzeMatchup }) {
  if (!players?.length) return null;

  const others = players.length > 1 ? players.slice(1) : [];

  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-1">
        Similar players
      </h3>
      {others.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {others.map((p) => (
            <SimilarPlayerCard
              key={p.name}
              player={p}
              onAnalyze={onAnalyzeMatchup}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 px-1">No additional similar players found.</p>
      )}
    </div>
  );
}
