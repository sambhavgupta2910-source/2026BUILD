#!/usr/bin/env node
'use strict';

/**
 * Sambhav Content Engine v2
 * Usage: node sambhav-content-engine-v2.js "Your topic here"
 * Flags: --dry-run  (generate + preview without posting)
 *        --no-image (skip DALL-E, post text only)
 */

require('dotenv').config();

const Anthropic  = require('@anthropic-ai/sdk');
const OpenAI     = require('openai');
const { Client } = require('@notionhq/client');
const readline   = require('readline/promises');
const https      = require('https');
const FormData   = require('form-data');

// ─── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const notion    = new Client({ auth: process.env.NOTION_TOKEN });

const PUBLORA_TOKEN      = process.env.PUBLORA_TOKEN;
const NOTION_INBOX_DB_ID = process.env.NOTION_INBOX_DB_ID;
const PUBLORA_API        = 'https://api.publora.com/v1';

// ─── Pillar Config ────────────────────────────────────────────────────────────

const PILLARS = {
  'real-estate': {
    keywords: ['real estate', 'property', 'dubai', 'cap rate', 'developer', 'hnwi',
               'investor', 'rental', 'dld', 'rera', 'apartment', 'villa', 'residential',
               'commercial', 'yield', 'off-plan', 'prime', 'luxury home', 'penthouse',
               'transaction', 'sq ft', 'price per'],
    hashtags: ['dubaiinvestment', 'realestateinvestor', 'dubaimarket', 'propertyvaluation',
               'wealthadvisory', 'investorintelligence', 'dubaieconomics', 'hnwiinvestor',
               'luxuryproperty', 'dubaireal'],
    imagePrompt: 'Aerial drone photography of Dubai skyline at golden hour, luxury skyscrapers, ' +
                 'clean architectural lines, warm amber light, ultra realistic, no text, no watermark, ' +
                 'professional commercial photography, 4K'
  },
  'trading': {
    keywords: ['gold', 'oil', 'trading', 'market', 'fed', 'macro', 'inflation',
               'geopolitical', 'silver', 'equities', 'commodity', 'price', 'supply',
               'demand', 'brent', 'wti', 'interest rate', 'central bank', 'dollar'],
    hashtags: ['trading', 'marketanalysis', 'goldprices', 'oilmarkets', 'macroeconomics',
               'investingstrategy', 'financialmarkets', 'geopoliticalrisk', 'commoditytrading',
               'wealthmanagement'],
    imagePrompt: 'Abstract financial data visualization with glowing gold lines on dark background, ' +
                 'elegant minimalist composition, no text, no watermark, premium financial aesthetic, ' +
                 'professional studio photography'
  },
  'founder': {
    keywords: ['founder', 'business lesson', 'team', 'hire', 'negotiation', 'relationship',
               'sales', 'client', 'partnership', 'build', 'startup', 'entrepreneur',
               'leadership', 'mistake', 'learned', 'growth', 'decision'],
    hashtags: ['founders', 'entrepreneurship', 'businessstrategy', 'startuplife',
               'businessdevelopment', 'leadership', 'founderjourney', 'salesstrategy',
               'growthmindset', 'buildingabusiness'],
    imagePrompt: 'Clean minimalist Dubai office workspace with laptop and notebook on white desk, ' +
                 'natural morning light through floor-to-ceiling windows, premium aesthetic, ' +
                 'no text, no watermark, professional lifestyle photography'
  },
  'aviation': {
    keywords: ['aviation', 'aircraft', 'engine', 'mro', 'spare parts', 'propeller',
               'overhaul', 'supplier', 'fleet', 'maintenance', 'apu', 'airframe',
               'turbine', 'hangar', 'arrow aviation', 'aerospace'],
    hashtags: ['aviation', 'aircraftmaintenance', 'mro', 'aviationindustry', 'spareparts',
               'aerospaceindustry', 'aviationbusiness', 'aircraftparts', 'aviationsupplychain',
               'aviationprofessional'],
    imagePrompt: 'Close-up of commercial aircraft jet engine turbine blades, MRO hangar background, ' +
                 'dramatic industrial lighting, deep focus, no text, no watermark, ' +
                 'professional aviation photography'
  },
  'ai': {
    keywords: ['ai', 'artificial intelligence', 'claude', 'automation', 'workflow',
               'notion', 'llm', 'gpt', 'machine learning', 'productivity', 'system',
               'content engine', 'jarvis', 'prism', 'digital brain', 'tool'],
    hashtags: ['artificialintelligence', 'aitools', 'automation', 'productivity',
               'claudeai', 'aiworkflow', 'futureofwork', 'techfounder',
               'aiinbusiness', 'buildwithAI'],
    imagePrompt: 'Abstract neural network with glowing blue electric nodes on dark background, ' +
                 'geometric connection patterns, clean tech aesthetic, no text, no watermark, ' +
                 'digital art, high detail'
  }
};

