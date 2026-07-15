export default function SavedProfileNotice({ profile, onRemove, compact = false }) {
  if (!profile?.attributes) return null;

  const rating =
    profile.biometrics?.duprRating ?? profile.calibration?.dupr ?? null;

  const handleRemove = () => {
    const ok = window.confirm(
      'Remove your saved Player DNA from this browser?\n\nCoach Chat and Matchup Lab will no longer use your profile until you complete the assessment again.'
    );
    if (ok) onRemove();
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleRemove}
        className="text-sm text-red-600/90 hover:text-red-700 font-medium transition-colors"
      >
        Remove saved DNA
      </button>
    );
  }

  return (
    <div className="glass-panel-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-indigo-500/15 bg-indigo-50/30">
      <div>
        <p className="text-sm font-medium text-zinc-900">Saved Player DNA on this device</p>
        <p className="text-xs text-zinc-600 mt-0.5">
          Used in Coach Chat and Matchup Lab
          {rating != null && ` · ~${rating} DUPR`}
        </p>
      </div>
      <button
        type="button"
        onClick={handleRemove}
        className="shrink-0 text-sm font-medium px-4 py-2 rounded-xl border border-red-500/25 text-red-700 bg-red-50/50 hover:bg-red-50 transition-colors"
      >
        Remove saved DNA
      </button>
    </div>
  );
}
