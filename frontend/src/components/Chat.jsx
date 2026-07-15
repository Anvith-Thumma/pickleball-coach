import { useState, useRef, useEffect } from 'react';
import ChatMessageContent from './ChatMessageContent.jsx';
import { displayUserMessage } from '../utils/formatChatMessage.js';
import { apiUrl } from '../utils/apiBase.js';

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const STARTER_PROMPTS = [
  'What is the kitchen rule and when can I volley?',
  'Give me a drill to improve my third shot drop',
  'When should I speed up vs keep dinking?',
  'How does stacking work in doubles?',
];

const STARTER_PROMPTS_WITH_DNA = [
  'What should I work on based on my Player DNA?',
  'Who are pros with a similar style to me?',
  'How would I match up against Ben Johns in singles?',
  'Give me a drill for my weakest attribute',
];

const TOOL_LABELS = {
  get_player_profile: 'Loading your DNA profile',
  find_similar_pros: 'Finding similar pros',
  list_pro_players: 'Browsing pro catalog',
  analyze_matchup: 'Running matchup analysis',
  search_dupr_rankings: 'Searching DUPR rankings',
  get_dupr_rating_history: 'Pulling rating history',
  generate_scouting_report: 'Building scouting report',
};

export default function Chat({ userProfile }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hey — I'm your pickleball coach. Ask about strategy, drills, kitchen rules, stacking, or match prep. Set your skill level above and fire away.",
    },
  ]);
  const [input, setInput] = useState('');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [streaming, setStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState(null);
  const bottomRef = useRef(null);
  const hasDna = Boolean(userProfile?.attributes);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text.trim();
    if (!userText || streaming) return;

    const userMessage = {
      role: 'user',
      content: `[Skill level: ${skillLevel}] ${userText}`,
    };
    const newMessages = [...messages, userMessage];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);
    setToolStatus(null);

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          playerProfile: userProfile ?? null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const { text: delta, error, tool } = parsed;
            if (error) throw new Error(error);
            if (tool) {
              setToolStatus(TOOL_LABELS[tool] ?? 'Looking up data…');
            }
            if (delta) {
              setToolStatus(null);
              assistantText += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantText,
                };
                return updated;
              });
            }
          } catch {
            /* skip malformed SSE chunks */
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Sorry, something went wrong: ${err.message}. Make sure the backend is running and ANTHROPIC_API_KEY is set.`,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      setToolStatus(null);
    }
  };

  const starterPrompts = hasDna ? STARTER_PROMPTS_WITH_DNA : STARTER_PROMPTS;

  const isStreamingLast =
    streaming && messages[messages.length - 1]?.role === 'assistant';

  return (
    <div className="glass-panel p-5 md:p-6 flex flex-col h-[calc(100vh-11rem)] max-h-[720px]">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap border-b border-black/5 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Coach Chat</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {hasDna
              ? 'Personalized coaching with your Player DNA'
              : 'Strategy, drills, and rules'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Level</label>
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={streaming}
          >
            {SKILL_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isLastAssistant = !isUser && i === messages.length - 1;
          const showStream = isLastAssistant && isStreamingLast;

          return (
            <div
              key={i}
              className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-1">
                {isUser ? 'You' : 'Coach'}
              </span>
              <div
                className={`max-w-[92%] md:max-w-[85%] rounded-2xl px-4 py-3.5 ${
                  isUser
                    ? 'bg-zinc-900 text-white shadow-glass-sm'
                    : 'bg-white/60 backdrop-blur-md border border-white/55 shadow-glass-sm'
                }`}
              >
                {isUser ? (
                  <p className="text-[15px] leading-relaxed">
                    {displayUserMessage(msg.content)}
                  </p>
                ) : (
                  <ChatMessageContent text={msg.content} streaming={showStream} />
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {toolStatus && (
        <p className="text-xs text-indigo-600/90 mb-2 px-1 animate-pulse">{toolStatus}…</p>
      )}

      {!streaming && messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {starterPrompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => sendMessage(p)}
              className="text-xs btn-glass rounded-full px-3 py-2 text-zinc-600 hover:text-zinc-900 text-left"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex gap-2 pt-2 border-t border-black/5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about drills, strategy, rules…"
          disabled={streaming}
          className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn-primary disabled:opacity-40 font-medium px-5 py-3 rounded-2xl text-sm shrink-0"
        >
          {streaming ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
