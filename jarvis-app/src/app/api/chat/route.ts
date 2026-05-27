import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient, buildSystemPrompt, selectModel } from '@/lib/groq';
import { getBrainContext } from '@/lib/brain-context';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 });
  }

  const { message, agentContext } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  const [brainContext] = await Promise.all([getBrainContext()]);
  const systemPrompt = buildSystemPrompt(brainContext, agentContext);
  const model = selectModel(message);

  const stream = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    stream: true,
    max_tokens: 1024,
    temperature: 0.72,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
          }
        }
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Model': model,
    },
  });
}
