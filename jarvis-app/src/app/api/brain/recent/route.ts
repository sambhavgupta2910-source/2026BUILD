import { NextRequest, NextResponse } from 'next/server';
import { getRecentEntries, type DBKey } from '@/lib/notion';

export async function GET(request: NextRequest) {
  const db = (request.nextUrl.searchParams.get('db') || 'inbox') as DBKey;
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '6'), 20);
  const entries = await getRecentEntries(db, limit);
  return NextResponse.json({ entries });
}
