'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface Agent {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  glow: string;
  icon: string;
  shortcut: string;
  prompt: string;
}

const AGENTS: Agent[] = [
  {
    id: 'prism',
    name: 'PRISM',
    subtitle: 'Real Estate Intel',
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.2)',
    icon: '◈',
    shortcut: 'Dubai PSF · ROI · Inventory',
    prompt: 'PRISM Agent (Dubai real estate intelligence): ',
  },
  {
    id: 'elevate',
    name: 'ELEVATE',
    subtitle: 'Content & Brand',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.2)',
    icon: '◉',
    shortcut: 'LinkedIn · Newsletters · Reels',
    prompt: 'ELEVATE Agent (content and LinkedIn strategy): ',
  },
  {
    id: 'trading',
    name: 'TRADING',
    subtitle: 'Macro Intelligence',
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.2)',
    icon: '◆',
    shortcut: 'Macro · Gold · AI Equities',
    prompt: 'Trading Agent (macro intelligence, gold, AI equities): ',
  },
  {
    id: 'aviation',
    name: 'AVIATION',
    subtitle: 'Aviation Ops',
    color: '#ff6b35',
    glow: 'rgba(255,107,53,0.2)',
    icon: '◇',
    shortcut: 'Charter · Parts · MRO',
    prompt: 'Aviation Agent (charter operations, spare parts, MRO): ',
  },
];

interface AgentGridProps {
  onAgentActivate: (prompt: string, agentName: string) => void;
  activeAgent?: string;
  className?: string;
}

export default function AgentGrid({ onAgentActivate, activeAgent, className = '' }: AgentGridProps) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--j-glass-border)' }}>
        <span className="hud-label" style={{ color: 'var(--j-cyan)', fontSize: '0.65rem', letterSpacing: '0.18em' }}>
          ◈ AGENTS
        </span>
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {AGENTS.map((agent, i) => {
          const isActive = activeAgent === agent.id;
          return (
            <motion.button
              key={agent.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 + 0.2 }}
              onClick={() => onAgentActivate(agent.prompt, agent.id)}
              className="w-full text-left p-3 rounded transition-all duration-200 group relative overflow-hidden"
              style={{
                background: isActive ? `linear-gradient(135deg, ${agent.glow}, rgba(0,0,0,0.4))` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? agent.color + '50' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 3,
                cursor: 'pointer',
              }}
              whileHover={{
                background: `linear-gradient(135deg, ${agent.glow}, rgba(0,0,0,0.3))`,
                borderColor: agent.color + '60',
              }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="activeBar"
                  className="absolute left-0 top-0 bottom-0 w-0.5"
                  style={{ background: agent.color }}
                />
              )}

              <div className="flex items-start gap-2">
                <span style={{ color: agent.color, fontSize: '1rem', lineHeight: 1 }}>{agent.icon}</span>
                <div className="flex-1 min-w-0">
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: isActive ? agent.color : 'var(--j-text-hi)',
                      lineHeight: 1.2,
                    }}
                  >
                    {agent.name}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--j-text-mid)', marginTop: 1 }}>
                    {agent.subtitle}
                  </div>
                  <div
                    style={{
                      fontSize: '0.55rem',
                      color: 'var(--j-text-lo)',
                      marginTop: 4,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {agent.shortcut}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Model info footer */}
      <div
        className="px-3 py-2 border-t"
        style={{ borderColor: 'var(--j-glass-border)' }}
      >
        <div className="hud-label" style={{ fontSize: '0.55rem', color: 'var(--j-text-lo)' }}>
          ENGINE — GROQ FREE TIER<br />
          <span style={{ color: 'var(--j-text-lo)', letterSpacing: '0.06em' }}>
            LLAMA 3.3 70B · LLAMA 3.1 8B
          </span>
        </div>
      </div>
    </div>
  );
}
