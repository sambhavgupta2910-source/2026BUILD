import { getRecentEntries, type BrainEntry } from './notion';

interface CacheEntry {
  context: string;
  entries: { inbox: BrainEntry[]; decisions: BrainEntry[] };
  expiry: number;
}

let cache: CacheEntry | null = null;

function compress(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function formatEntry(e: BrainEntry): string {
  const tag = e.tags.length ? ` [${e.tags.slice(0, 2).join(', ')}]` : '';
  const summary = e.summary ? ` — ${compress(e.summary)}` : '';
  return `• ${e.title}${tag}${summary}`;
}

export async function getBrainContext(): Promise<string> {
  if (cache && Date.now() < cache.expiry) return cache.context;

  const [inbox, decisions] = await Promise.all([
    getRecentEntries('inbox', 6),
    getRecentEntries('decisions', 4),
  ]);

  if (!inbox.length && !decisions.length) {
    return '(Brain not connected. Add NOTION_TOKEN to enable memory.)';
  }

  const lines: string[] = [];

  if (inbox.length) {
    lines.push('RECENT BRAIN ENTRIES:');
    inbox.forEach(e => lines.push(formatEntry(e)));
  }
  if (decisions.length) {
    lines.push('');
    lines.push('KEY DECISIONS:');
    decisions.forEach(e => lines.push(formatEntry(e)));
  }

  const context = lines.join('\n');
  cache = { context, entries: { inbox, decisions }, expiry: Date.now() + 5 * 60 * 1000 };
  return context;
}

export async function getCachedEntries() {
  await getBrainContext(); // warm cache
  return cache?.entries ?? { inbox: [], decisions: [] };
}
