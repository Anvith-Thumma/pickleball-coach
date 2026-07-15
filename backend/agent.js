import Anthropic from '@anthropic-ai/sdk';
import {
  COACHING_SYSTEM_PROMPT,
  DNA_REPORT_SYSTEM_PROMPT,
  SCOUTING_REPORT_SYSTEM_PROMPT,
} from './prompts/coach.js';
import { COACH_TOOLS, executeCoachTool } from './services/coachTools.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 6;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env');
  }
  return new Anthropic({ apiKey });
}

function formatMatchForPrompt(m, i) {
  const lines = [
    `${i + 1}. ${m.name} — "${m.archetype}"`,
    `   Cosine match: ${Math.round((m.similarity ?? 0) * 100)}%`,
  ];

  if (m.combinedScore != null) {
    lines.push(`   Match score: ${Math.round(m.combinedScore * 100)}%`);
  }
  if (m.dupr_rating != null) {
    lines.push(
      `   DUPR rating: ${m.dupr_rating}${m.dupr_category ? ` (${m.dupr_category})` : ''}`
    );
  }
  lines.push(`   Bio: ${m.bio_snippet}`);
  lines.push(`   Attributes: ${JSON.stringify(m.attributes)}`);

  if (m.research_summary) {
    lines.push(`   Web research: ${m.research_summary}`);
  }
  if (m.sources?.length) {
    lines.push(
      `   Sources: ${m.sources.map((s) => s.title).filter(Boolean).join('; ')}`
    );
  }

  return lines.join('\n');
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * @param {Array<{ role: string, content: string }>} messages
 * @param {import('express').Response} res
 * @param {{ pros: Array, duprRankings: object|null, playerProfile: object|null }} coachContext
 */
export async function streamCoachingChat(messages, res, coachContext = {}) {
  const client = getClient();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const toolCtx = {
    pros: coachContext.pros ?? [],
    duprRankings: coachContext.duprRankings ?? null,
    playerProfile: coachContext.playerProfile ?? null,
  };

  const apiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 1024,
        system: COACHING_SYSTEM_PROMPT,
        tools: COACH_TOOLS,
        messages: apiMessages,
      });

      stream.on('text', (text) => {
        writeSse(res, { text });
      });

      const finalMessage = await stream.finalMessage();

      if (finalMessage.stop_reason === 'end_turn') {
        break;
      }

      if (finalMessage.stop_reason === 'tool_use') {
        apiMessages.push({ role: 'assistant', content: finalMessage.content });

        const toolResults = [];
        for (const block of finalMessage.content) {
          if (block.type !== 'tool_use') continue;

          writeSse(res, { tool: block.name });

          let result;
          try {
            result = await executeCoachTool(block.name, block.input ?? {}, toolCtx);
          } catch (err) {
            result = { error: err.message || 'Tool execution failed' };
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        apiMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

    writeSse(res, '[DONE]');
    res.end();
  } catch (err) {
    console.error('Stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed' });
    } else {
      writeSse(res, { error: err.message });
      writeSse(res, '[DONE]');
      res.end();
    }
  }
}

export async function generateDNAReport(userProfile, topMatches, enrichment = {}) {
  const client = getClient();

  const userPrompt = `Generate a Player DNA Report for this player.

## Player Attribute Profile (0.0–1.0 scale)
${JSON.stringify(userProfile.attributes, null, 2)}

## Pro Match
${topMatches.map((m, i) => formatMatchForPrompt(m, i)).join('\n\n')}

Write the DNA report now. Use the required section format. Do not invent stats.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: DNA_REPORT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = response.content.find((b) => b.type === 'text');
  return block?.text ?? 'Unable to generate report.';
}

function formatH2HForPrompt(analysis) {
  const { playerA, playerB, explanation, styleEdge, playerAEdges, playerBEdges, tacticalNotes, clashProfile } =
    analysis;

  const format = analysis.matchFormat ?? 'singles';
  const membersA = playerA.members?.map((m) => m.name).join(' & ') ?? playerA.name;
  const membersB = playerB.members?.map((m) => m.name).join(' & ') ?? playerB.name;

  return `## Format: ${format}

## Side A: ${playerA.name}${playerA.archetype ? ` (${playerA.archetype})` : ''}
${format === 'doubles' ? `Players: ${membersA}\n` : ''}Team attributes: ${JSON.stringify(playerA.attributes)}
Edges: ${playerAEdges.map((e) => `${e.label} +${e.margin}%`).join(', ') || 'none'}

## Side B: ${playerB.name}${playerB.archetype ? ` (${playerB.archetype})` : ''}
${format === 'doubles' ? `Players: ${membersB}\n` : ''}Team attributes: ${JSON.stringify(playerB.attributes)}
Edges: ${playerBEdges.map((e) => `${e.label} +${e.margin}%`).join(', ') || 'none'}

## Style analysis
Clash profile: ${clashProfile}
Style similarity: ${explanation.overallAlignmentPct}%
Style advantage favors: ${styleEdge.favored === 'playerA' ? playerA.name : playerB.name}
Key factors: ${styleEdge.keyFactors.map((f) => `${f.label} favors ${f.favors === 'playerA' ? playerA.name : playerB.name}`).join('; ')}
Tactical notes: ${tacticalNotes.join(' ')}`;
}

export async function generateScoutingReport(analysis, focusPlayer = 'playerA') {
  const client = getClient();
  const focus = focusPlayer === 'playerB' ? analysis.playerB : analysis.playerA;
  const opponent = focusPlayer === 'playerB' ? analysis.playerA : analysis.playerB;

  const userPrompt = `Generate a scouting report for ${focus.name} facing ${opponent.name}.

${formatH2HForPrompt(analysis)}

Write from ${focus.name}'s perspective (they are preparing to face ${opponent.name}). Use the required section format.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: SCOUTING_REPORT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = response.content.find((b) => b.type === 'text');
  return block?.text ?? 'Unable to generate scouting report.';
}