const UNIVERSAL_HASHTAGS = [
  'dubai', 'business', 'entrepreneurship', 'insights', 'strategy',
  'analysis', 'marketintel', 'thoughtleadership', 'professionaladvice', 'executivelevel'
];

const AI_LANGUAGE = [
  /\bleverage\b/gi, /\bsynergies?\b/gi, /\bparadigm\b/gi, /\bdelve\b/gi,
  /\bgame.changer\b/gi, /\bdisruptive\b/gi, /\btransformative\b/gi,
  /\binnovative\b/gi, /\bholistic\b/gi, /\bseamlessly\b/gi, /\btapestry\b/gi,
  /\btestament\b/gi, /\bpivotal\b/gi, /\bexcited to share\b/gi,
  /\bthrilled to announce\b/gi, /\bhumbled\b/gi, /\blet that sink in\b/gi,
  /\bat the end of the day\b/gi
];

// ─── Pillar Detection ─────────────────────────────────────────────────────────

function detectPillar(topic) {
  const lower = topic.toLowerCase();
  let best = { pillar: 'founder', score: 0 };
  for (const [pillar, config] of Object.entries(PILLARS)) {
    const score = config.keywords.filter(kw => lower.includes(kw)).length;
    if (score > best.score) best = { pillar, score };
  }
  return best.pillar;
}

// ─── Voice System Prompt ──────────────────────────────────────────────────────

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

// ─── Step 1: Write Post ───────────────────────────────────────────────────────

async function writePost(topic, pillar) {
  console.log('\n✍️  Writing post...');
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

// ─── Step 2: Voice Check ──────────────────────────────────────────────────────

function voiceCheck(post) {
  const flags = [];
  for (const pattern of AI_LANGUAGE) {
    const matches = post.match(pattern);
    if (matches) flags.push(...matches.map(m => `"${m}"`));
  }
  if (post.trim().startsWith('I ')) flags.push('starts with "I"');
  return flags;
}

async function rewriteIfNeeded(post, topic, pillar, flags) {
  if (flags.length === 0) return post;
  console.log(`\n⚠️  Voice check flagged: ${flags.join(', ')}`);
  console.log('   Rewriting...');
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

// ─── Step 3: Generate Image ───────────────────────────────────────────────────

async function generateImage(pillar) {
  console.log('\n🎨  Generating image (DALL-E 3)...');
  const prompt = PILLARS[pillar].imagePrompt;
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'b64_json'
  });
  return Buffer.from(response.data[0].b64_json, 'base64');
}

// ─── Step 4: Publish via Publora ──────────────────────────────────────────────

