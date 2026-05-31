import { NextResponse } from 'next/server';
import { getRecentEntries } from '@/lib/notion';

// 2-minute cache
let cache: { data: BriefingData; ts: number } | null = null;
const TTL = 120_000;

interface ProjectStatus {
  name: string;
  status: string;
  entries: string[];
}

interface BriefingData {
  projects: ProjectStatus[];
  recentDecisions: string[];
  recentEntities: string[];
  weekSummary: string[];
}

const PROJECT_NAMES = ['PRISM', 'ELEVATE', 'Trading', 'Aviation'];

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const [inboxEntries, decisionEntries, entityEntries] = await Promise.all([
      getRecentEntries('inbox', 12),
      getRecentEntries('decisions', 8),
      getRecentEntries('entities', 8),
    ]);

    // Group inbox entries by project
    const projects: ProjectStatus[] = PROJECT_NAMES.map(name => {
      const related = inboxEntries.filter(e =>
        e.title.toLowerCase().includes(name.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(name.toLowerCase())) ||
        e.summary.toLowerCase().includes(name.toLowerCase())
      );
      return {
        name,
        status: related.length > 0 ? 'ACTIVE' : 'STANDBY',
        entries: related.slice(0, 3).map(e => e.title),
      };
    });

    // Project-less inbox items as week summary
    const weekSummary = inboxEntries
      .filter(e => !PROJECT_NAMES.some(p =>
        e.title.toLowerCase().includes(p.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(p.toLowerCase()))
      ))
      .slice(0, 5)
      .map(e => e.title);

    const data: BriefingData = {
      projects,
      recentDecisions: decisionEntries.slice(0, 5).map(e => e.title),
      recentEntities:  entityEntries.slice(0, 5).map(e => e.title),
      weekSummary,
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch {
    // Fallback with empty data so the UI still renders
    const fallback: BriefingData = {
      projects: PROJECT_NAMES.map(name => ({ name, status: 'STANDBY', entries: [] })),
      recentDecisions: [],
      recentEntities: [],
      weekSummary: [],
    };
    return NextResponse.json(fallback);
  }
}
