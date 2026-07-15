import { useState } from 'react';
import { ATTRIBUTE_LABELS } from '../constants/attributes.js';

function formatCategory(cat) {
  if (!cat) return null;
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProMatchCard({ match, rank, isBest }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const hasSources = match.sources?.length > 0;

  const matchPercent =
    match.combinedScore != null
      ? Math.round(match.combinedScore * 100)
      : match.similarity != null
        ? Math.round(match.similarity * 100)
        : null;

  return (
    <div
      className={`glass-panel-subtle p-5 relative ${
        isBest ? 'ring-1 ring-blue-500/25 bg-white/55' : ''
      }`}
    >
      {isBest && (
        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-zinc-900 text-white px-2 py-0.5 rounded-full">
          Top match
        </span>
      )}

      {matchPercent != null && (
        <p className="text-xs text-zinc-400 mb-1">{matchPercent}% style match</p>
      )}

      <h3 className="text-lg font-semibold text-zinc-900">{match.name}</h3>
      <p className="text-blue-600 font-medium text-sm mb-2">{match.archetype}</p>

      {match.dupr_rating != null && (
        <p className="text-xs text-zinc-500 mb-2">
          Rating {match.dupr_rating}
          {match.dupr_category && ` · ${formatCategory(match.dupr_category)}`}
        </p>
      )}

      <p className="text-xs text-zinc-500 leading-relaxed mb-2">{match.bio_snippet}</p>

      {match.matchExplanation && (
        <div className="mb-2 pb-2 border-b border-black/5">
          <p className="text-xs text-zinc-600 leading-relaxed mb-2">
            {match.matchExplanation.summary}
          </p>
          {match.matchExplanation.topAlignments?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {match.matchExplanation.topAlignments.map((a) => (
                <span
                  key={a.attribute}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 border border-white/80 text-zinc-600"
                >
                  {ATTRIBUTE_LABELS[a.attribute] || a.label} {a.alignmentPct}%
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {match.research_summary && (
        <p className="text-xs text-zinc-600 leading-relaxed border-t border-black/5 pt-2 mt-2">
          {match.research_summary}
        </p>
      )}

      {hasSources && (
        <div className="mt-2 border-t border-black/5 pt-2">
          <button
            type="button"
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {sourcesOpen ? 'Hide' : 'Show'} tips & drills ({match.sources.length})
          </button>
          {sourcesOpen && (
            <ul className="mt-2 space-y-1.5">
              {match.sources.map((s, i) => (
                <li key={i} className="text-xs">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {s.title || s.url}
                    </a>
                  ) : (
                    <span className="font-medium text-zinc-700">{s.title}</span>
                  )}
                  {s.snippet && (
                    <p className="text-zinc-500 mt-0.5 line-clamp-2">{s.snippet}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
