import { useEffect, useState } from 'react';
import H2HAnalysis from './H2HAnalysis.jsx';
import ScoutingReportContent from './ScoutingReportContent.jsx';
import { loadUserProfile } from '../utils/profileStorage.js';

const FORMATS = [
  { id: 'doubles', label: 'Doubles' },
  { id: 'singles', label: 'Singles' },
];

function RosterSlot({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/35 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{title}</p>
      {subtitle && <p className="text-xs text-zinc-600 mt-0.5 mb-2">{subtitle}</p>}
      {children}
    </div>
  );
}

function DnaProfileCard({ profile, onSwitchTab }) {
  if (!profile) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-50/40 px-4 py-3 text-sm">
        <p className="text-zinc-800 font-medium">No Player DNA saved yet</p>
        <p className="text-zinc-600 text-xs mt-1">
          Complete the Player DNA quiz first so we can use your style profile here.
        </p>
        {onSwitchTab && (
          <button
            type="button"
            onClick={onSwitchTab}
            className="text-xs text-blue-600 font-medium mt-2 hover:underline"
          >
            Go to Player DNA →
          </button>
        )}
      </div>
    );
  }

  const rating =
    profile.biometrics?.duprRating ??
    profile.calibration?.dupr ??
    null;

  return (
    <div className="rounded-xl border border-indigo-500/25 bg-indigo-50/50 px-4 py-3">
      <p className="font-semibold text-zinc-900">You</p>
      <p className="text-xs text-zinc-600 mt-0.5">
        Player DNA profile
        {rating != null && ` · ~${rating} DUPR`}
        {profile.biometrics?.handedness && ` · ${profile.biometrics.handedness}-handed`}
      </p>
      {profile.calibration?.note && (
        <p className="text-[11px] text-zinc-500 mt-1.5 leading-snug">{profile.calibration.note}</p>
      )}
    </div>
  );
}

