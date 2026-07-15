import { useState } from 'react';

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner (~2.5–3.2 DUPR)' },
  { id: 'intermediate', label: 'Intermediate (~3.3–4.2)' },
  { id: 'advanced', label: 'Advanced (~4.3–5.2)' },
  { id: 'competitive', label: 'Competitive (~5.3–6.2)' },
  { id: 'elite', label: 'Elite (6.3+)' },
];

const HANDEDNESS = [
  { id: 'right', label: 'Right-handed' },
  { id: 'left', label: 'Left-handed' },
];

export default function PlayerIntake({ onComplete }) {
  const [form, setForm] = useState({
    age: '',
    heightIn: '',
    handedness: 'right',
    skillLevel: 'intermediate',
    duprRating: '',
    useDupr: false,
  });

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    const age = form.age ? parseInt(form.age, 10) : null;
    const heightIn = form.heightIn ? parseInt(form.heightIn, 10) : null;
    const duprRating = form.useDupr && form.duprRating
      ? parseFloat(form.duprRating)
      : null;

    if (form.useDupr && (duprRating == null || duprRating < 2 || duprRating > 8)) {
      return;
    }

    onComplete({
      age,
      heightIn,
      handedness: form.handedness,
      skillLevel: form.useDupr ? null : form.skillLevel,
      duprRating,
    });
  };

  return (
    <div className="glass-panel p-6 md:p-8">
      <h2 className="text-xl font-semibold text-zinc-900 tracking-tight mb-1">
        About you
      </h2>
      <p className="text-sm text-zinc-500 mb-6">
        Biometrics and your rating help calibrate the quiz — players often over- or
        under-estimate their skills.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-2">
              Age
            </label>
            <input
              type="number"
              min="10"
              max="90"
              value={form.age}
              onChange={(e) => update('age', e.target.value)}
              placeholder="e.g. 34"
              className="glass-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-2">
              Height (inches, optional)
            </label>
            <input
              type="number"
              min="48"
              max="84"
              value={form.heightIn}
              onChange={(e) => update('heightIn', e.target.value)}
              placeholder="e.g. 70"
              className="glass-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-2">
            Handedness
          </label>
          <div className="flex gap-2">
            {HANDEDNESS.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => update('handedness', h.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  form.handedness === h.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white/40 border border-white/60 text-zinc-700'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={form.useDupr}
              onChange={(e) => update('useDupr', e.target.checked)}
              className="rounded border-zinc-300"
            />
            I know my DUPR rating
          </label>

          {form.useDupr ? (
            <input
              type="number"
              step="0.001"
              min="2"
              max="8"
              required
              value={form.duprRating}
              onChange={(e) => update('duprRating', e.target.value)}
              placeholder="e.g. 4.125"
              className="glass-input w-full max-w-xs rounded-xl px-3 py-2 text-sm"
            />
          ) : (
            <select
              value={form.skillLevel}
              onChange={(e) => update('skillLevel', e.target.value)}
              className="glass-input w-full max-w-md rounded-xl px-3 py-2 text-sm"
            >
              {SKILL_LEVELS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary font-medium px-6 py-2.5 rounded-2xl text-sm"
        >
          Continue to style quiz →
        </button>
      </form>
    </div>
  );
}

// useState import - I forgot to add import!