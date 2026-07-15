import { useState, useEffect } from 'react';
import Chat from './components/Chat.jsx';
import Assessment from './components/Assessment.jsx';
import DNAReport from './components/DNAReport.jsx';
import MatchupLab from './components/MatchupLab.jsx';
import SavedProfileNotice from './components/SavedProfileNotice.jsx';
import { saveUserProfile, loadUserProfile, clearUserProfile } from './utils/profileStorage.js';

const TABS = [
  { id: 'chat', label: 'Coach Chat' },
  { id: 'dna', label: 'Player DNA' },
  { id: 'matchup', label: 'Matchup Lab' },
];

export default function App() {
  const [tab, setTab] = useState('chat');
  const [dnaResults, setDnaResults] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [matchupOpponent, setMatchupOpponent] = useState(null);

  useEffect(() => {
    const stored = loadUserProfile();
    if (stored) setSavedProfile(stored);
  }, []);

  const handleAnalyzeMatchup = (player) => {
    setMatchupOpponent(player.name);
    setTab('matchup');
  };

  const handleRemoveSavedDna = () => {
    clearUserProfile();
    setSavedProfile(null);
    setDnaResults(null);
  };

  const handleAssessmentComplete = async (profile) => {
    setAssessmentLoading(true);
    setDnaResults(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const res = await fetch('/api/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: profile.vector,
          attributes: profile.attributes,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Similarity request failed');
      }
      const data = await res.json();
      const userProfile = {
        ...data.userProfile,
        biometrics: profile.biometrics,
        calibration: profile.calibration,
        rawAttributes: profile.rawAttributes,
      };
      const enriched = { ...data, userProfile };
      setDnaResults(enriched);
      saveUserProfile(userProfile);
      setSavedProfile(userProfile);
    } catch (err) {
      alert(err.message);
    } finally {
      setAssessmentLoading(false);
    }
  };

  return (
    <>
      <div className="ambient-bg" aria-hidden="true" />
      <div className="min-h-screen flex flex-col relative">
        <header className="sticky top-0 z-10 border-b border-white/40 bg-white/30 backdrop-blur-2xl">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
                Pickleball Coach
              </h1>
              <p className="text-xs text-zinc-500">Strategy · drills · player DNA</p>
            </div>
            <nav className="flex gap-1 p-1 rounded-2xl bg-white/25 backdrop-blur-md border border-white/40">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    tab === t.id ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          {tab === 'chat' && (
            <Chat userProfile={dnaResults?.userProfile ?? savedProfile} />
          )}
          {tab === 'dna' && (
            <div className="space-y-6">
              {!dnaResults && savedProfile && (
                <SavedProfileNotice
                  profile={savedProfile}
                  onRemove={handleRemoveSavedDna}
                />
              )}
              {!dnaResults && (
                <Assessment
                  onComplete={handleAssessmentComplete}
                  loading={assessmentLoading}
                />
              )}
              {dnaResults && (
                <DNAReport
                  data={dnaResults}
                  onRemove={handleRemoveSavedDna}
                  onAnalyzeMatchup={handleAnalyzeMatchup}
                />
              )}
            </div>
          )}
          {tab === 'matchup' && (
            <MatchupLab
              userProfile={dnaResults?.userProfile ?? savedProfile}
              initialOpponent={matchupOpponent}
              onGoToDna={() => setTab('dna')}
            />
          )}
        </main>

      </div>
    </>
  );
}
