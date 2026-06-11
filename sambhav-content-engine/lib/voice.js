'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VOICE_SYSTEM = `You are writing LinkedIn content for Sambhav Gupta, a Dubai-based founder, luxury real estate advisor, and aviation business developer.

VOICE:
- Founder-style: strategic, commercially aware, confident but not arrogant
- Premium and polished, direct and clear
- Insight-led — combine personal perspective with market data or business lesson
- Data-backed where possible. Specific > vague. Real numbers > estimates
- Human but never casual. Practical, never theoretical
- Think: Naval Ravikant's leverage thinking + Benjamin Graham's market discipline + Ryan Serhant's sales clarity + Dubai market expertise

STRUCTURAL RULES:
- First 1-2 lines MUST stop the scroll. No "I" as the first word
- Short paragraphs: max 3 lines each. One idea per paragraph
- Line breaks between every paragraph
- Strong closing line — leave reader thinking differently, not inspired emptily
- NO hashtags in the body (added separately)
- Output ONLY the post text — no preamble, no explanation

BANNED WORDS AND PHRASES (will fail voice check):
leverage, synergy, paradigm, delve, game-changer, disruptive, transformative, innovative (as generic claim), holistic, seamlessly, tapestry, testament, pivotal, excited to share, thrilled to announce, humbled, let that sink in, at the end of the day, unpopular opinion (when hollow), hustle, grind (when glorified), journey (overused)

FORMAT TARGET:
- 120-220 words for a standard hook post
- Short paragraphs
- No hashtags
- Ends with a question OR a sharp closing statement that invites response`;

const AI_LANGUAGE = [
  /\bleverage\b/gi, /\bsynergies?\b/gi, /\bparadigm\b/gi, /\bdelve\b/gi,
  /\bgame.changer\b/gi, /\bdisruptive\b/gi, /\btransformative\b/gi,
  /\binnovative\b/gi, /\bholistic\b/gi, /\bseamlessly\b/gi, /\btapestry\b/gi,
  /\btestament\b/gi, /\bpivotal\b/gi, /\bexcited to share\b/gi,
  /\bthrilled to announce\b/gi, /\bhumbled\b/gi, /\blet that sink in\b/gi,
  /\bat the end of the day\b/gi
];

function voiceCheck(post) {
  const flags = [];
  for (const pattern of AI_LANGUAGE) {
    const matches = post.match(pattern);
    if (matches) flags.push(...matches.map(m => `"${m}"`));
  }
  if (post.trim().startsWith('I ')) flags.push('starts with "I"');
  return flags;
}

async function writePost(topic, pillar) {
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: VOICE_SYSTEM,
    messages: [{
      role: 'user',
      content: `Write a LinkedIn post about: "${topic}"\n\nContent pillar: ${pillar}\n\nWrite the post now. Output only the post text.`
    }]
  });
  return msg.content[0].text.trim();
}

async function rewriteIfNeeded(post, topic, pillar, flags) {
  if (flags.length === 0) return post;
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: VOICE_SYSTEM,
    messages: [
      { role: 'user', content: `Write a LinkedIn post about: "${topic}"\n\nContent pillar: ${pillar}\n\nWrite the post now. Output only the post text.` },
      { role: 'assistant', content: post },
      { role: 'user', content: `This failed the voice check. Remove these flagged phrases: ${flags.join(', ')}\n\nRewrite the full post cleanly without them. Output only the post text.` }
    ]
  });
  return msg.content[0].text.trim();
}

/** Full write pipeline: write -> voice check -> rewrite if needed -> return { post, flags } */
async function writeAndCheck(topic, pillar) {
  let post = await writePost(topic, pillar);
  const flags = voiceCheck(post);
  post = await rewriteIfNeeded(post, topic, pillar, flags);
  const finalFlags = voiceCheck(post);
  return { post, flags: finalFlags };
}

/** Generate a batch of topic ideas across the content pillars */
async function generateIdeas(count = 5) {
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: VOICE_SYSTEM,
    messages: [{
      role: 'user',
      content: `Generate ${count} LinkedIn post topic ideas for Sambhav, spread across these pillars: real estate (Dubai market), trading (gold/oil/macro), founder (business lessons), aviation (spare parts/MRO), and AI (automation/systems).

Each idea must be:
- Specific and non-generic (not "the importance of X")
- Tied to a real insight, data point, or lesson
- One line, no numbering prefix beyond a plain index

Output as a numbered list, one idea per line, nothing else.`
    }]
  });
  return msg.content[0].text
    .trim()
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean);
}

module.exports = { VOICE_SYSTEM, voiceCheck, writePost, rewriteIfNeeded, writeAndCheck, generateIdeas };
