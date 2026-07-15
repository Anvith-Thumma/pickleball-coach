import { formatScoutingReport } from '../utils/formatScoutingReport.js';

function BulletList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-zinc-700 leading-relaxed">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children, accent }) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 backdrop-blur-sm ${
        accent
          ? 'border-blue-500/20 bg-gradient-to-br from-indigo-50/80 via-white/50 to-sky-50/60'
          : 'border-white/50 bg-white/30'
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.2em] mb-2 ${
          accent ? 'text-blue-600/80' : 'text-zinc-400'
        }`}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

export default function ScoutingReportContent({ text }) {
  const report = formatScoutingReport(text);

  if (report.mode === 'empty') return null;

  if (report.mode === 'fallback') {
    return <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{report.body}</p>;
  }

  return (
    <div className="space-y-4">
      {report.overview && (
        <Section title="Matchup overview" accent>
          <p className="text-sm text-zinc-800 leading-relaxed">{report.overview}</p>
        </Section>
      )}
      {report.advantages?.length > 0 && (
        <Section title="Your advantages">
          <BulletList items={report.advantages} />
        </Section>
      )}
      {report.threats?.length > 0 && (
        <Section title="Opponent threats">
          <BulletList items={report.threats} />
        </Section>
      )}
      {report.gamePlan?.length > 0 && (
        <Section title="Game plan" accent>
          <BulletList items={report.gamePlan} />
        </Section>
      )}
      {report.drills?.length > 0 && (
        <Section title="Prep drills">
          <BulletList items={report.drills} />
        </Section>
      )}
    </div>
  );
}