async function publishViaPublora(postText, hashtags, imageBuffer) {
  console.log('\n📤  Uploading image to Publora...');

  // Upload image
  const form = new FormData();
  form.append('file', imageBuffer, { filename: 'post-image.png', contentType: 'image/png' });
  const uploadRes = await fetch(`${PUBLORA_API}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PUBLORA_TOKEN}`, ...form.getHeaders() },
    body: form
  });
  if (!uploadRes.ok) throw new Error(`Publora media upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  const { media_id } = await uploadRes.json();

  // Build full caption with hashtags
  const hashtagLine = hashtags.map(h => `#${h}`).join(' ');
  const caption = `${postText}\n\n${hashtagLine}`;

  console.log('\n🚀  Publishing to LinkedIn...');
  const postRes = await fetch(`${PUBLORA_API}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PUBLORA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      network: 'linkedin',
      content: caption,
      media_ids: [media_id],
      publish_now: true
    })
  });
  if (!postRes.ok) throw new Error(`Publora publish failed: ${postRes.status} ${await postRes.text()}`);
  return postRes.json();
}

// ─── Step 5: Log to Notion ────────────────────────────────────────────────────

async function logToNotion(topic, pillar, post, hashtags, linkedinUrl) {
  if (!NOTION_TOKEN || !NOTION_INBOX_DB_ID) return;
  try {
    const hashtagLine = hashtags.map(h => `#${h}`).join(' ');
    await notion.pages.create({
      parent: { database_id: NOTION_INBOX_DB_ID },
      properties: {
        Name: { title: [{ text: { content: `[Content Engine] ${topic}` } }] },
        Status: { select: { name: 'Processed' } },
        Project: { select: { name: 'LinkedIn Content' } }
      },
      children: [
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Published Post' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: post } }] } },
        { object: 'block', type: 'divider', divider: {} },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: `Pillar: ${pillar}\nHashtags: ${hashtagLine}${linkedinUrl ? `\nLinkedIn URL: ${linkedinUrl}` : ''}` } }] } }
      ]
    });
    console.log('   ✅  Logged to Notion AI Brain');
  } catch (e) {
    console.warn('   ⚠️  Notion logging failed (non-fatal):', e.message);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun  = args.includes('--dry-run');
  const noImage = args.includes('--no-image');
  const topic   = args.filter(a => !a.startsWith('--')).join(' ').trim();

  if (!topic) {
    console.error('Usage: node sambhav-content-engine-v2.js "Your topic here" [--dry-run] [--no-image]');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌  Missing ANTHROPIC_API_KEY in .env');
    process.exit(1);
  }

  console.log(`\n🎯  Topic: "${topic}"`);

  const pillar   = detectPillar(topic);
  const hashtags = [...PILLARS[pillar].hashtags, ...UNIVERSAL_HASHTAGS];
  console.log(`📌  Pillar detected: ${pillar}`);
  console.log(`#️⃣   Hashtags (20): ${hashtags.map(h => `#${h}`).join(' ')}`);

  // Write post
  let post = await writePost(topic, pillar);

  // Voice check + auto-rewrite
  const flags = voiceCheck(post);
  post = await rewriteIfNeeded(post, topic, pillar, flags);

  const finalFlags = voiceCheck(post);
  if (finalFlags.length > 0) {
    console.warn(`\n⚠️  Voice check still has: ${finalFlags.join(', ')} — review before posting`);
  } else {
    console.log('\n✅  Voice check passed');
  }

  // Preview
  const hashtagLine = hashtags.map(h => `#${h}`).join(' ');
  console.log('\n' + '─'.repeat(60));
  console.log('PREVIEW:\n');
  console.log(post);
  console.log('\n' + hashtagLine);
  console.log('─'.repeat(60));

  if (dryRun) {
    console.log('\n[--dry-run] Skipping publish. Done.\n');
    return;
  }

  // Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('\nReady to publish? (y/n): ');
  rl.close();
  if (answer.toLowerCase() !== 'y') {
    console.log('\nAborted. Post NOT published.\n');
    return;
  }

  // Generate image
  let imageBuffer = null;
  if (!noImage && process.env.OPENAI_API_KEY) {
    imageBuffer = await generateImage(pillar);
    console.log('   ✅  Image generated');
  } else if (!noImage) {
    console.warn('   ⚠️  No OPENAI_API_KEY — skipping image');
  }

  // Publish
  if (!PUBLORA_TOKEN) {
    console.error('❌  Missing PUBLORA_TOKEN — cannot publish');
    process.exit(1);
  }

  let publishResult;
  if (imageBuffer) {
    publishResult = await publishViaPublora(post, hashtags, imageBuffer);
  } else {
    // Text-only fallback
    const caption = `${post}\n\n${hashtagLine}`;
    const res = await fetch(`${PUBLORA_API}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PUBLORA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ network: 'linkedin', content: caption, publish_now: true })
    });
    if (!res.ok) throw new Error(`Publora publish failed: ${res.status} ${await res.text()}`);
    publishResult = await res.json();
  }

  const linkedinUrl = publishResult?.url || publishResult?.post_url || '';
  console.log('\n🎉  Live on LinkedIn!', linkedinUrl ? `→ ${linkedinUrl}` : '');

  // Log to Notion
  await logToNotion(topic, pillar, post, hashtags, linkedinUrl);

  console.log('\n✅  Done.\n');
}

main().catch(err => {
  console.error('\n❌ ', err.message);
  process.exit(1);
});
