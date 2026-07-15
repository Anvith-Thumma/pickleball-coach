import AttributeRadar from './AttributeRadar.jsx';
import ProMatchCard from './ProMatchCard.jsx';
import DNAReportContent from './DNAReportContent.jsx';
import SimilarPlayers from './SimilarPlayers.jsx';
import SavedProfileNotice from './SavedProfileNotice.jsx';
import { ATTRIBUTE_LABELS } from '../constants/attributes.js';

export default function DNAReport({ data, onRemove, onAnalyzeMatchup }) {
  const { matches, similarPlayers, userProfile, dnaReport } = data;
  const match = matches[0];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">Your Player DNA</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Attribute profile & pro match</p>
          {userProfile.biometrics && (
            <p className="text-xs text-zinc-400 mt-1">
              {userProfile.biometrics.age && `${userProfile.biometrics.age} yrs`}
              {userProfile.biometrics.handedness && ` · ${userProfile.biometrics.handedness}-handed`}
              {(userProfile.biometrics.duprRating ?? userProfile.calibration?.dupr) != null &&
                ` · DUPR ${userProfile.biometrics.duprRating ?? userProfile.calibration.dupr}`}
            </p>
          )}
        </div>
        <SavedProfileNotice profile={userProfile} onRemove={onRemove} compact />
      </div>

      {userProfile.calibration?.note && (
        <div className="glass-panel-subtle p-4 text-sm text-zinc-600 leading-relaxed">
          <span className="font-medium text-zinc-800">Rating calibration: </span>
          {userProfile.calibration.note}
        </div>
      )}

      <div className="glass-panel p-6 md:p-8">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">
          Attribute profile
        </h3>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <AttributeRadar attributes={userProfile.attributes} />
          <div className="space-y-3">
            {Object.entries(userProfile.attributes).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-500">{ATTRIBUTE_LABELS[key] || key}</span>
                  <span className="font-mono text-zinc-900 tabular-nums">{val.toFixed(2)}</span>
                </div>
                <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-violet-400 transition-all duration-500"
                    style={{ width: `${val * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {match && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-1">
            Your pro match
          </h3>
          <div className="max-w-xl mx-auto">
            <ProMatchCard match={match} rank={1} isBest />
          </div>
        </div>
      )}

      {similarPlayers?.length > 0 && (
        <SimilarPlayers players={similarPlayers} onAnalyzeMatchup={onAnalyzeMatchup} />
      )}

      {dnaReport ? (
        <div className="glass-panel p-6 md:p-8">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">
            Player report
          </h3>
          <DNAReportContent text={dnaReport} />
        </div>
      ) : (
        <div className="glass-panel-subtle p-4 text-sm text-zinc-500">
          Your personalized report could not be generated right now. Your pro match and attribute
          profile above are still available.
        </div>
      )}
    </div>
  );
}
