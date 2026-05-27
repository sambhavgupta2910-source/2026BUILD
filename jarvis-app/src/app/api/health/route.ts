import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    groq: !!process.env.GROQ_API_KEY,
    notion: !!process.env.NOTION_TOKEN,
    timestamp: new Date().toISOString(),
  });
}
