/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, isFullPageOrDataSource } from '@notionhq/client';

// Data source IDs (collection IDs) from the Notion brain
const DATA_SOURCES = {
  inbox:     '2a07abdc-c185-4d5a-bcd3-75203f0ea3c8',
  decisions: 'b9566495-d31c-402a-aa5e-2473da365e5b',
  entities:  'adde8ee4-15bb-4752-b7a4-ac3f7a941e7c',
};

export type DBKey = keyof typeof DATA_SOURCES;

export interface BrainEntry {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  date: string;
  url: string;
}

let notionClient: Client | null = null;

export function getNotionClient(): Client | null {
  if (!process.env.NOTION_TOKEN) return null;
  if (!notionClient) notionClient = new Client({ auth: process.env.NOTION_TOKEN });
  return notionClient;
}

function extractTitle(page: any): string {
  try {
    const props = page.properties || {};
    for (const key of ['Name', 'Title', 'title', 'name']) {
      const prop = props[key];
      if (prop?.type === 'title' && prop.title?.[0]?.plain_text) return prop.title[0].plain_text;
    }
    const titleProp = Object.values(props).find((p: any) => p.type === 'title') as any;
    if (titleProp?.title?.[0]?.plain_text) return titleProp.title[0].plain_text;
    if (page.title?.[0]?.plain_text) return page.title[0].plain_text;
    return 'Untitled';
  } catch { return 'Untitled'; }
}

function extractText(page: any, ...keys: string[]): string {
  try {
    const props = page.properties || {};
    for (const key of keys) {
      const p = props[key];
      if (!p) continue;
      if (p.type === 'rich_text' && p.rich_text?.[0]?.plain_text) return p.rich_text[0].plain_text;
      if (p.type === 'select' && p.select?.name) return p.select.name;
    }
    return '';
  } catch { return ''; }
}

function extractTags(page: any): string[] {
  try {
    const props = page.properties || {};
    for (const key of ['Tags', 'tags', 'Status', 'Category', 'Project']) {
      const p = props[key];
      if (!p) continue;
      if (p.type === 'multi_select') return p.multi_select.map((t: any) => t.name);
      if (p.type === 'select' && p.select) return [p.select.name];
    }
    return [];
  } catch { return []; }
}

function toEntry(page: any): BrainEntry {
  return {
    id:      page.id,
    title:   extractTitle(page),
    summary: extractText(page, 'Summary', 'Description', 'Reusable Context', 'Content', 'Notes'),
    tags:    extractTags(page),
    date:    (page.created_time || '').split('T')[0] || '',
    url:     page.url || '',
  };
}

export async function getRecentEntries(db: DBKey, limit = 6): Promise<BrainEntry[]> {
  const client = getNotionClient();
  if (!client) return [];

  try {
    const res = await (client as any).dataSources.query({
      data_source_id: DATA_SOURCES[db],
      page_size: limit,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    });
    return (res.results || []).filter(isFullPageOrDataSource).map(toEntry);
  } catch {
    // Fallback: search workspace
    return searchBrain('', limit);
  }
}

export async function searchBrain(query: string, limit = 8): Promise<BrainEntry[]> {
  const client = getNotionClient();
  if (!client) return [];

  try {
    const res = await client.search({
      query,
      filter: { value: 'page', property: 'object' } as any,
      page_size: limit,
    } as any);
    return (res.results || []).filter(isFullPageOrDataSource).map(toEntry);
  } catch { return []; }
}