export default function MatchupLab({ userProfile, initialOpponent, onGoToDna }) {
  const [storedProfile, setStoredProfile] = useState(null);
  const [pros, setPros] = useState([]);
  const [matchFormat, setMatchFormat] = useState('doubles');

  // 'dna' | 'pro' for your player slot
  const [yourPlayerMode, setYourPlayerMode] = useState('dna');
  const [yourPro, setYourPro] = useState('');
  const [yourPartner, setYourPartner] = useState('');

  const [opponent1, setOpponent1] = useState(initialOpponent ?? '');
  const [opponent2, setOpponent2] = useState('');

  const [analysis, setAnalysis] = useState(null);
  const [scoutingReport, setScoutingReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeProfile = userProfile ?? storedProfile;
  const hasDna = Boolean(activeProfile?.attributes);

  useEffect(() => {
    setStoredProfile(loadUserProfile());
  }, [userProfile]);

  useEffect(() => {
    if (hasDna) setYourPlayerMode('dna');
  }, [hasDna]);

  useEffect(() => {
    fetch('/api/pros')
      .then((r) => r.json())
      .then((data) => setPros(data.pros ?? []))
      .catch(() => setError('Could not load pro list'));
  }, []);

  useEffect(() => {
    if (initialOpponent) setOpponent1(initialOpponent);
  }, [initialOpponent]);

  const proSelect = (value, onChange, placeholder, exclude = []) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="glass-input w-full rounded-xl px-3 py-2 text-sm"
    >
      <option value="">{placeholder}</option>
      {pros
        .filter((p) => !exclude.includes(p.name))
        .map((p) => (
          <option key={p.name} value={p.name}>
            {p.name} — {p.archetype}
          </option>
        ))}
    </select>
  );

  const buildYourPlayerPayload = () => {
    if (yourPlayerMode === 'dna') {
      if (!hasDna) throw new Error('Complete Player DNA first, or pick yourself as a pro');
      return {
        label: 'You',
        attributes: activeProfile.attributes,
        dupr_rating: activeProfile.biometrics?.duprRating ?? activeProfile.calibration?.dupr ?? null,
      };
    }
    if (!yourPro) throw new Error('Select yourself (or your primary pro comparison)');
    return { proName: yourPro };
  };

  const buildPayload = () => {
    if (!opponent1) throw new Error('Select at least one opponent');

    const payload = {
      matchFormat,
      playerA: buildYourPlayerPayload(),
      playerB: { proName: opponent1 },
    };

    if (matchFormat === 'doubles') {
      if (!yourPartner) throw new Error('Select your doubles partner');
      if (!opponent2) throw new Error("Select the opponent's partner");
      if (yourPartner === opponent1 || yourPartner === opponent2) {
        throw new Error('Partner cannot be the same as an opponent');
      }
      payload.partnerA = { proName: yourPartner };
      payload.partnerB = { proName: opponent2 };
    }

    return payload;
  };

  const runAnalysis = async () => {
    setError(null);
    setLoading(true);
    setScoutingReport(null);
    try {
      const res = await fetch('/api/matchup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const runScouting = async () => {
    setError(null);
    setScoutLoading(true);
    try {
      const res = await fetch('/api/scouting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), focusPlayer: 'playerA' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scouting failed');
      setAnalysis(data.analysis);
      setScoutingReport(data.scoutingReport);
    } catch (err) {
      setError(err.message);
    } finally {
      setScoutLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">Matchup Lab</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Build both sides of the matchup — use your DNA profile in singles or doubles
        </p>
      </div>

      <div className="glass-panel p-5 md:p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Format
          </p>
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setMatchFormat(f.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  matchFormat === f.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white/40 border border-white/60 text-zinc-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* YOUR SIDE */}
        <div className="rounded-2xl border border-indigo-500/15 bg-indigo-50/25 p-4 space-y-4">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-widest">
            Your {matchFormat === 'doubles' ? 'team' : 'side'}
          </p>

          <div>
            <p className="text-xs text-zinc-500 mb-2">Who are you in this matchup?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setYourPlayerMode('dna')}
                disabled={!hasDna}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  yourPlayerMode === 'dna'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/50 text-zinc-600 border border-white/60'
                } disabled:opacity-40`}
              >
                My Player DNA
              </button>
              <button
                type="button"
                onClick={() => setYourPlayerMode('pro')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  yourPlayerMode === 'pro'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/50 text-zinc-600 border border-white/60'
                }`}
              >
                Compare as a pro
              </button>
            </div>

            {yourPlayerMode === 'dna' ? (
              <DnaProfileCard profile={activeProfile} onSwitchTab={onGoToDna} />
            ) : (
              <RosterSlot title="You (pro stand-in)" subtitle="Pick the pro closest to your game">
                {proSelect(yourPro, setYourPro, 'Select a pro…')}
              </RosterSlot>
            )}
          </div>

          {matchFormat === 'doubles' && (
            <RosterSlot
              title="Your partner"
              subtitle="Required — pick the pro who best matches your partner's style"
            >
              {proSelect(yourPartner, setYourPartner, 'Select your partner…', [yourPro])}
            </RosterSlot>
          )}
        </div>

        {/* OPPONENT SIDE */}
        <div className="rounded-2xl border border-violet-500/15 bg-violet-50/25 p-4 space-y-3">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-widest">
            Opponent {matchFormat === 'doubles' ? 'team' : ''}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <RosterSlot title={matchFormat === 'doubles' ? 'Opponent 1' : 'Opponent'}>
              {proSelect(opponent1, setOpponent1, 'Select opponent…')}
            </RosterSlot>
            {matchFormat === 'doubles' && (
              <RosterSlot title="Opponent 2 (partner)">
                {proSelect(opponent2, setOpponent2, "Select opponent's partner…", [opponent1])}
              </RosterSlot>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50/80 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading || scoutLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? 'Analyzing…' : 'Analyze matchup'}
          </button>
          <button
            type="button"
            onClick={runScouting}
            disabled={loading || scoutLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-white/60 bg-white/40 disabled:opacity-50"
          >
            {scoutLoading ? 'Generating…' : 'Generate scouting report'}
          </button>
        </div>
      </div>

      {analysis && <H2HAnalysis analysis={analysis} />}

      {scoutingReport && (
        <div className="glass-panel p-6 md:p-8">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">
            Scouting report
          </h3>
          <ScoutingReportContent text={scoutingReport} />
        </div>
      )}
    </div>
  );
}
