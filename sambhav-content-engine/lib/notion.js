'use strict';

const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const CALENDAR_DB_ID = process.env.NOTION_CONTENT_CALENDAR_DB_ID;
const INBOX_DB_ID    = process.env.NOTION_INBOX_DB_ID;

/** Create a draft page in the Content Calendar DB with Status = "Pending Review" */
async function createDraft({ topic, pillar, post, hashtags, imagePrompt }) {
  const hashtagLine = hashtags.map(h => `#${h}`).join(' ');
  const page = await notion.pages.create({
    parent: { database_id: CALENDAR_DB_ID },
    properties: {
      Title:        { title: [{ text: { content: topic.slice(0, 100) } }] },
      Status:       { select: { name: 'Pending Review' } },
      Pillar:       { select: { name: pillar } },
      Hashtags:     { rich_text: [{ text: { content: hashtagLine } }] },
      'Image Prompt': { rich_text: [{ text: { content: imagePrompt.slice(0, 2000) } }] },
      Topic:        { rich_text: [{ text: { content: topic.slice(0, 2000) } }] }
    },
    children: [
      { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Draft Post' } }] } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: post } }] } },
      { object: 'block', type: 'divider', divider: {} },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: hashtagLine } }] } },
      { object: 'block', type: 'callout', callout: {
          rich_text: [{ text: { content: 'Set Status to "Approved" to publish on the next scheduled run, or "Rejected" to discard.' } }],
          icon: { emoji: '👀' }
        } }
    ]
  });
  return page;
}

/** Find all drafts with Status = "Approved" */
async function getApprovedDrafts() {
  const res = await notion.databases.query({
    database_id: CALENDAR_DB_ID,
    filter: { property: 'Status', select: { equals: 'Approved' } }
  });
  return res.results;
}

/** Read back the draft post text + hashtags from a page's content blocks */
async function getDraftContent(pageId) {
  const blocks = await notion.blocks.children.list({ block_id: pageId });
  const paragraphs = blocks.results
    .filter(b => b.type === 'paragraph')
    .map(b => b.paragraph.rich_text.map(rt => rt.plain_text).join(''));

  // First paragraph after the "Draft Post" heading is the post body,
  // the next non-empty paragraph after the divider is the hashtag line.
  const post = paragraphs[0] || '';
  const hashtagLine = paragraphs[1] || '';
  return { post, hashtagLine };
}

/** Mark a draft as Published and store the live LinkedIn URL */
async function markPublished(pageId, url) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: 'Published' } },
      'Published URL': { url: url || null }
    }
  });
}

/** Mark a draft as Rejected (used on publish failure to avoid retry loops) */
async function markRejected(pageId, reason) {
  await notion.pages.update({
    page_id: pageId,
    properties: { Status: { select: { name: 'Rejected' } } }
  });
  if (reason) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [{
        object: 'block', type: 'callout',
        callout: { rich_text: [{ text: { content: `Publish failed: ${reason}` } }], icon: { emoji: '⚠️' } }
      }]
    });
  }
}

/** Legacy: log a directly-published post to the AI Brain Inbox */
async function logToInbox(topic, pillar, post, hashtags, linkedinUrl) {
  if (!INBOX_DB_ID) return;
  const hashtagLine = hashtags.map(h => `#${h}`).join(' ');
  await notion.pages.create({
    parent: { database_id: INBOX_DB_ID },
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
}

module.exports = { createDraft, getApprovedDrafts, getDraftContent, markPublished, markRejected, logToInbox };
