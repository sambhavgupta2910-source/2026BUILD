'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BrainEntry {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  date: string;
  url: string;
}

type Tab = 'inbox' | 'decisions' | 'entities';

const TABS: { key: Tab; label: string }[] = [
  { key: 'inbox',     label: 'INBOX' },
  { key: 'decisions', label: 'DECISIONS' },
  { key: 'entities',  label: 'ENTITIES' },
];

interface BrainPanelProps {
  notionConnected: boolean;
  onEntryClick: (entry: BrainEntry) => void;
  className?: string;
}

export default function BrainPanel({ notionConnected, onEntryClick, className = '' }: BrainPanelProps) {
  const [tab, setTab] = useState<Tab>('inbox');
  const [entries, setEntries] = useState<BrainEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string>('—');

  const fetchEntries = useCallback(async () => {
    if (!notionConnected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/brain/recent?db=${tab}&limit=6`);
      const data = await res.json();
      setEntries(data.entries || []);
      setLastSync(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [tab, notionConnected]);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 60_000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  return (
    <div className={`hud-panel flex flex-col h-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--j-glass-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="hud-label" style={{ color: 'var(--j-cyan)', fontSize: '0.65rem', letterSpacing: '0.18em' }}>
              ◈ BRAIN
            </span>
            {notionConnected ? (
              <div className="pulse-dot-cyan" style={{ width: 5, height: 5 }} />
            ) : (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--j-red)' }} />
            )}
          </div>
          <span className="hud-label" style={{ fontSize: '0.55rem' }}>
            {notionConnected ? `SYNC ${lastSync}` : 'NOT CONNECTED'}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="hud-label px-2 py-1 rounded transition-all duration-150"
              style={{
                fontSize: '0.58rem',
                letterSpacing: '0.1em',
                background: tab === t.key ? 'rgba(0,212,255,0.12)' : 'transparent',
                color: tab === t.key ? 'var(--j-cyan)' : 'var(--j-text-mid)',
                border: `1px solid ${tab === t.key ? 'var(--j-cyan-border)' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {!notionConnected ? (
          <div className="p-3 text-center" style={{ color: 'var(--j-text-mid)' }}>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.05em', lineHeight: 1.6 }}>
              NOTION NOT CONNECTED<br />
              <span style={{ color: 'var(--j-text-lo)', fontSize: '0.6rem' }}>
                Add NOTION_TOKEN to enable brain memory
              </span>
            </div>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-8 gap-2">
            {[0,1,2].map(i => (
              <div
                key={i}
                className="thinking-dot"
                style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--j-cyan)' }}
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-3 text-center" style={{ color: 'var(--j-text-lo)', fontSize: '0.65rem' }}>
            NO ENTRIES FOUND
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onEntryClick(entry)}
                className="p-2 rounded cursor-pointer transition-all duration-150 group"
                style={{
                  background: 'rgba(0,212,255,0.03)',
                  border: '1px solid var(--j-glass-border)',
                  borderRadius: 2,
                }}
                whileHover={{ background: 'rgba(0,212,255,0.07)', borderColor: 'rgba(0,212,255,0.25)' }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    lineHeight: 1.3,
                    color: 'var(--j-text-hi)',
                    marginBottom: 4,
                    letterSpacing: '0.02em',
                  }}
                  className="group-hover:text-cyan-300 transition-colors"
                >
                  {entry.title.length > 42 ? entry.title.slice(0, 42) + '…' : entry.title}
                </div>
                {entry.summary && (
                  <div
                    style={{ fontSize: '0.6rem', color: 'var(--j-text-mid)', lineHeight: 1.4 }}
                  >
                    {entry.summary.slice(0, 70)}{entry.summary.length > 70 ? '…' : ''}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {entry.tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.52rem',
                        letterSpacing: '0.08em',
                        background: 'rgba(0,212,255,0.08)',
                        color: 'var(--j-cyan-dim)',
                        border: '1px solid rgba(0,212,255,0.15)',
                        padding: '1px 5px',
                        borderRadius: 2,
                      }}
                    >
                      {tag.toUpperCase()}
                    </span>
                  ))}
                  <span style={{ fontSize: '0.52rem', color: 'var(--j-text-lo)', marginLeft: 'auto' }}>
                    {entry.date}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      {notionConnected && entries.length > 0 && (
        <div
          className="px-3 py-2 border-t text-center"
          style={{ borderColor: 'var(--j-glass-border)' }}
        >
          <button
            onClick={fetchEntries}
            className="hud-label transition-colors"
            style={{
              fontSize: '0.55rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              color: 'var(--j-text-lo)',
              background: 'none',
              border: 'none',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--j-cyan)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--j-text-lo)')}
          >
            ↺ REFRESH
          </button>
        </div>
      )}
    </div>
  );
}
