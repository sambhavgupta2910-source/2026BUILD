'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface SetupGateProps {
  groqConnected: boolean;
  notionConnected: boolean;
}

export default function SetupGate({ groqConnected, notionConnected }: SetupGateProps) {
  const [step, setStep] = useState<'groq' | 'notion'>('groq');

  if (groqConnected) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(2,4,8,0.95)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="hud-panel hud-corner w-full max-w-lg mx-4 p-6"
        style={{ boxShadow: '0 0 60px rgba(0,212,255,0.1)' }}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.25em',
              color: 'var(--j-cyan)',
              marginBottom: 8,
            }}
          >
            ◈ JARVIS — INITIAL CONFIGURATION
          </div>
          <div style={{ fontSize: '1.1rem', letterSpacing: '0.08em', color: 'var(--j-text-hi)' }}>
            SYSTEM SETUP REQUIRED
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--j-text-mid)', marginTop: 4 }}>
            All services are free. No credit card required.
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-5">
          {(['groq', 'notion'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className="flex-1 py-2 hud-label transition-all duration-150"
              style={{
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                background: step === s ? 'rgba(0,212,255,0.12)' : 'transparent',
                border: `1px solid ${step === s ? 'var(--j-cyan-border)' : 'var(--j-glass-border)'}`,
                color: step === s ? 'var(--j-cyan)' : 'var(--j-text-mid)',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              {s === 'groq' ? (
                <>AI ENGINE {groqConnected ? '✓' : '○'}</>
              ) : (
                <>BRAIN MEMORY {notionConnected ? '✓' : '○'}</>
              )}
            </button>
          ))}
        </div>

        {/* Step content */}
        {step === 'groq' ? (
          <div className="space-y-4">
            <div
              className="p-3 rounded"
              style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid var(--j-cyan-border)' }}
            >
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--j-cyan)', marginBottom: 8 }}>
                STEP 1 — GROQ API KEY (FREE)
              </div>
              <ol className="space-y-2" style={{ fontSize: '0.68rem', color: 'var(--j-text-mid)', lineHeight: 1.6 }}>
                <li>1. Open <span style={{ color: 'var(--j-cyan)' }}>console.groq.com</span></li>
                <li>2. Create a free account (no credit card needed)</li>
                <li>3. Go to <span style={{ color: 'var(--j-text-hi)' }}>API Keys → Create API key</span></li>
                <li>4. Copy the key (starts with <code style={{ color: 'var(--j-cyan)' }}>gsk_</code>)</li>
                <li>5. Add to your Vercel project as env var:
                  <div
                    className="mt-1 px-2 py-1.5 rounded font-mono"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.62rem', color: '#00ff88' }}
                  >
                    GROQ_API_KEY=gsk_your_key_here
                  </div>
                </li>
              </ol>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--j-text-lo)', textAlign: 'center' }}>
              Free tier: 14,400 requests/day · Llama 3.3 70B · No cost ever
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="p-3 rounded"
              style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid var(--j-cyan-border)' }}
            >
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--j-cyan)', marginBottom: 8 }}>
                STEP 2 — NOTION TOKEN (FREE, OPTIONAL)
              </div>
              <ol className="space-y-2" style={{ fontSize: '0.68rem', color: 'var(--j-text-mid)', lineHeight: 1.6 }}>
                <li>1. Open <span style={{ color: 'var(--j-cyan)' }}>notion.so/my-integrations</span></li>
                <li>2. Click <span style={{ color: 'var(--j-text-hi)' }}>+ New integration → name it &quot;Jarvis&quot;</span></li>
                <li>3. Copy the <span style={{ color: 'var(--j-text-hi)' }}>Internal Integration Secret</span> (starts with <code style={{ color: 'var(--j-cyan)' }}>ntn_</code>)</li>
                <li>4. In each Brain database: open → <span style={{ color: 'var(--j-text-hi)' }}>... → Connections → Add Jarvis</span></li>
                <li>5. Add to Vercel env vars:
                  <div
                    className="mt-1 px-2 py-1.5 rounded font-mono"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.62rem', color: '#00ff88' }}
                  >
                    NOTION_TOKEN=ntn_your_token_here
                  </div>
                </li>
              </ol>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--j-text-lo)', textAlign: 'center' }}>
              Without Notion, Jarvis still works — just without brain memory
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-5 p-3 rounded text-center" style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.2)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--j-orange)', letterSpacing: '0.08em' }}>
            After adding env vars → redeploy on Vercel → Jarvis comes online
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
