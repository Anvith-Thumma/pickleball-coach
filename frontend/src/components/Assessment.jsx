import { useEffect, useState } from 'react';
import PlayerIntake from './PlayerIntake.jsx';
import { buildFullProfile } from '../utils/profileCalibration.js';
import { apiUrl } from '../utils/apiBase.js';

export default function Assessment({ onComplete, loading }) {
  const [phase, setPhase] = useState('intake');
  const [intake, setIntake] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sections, setSections] = useState({});
  const [attributeKeys, setAttributeKeys] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    fetch(apiUrl('/api/questions'))
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions ?? []);
        setSections(data.sections ?? {});
        setAttributeKeys(data.attributeKeys ?? []);
        setAnswers(Array((data.questions ?? []).length).fill(null));
      })
      .catch(() => setLoadError('Could not load assessment questions'));
  }, []);

  if (phase === 'intake') {
    return <PlayerIntake onComplete={(data) => { setIntake(data); setPhase('quiz'); }} />;
  }

  if (loadError) {
    return <div className="glass-panel p-6 text-sm text-red-600">{loadError}</div>;
  }

  if (questions.length === 0) {
    return <div className="glass-panel p-6 text-sm text-zinc-500">Loading assessment…</div>;
  }

  const current = questions[step];
  const progress = ((step + (answers[step] !== null ? 1 : 0)) / questions.length) * 100;
  const sectionLabel = sections[current.section] ?? null;

  const selectOption = (optionIndex) => {
    const next = [...answers];
    next[step] = optionIndex;
    setAnswers(next);
  };

  const next = () => {
    if (answers[step] === null) return;
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(buildFullProfile(answers, questions, attributeKeys, intake));
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else setPhase('intake');
  };

  return (
    <div className="glass-panel p-6 md:p-8">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-zinc-500 mb-2">
          <span>
            Question {step + 1} of {questions.length}
            {sectionLabel && <span className="text-zinc-400"> · {sectionLabel}</span>}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-sky-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-zinc-900 mb-4">{current.text}</h2>

      <div className="space-y-2 mb-6">
        {current.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => selectOption(i)}
            disabled={loading}
            className={`w-full text-left px-4 py-3 rounded-2xl border transition-all text-sm ${
              answers[step] === i
                ? 'border-blue-500/40 bg-white/70 text-zinc-900 shadow-glass-sm ring-1 ring-blue-500/20'
                : 'border-white/50 bg-white/30 text-zinc-500 hover:bg-white/50 hover:text-zinc-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={back}
          disabled={loading}
          className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          onClick={next}
          disabled={answers[step] === null || loading}
          className="btn-primary disabled:opacity-40 font-medium px-6 py-2 rounded-2xl"
        >
          {loading
            ? 'Building your profile...'
            : step === questions.length - 1
              ? 'Reveal My DNA'
              : 'Next →'}
        </button>
      </div>
    </div>
  );
}
