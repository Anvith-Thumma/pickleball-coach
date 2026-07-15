import { formatChatMessage } from '../utils/formatChatMessage.js';

function Inline({ parts }) {
  return parts.map((p, i) =>
    p.type === 'bold' ? (
      <strong key={i} className="font-semibold text-zinc-900">
        {p.value}
      </strong>
    ) : (
      <span key={i}>{p.value}</span>
    )
  );
}

export default function ChatMessageContent({ text, streaming }) {
  const { blocks } = formatChatMessage(text);

  if (!blocks.length) {
    return streaming ? (
      <span className="inline-flex items-center gap-1 text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
        Thinking…
      </span>
    ) : null;
  }

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-zinc-700">
      {blocks.map((block, i) => {
        if (block.type === 'list') {
          return (
            <ul key={i} className="space-y-2 pl-0.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400" />
                  <span>
                    <Inline parts={item.parts} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-zinc-800">
            <Inline parts={block.parts} />
          </p>
        );
      })}
      {streaming && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-sky-500 animate-pulse align-middle" />
      )}
    </div>
  );
}
