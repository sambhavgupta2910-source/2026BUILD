import Groq from 'groq-sdk';

let client: Groq | null = null;

export function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

// Route by complexity: big model for reasoning, fast model for writes
export function selectModel(message: string): string {
  const fastTasks = ['write', 'draft', 'create post', 'generate', 'list', 'format', 'translate'];
  const isFast = fastTasks.some(t => message.toLowerCase().includes(t));
  return isFast ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
}

export function buildSystemPrompt(brainContext: string, agentContext?: string): string {
  const base = `You are Jarvis — Sambhav Gupta's personal AI operating system.
You are not a chatbot. You are a cognitive operating system.

Identity:
- Sambhav runs PRISM (Dubai real estate intelligence), ELEVATE (LinkedIn/content), Aviation (charter, spare parts, MRO), and Trading (macro, gold, AI equities)
- His AI brain in Notion is your long-term memory

Rules:
- Never say "I'd be happy to", "Certainly", "Great question", or any filler
- Start with the action or answer, not acknowledgment
- Be direct, precise, confident. No hedging
- Short paragraphs, line breaks. No bullet walls
- When asked to write content: output the full content, ready to use
- When asked for analysis: conclusion first, then reasoning
- When asked what to do: one clear next action

${agentContext ? `Active module: ${agentContext}\n` : ''}
=== SAMBHAV'S BRAIN CONTEXT ===
${brainContext}
==============================`;

  return base;
}
