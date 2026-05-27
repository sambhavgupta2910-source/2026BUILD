import { NextRequest, NextResponse } from 'next/server';
import { searchBrain } from '@/lib/notion';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  if (!query.trim()) return NextResponse.json({ results: [] });
  const results = await searchBrain(query, 8);
  return NextResponse.json({ results });
}
