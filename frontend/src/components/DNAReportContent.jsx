import { formatDnaReport } from '../utils/formatDnaReport.js';

function BulletList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-zinc-700 leading-relaxed">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DNAReportContent({ text }) {
  const report = formatDnaReport(text);

  if (report.mode === 'empty') {
    return null;
  }

  if (report.mode === 'structured') {
    return (
      <div className="space-y-4">
        {report.archetype && (
          <div className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-sm px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-2">
              Your archetype
            </p>
            <p className="text-xl font-semibold text-zinc-900 tracking-tight leading-snug">
              {report.archetype}
            </p>
          </div>
        )}

        {report.strengths?.length > 0 && (
          <div className="rounded-2xl border border-white/50 bg-white/30 backdrop-blur-sm px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Signature strengths
            </p>
            <BulletList items={report.strengths} />
          </div>
        )}

        {report.growth?.length > 0 && (
          <div className="rounded-2xl border border-white/50 bg-white/25 backdrop-blur-sm px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Growth edges
            </p>
            <BulletList items={report.growth} />
          </div>
        )}

        {report.nextLevel && (
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-indigo-50/80 via-white/50 to-sky-50/60 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600/80 mb-2">
              Next level
            </p>
            <p className="text-sm text-zinc-800 leading-relaxed">{report.nextLevel}</p>
          </div>
        )}
      </div>
    );
  }

  const paragraphs = report.allParagraphs || report.paragraphs || [];

  return (
    <div className="space-y-4">
      {report.title && (
        <p className="text-xl font-semibold text-zinc-900 tracking-tight leading-snug">
          {report.title}
        </p>
      )}
      {paragraphs.map((p, i) => {
        const bullets = p
          .split('\n')
          .map((l) => l.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean);
        const isList = bullets.length > 1 && p.includes('\n');

        if (isList) {
          return <BulletList key={i} items={bullets} />;
        }

        return (
          <p key={i} className="text-sm text-zinc-700 leading-relaxed">
            {p}
          </p>
        );
      })}
      {report.nextLevel && (
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-indigo-50/80 via-white/50 to-sky-50/60 px-5 py-4 mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600/80 mb-2">
            Next level
          </p>
          <p className="text-sm text-zinc-800 leading-relaxed">{report.nextLevel}</p>
        </div>
      )}
    </div>
  );
}
