#!/usr/bin/env node
'use strict';

/**
 * Sambhav Content Engine v2 — Draft & Approval Workflow
 *
 * Commands:
 *   ideas [count]              Print N topic ideas (default 5)
 *   draft "<topic>"            Write a post for one topic, save to Notion as "Pending Review"
 *   generate [count]           Generate N ideas and create a draft for each (default 3)
 *   publish-approved           Publish every draft marked "Approved" in Notion, then mark "Published"
 *   post "<topic>" [--dry-run] [--no-image]   Legacy: write + publish a single post immediately
 */

require('dotenv').config();

const readline = require('readline/promises');
const { detectPillar, hashtagsFor, PILLARS } = require('./lib/pillars');
const { writeAndCheck, generateIdeas } = require('./lib/voice');
const { generateImage } = require('./lib/image');
const publora = require('./lib/publora');
const notionLib = require('./lib/notion');

function requireEnv(...names) {
  const missing = names.filter(n => !process.env[n]);
  if (missing.length) {
    console.error(`❌  Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ─── ideas ────────────────────────────────────────────────────────────────────

async function cmdIdeas(count) {
  requireEnv('ANTHROPIC_API_KEY');
  console.log(`\n💡  Generating ${count} topic ideas...\n`);
  const ideas = await generateIdeas(count);
  ideas.forEach((idea, i) => console.log(`${i + 1}. [${detectPillar(idea)}] ${idea}`));
  console.log('');
  return ideas;
}

// ─── draft ────────────────────────────────────────────────────────────────────

async function cmdDraft(topic) {
  requireEnv('ANTHROPIC_API_KEY', 'NOTION_TOKEN', 'NOTION_CONTENT_CALENDAR_DB_ID');

  const pillar = detectPillar(topic);
  const hashtags = hashtagsFor(pillar);
  console.log(`\n🎯  Topic: "${topic}"`);
  console.log(`📌  Pillar: ${pillar}`);

  console.log('✍️   Writing post...');
  const { post, flags } = await writeAndCheck(topic, pillar);
  if (flags.length > 0) {
    console.warn(`⚠️   Voice check still has: ${flags.join(', ')} — review before approving`);
  } else {
    console.log('✅  Voice check passed');
  }

  const page = await notionLib.createDraft({
    topic,
    pillar,
    post,
    hashtags,
    imagePrompt: PILLARS[pillar].imagePrompt
  });

  console.log(`📝  Draft saved to Notion: ${page.url}`);
  return page;
}

// ─── generate (ideas + draft each) ────────────────────────────────────────────

async function cmdGenerate(count) {
  const ideas = await cmdIdeas(count);
  console.log(`\n📋  Creating ${ideas.length} drafts for review...\n`);
  for (const idea of ideas) {
    await cmdDraft(idea);
  }
  console.log(`\n✅  ${ideas.length} drafts created. Review them in Notion → Content Calendar.\n`);
}

// ─── publish-approved ─────────────────────────────────────────────────────────

async function cmdPublishApproved() {
  requireEnv('NOTION_TOKEN', 'NOTION_CONTENT_CALENDAR_DB_ID', 'PUBLORA_TOKEN');

  const approved = await notionLib.getApprovedDrafts();
  if (approved.length === 0) {
    console.log('\nNo approved drafts to publish.\n');
    return;
  }

  console.log(`\n📬  Found ${approved.length} approved draft(s)\n`);

  for (const page of approved) {
    const title = page.properties.Title?.title?.[0]?.plain_text || '(untitled)';
    const pillar = page.properties.Pillar?.select?.name || 'founder';
    console.log(`▶️   Publishing: "${title}" [${pillar}]`);

    try {
      const { post, hashtagLine } = await notionLib.getDraftContent(page.id);
      const caption = `${post}\n\n${hashtagLine}`;

      let mediaId = null;
      if (process.env.OPENAI_API_KEY) {
        const imagePrompt = page.properties['Image Prompt']?.rich_text?.[0]?.plain_text
          || PILLARS[pillar].imagePrompt;
        console.log('   🎨  Generating image...');
        const imageBuffer = await generateImage(imagePrompt);
        console.log('   📤  Uploading image to Publora...');
        mediaId = await publora.uploadImage(imageBuffer);
      }

      console.log('   🚀  Publishing to LinkedIn...');
      const result = await publora.publish(caption, mediaId);
      const url = result?.url || result?.post_url || '';

      await notionLib.markPublished(page.id, url);
      console.log(`   ✅  Live${url ? `: ${url}` : ''}`);
    } catch (err) {
      console.error(`   ❌  Failed: ${err.message}`);
      await notionLib.markRejected(page.id, err.message);
    }
  }

  console.log('\n✅  Done.\n');
}

// ─── post (legacy: write + publish immediately) ───────────────────────────────

async function cmdPost(topic, { dryRun, noImage }) {
  requireEnv('ANTHROPIC_API_KEY');

  const pillar = detectPillar(topic);
  const hashtags = hashtagsFor(pillar);
  console.log(`\n🎯  Topic: "${topic}"`);
  console.log(`📌  Pillar: ${pillar}`);
  console.log(`#️⃣   Hashtags (20): ${hashtags.map(h => `#${h}`).join(' ')}`);

  console.log('\n✍️   Writing post...');
  const { post, flags } = await writeAndCheck(topic, pillar);
  if (flags.length > 0) {
    console.warn(`\n⚠️   Voice check still has: ${flags.join(', ')} — review before posting`);
  } else {
    console.log('\n✅  Voice check passed');
  }

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

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('\nReady to publish? (y/n): ');
  rl.close();
  if (answer.toLowerCase() !== 'y') {
    console.log('\nAborted. Post NOT published.\n');
    return;
  }

  requireEnv('PUBLORA_TOKEN');

  let mediaId = null;
  if (!noImage && process.env.OPENAI_API_KEY) {
    console.log('\n🎨  Generating image (DALL-E 3)...');
    const imageBuffer = await generateImage(PILLARS[pillar].imagePrompt);
    mediaId = await publora.uploadImage(imageBuffer);
    console.log('✅  Image generated and uploaded');
  } else if (!noImage) {
    console.warn('\n⚠️   No OPENAI_API_KEY — skipping image');
  }

  console.log('\n🚀  Publishing to LinkedIn...');
  const caption = `${post}\n\n${hashtagLine}`;
  const result = await publora.publish(caption, mediaId);
  const linkedinUrl = result?.url || result?.post_url || '';
  console.log(`\n🎉  Live on LinkedIn!${linkedinUrl ? ` → ${linkedinUrl}` : ''}`);

  await notionLib.logToInbox(topic, pillar, post, hashtags, linkedinUrl).catch(e =>
    console.warn('   ⚠️  Notion logging failed (non-fatal):', e.message)
  );

  console.log('\n✅  Done.\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);
  const flags = rest.filter(a => a.startsWith('--'));
  const positional = rest.filter(a => !a.startsWith('--'));

  switch (command) {
    case 'ideas':
      await cmdIdeas(parseInt(positional[0], 10) || 5);
      break;
    case 'draft':
      await cmdDraft(positional.join(' '));
      break;
    case 'generate':
      await cmdGenerate(parseInt(positional[0], 10) || 3);
      break;
    case 'publish-approved':
      await cmdPublishApproved();
      break;
    case 'post':
      await cmdPost(positional.join(' '), {
        dryRun: flags.includes('--dry-run'),
        noImage: flags.includes('--no-image')
      });
      break;
    default:
      console.log(`Sambhav Content Engine v2

Usage:
  node sambhav-content-engine-v2.js ideas [count]
  node sambhav-content-engine-v2.js draft "<topic>"
  node sambhav-content-engine-v2.js generate [count]
  node sambhav-content-engine-v2.js publish-approved
  node sambhav-content-engine-v2.js post "<topic>" [--dry-run] [--no-image]
`);
      process.exit(command ? 1 : 0);
  }
}

main().catch(err => {
  console.error('\n❌ ', err.message);
  process.exit(1);
});
