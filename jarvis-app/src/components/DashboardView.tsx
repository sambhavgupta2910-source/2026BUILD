'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrainEntry {
  id: string;
  title: string;
  tags: string[];
  date: string;
  summary?: string;
}

interface MarketAsset {
  price: number;
  change: number;
  history: number[];
}

interface MarketData {
  gold: MarketAsset;
  silver: MarketAsset;
}

interface DashboardViewProps {
  onCommand: (text: string) => void;
  notionConnected: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDubaiTime() {
  return new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getDubaiDate() {
  return new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Dubai',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}

function getStatusBadge(tags: string[]): { label: string; cls: string } {
  const t = tags.map(x => x.toLowerCase()).join(' ');
  if (t.includes('active') || t.includes('in progress') || t.includes('ongoing'))
    return { label: 'ACTIVE', cls: 'd-badge-active' };
  if (t.includes('complete') || t.includes('done') || t.includes('finished'))
    return { label: 'COMPLETE', cls: 'd-badge-complete' };
  if (t.includes('running') || t.includes('live') || t.includes('deployed'))
    return { label: 'RUNNING', cls: 'd-badge-running' };
  return { label: 'PENDING', cls: 'd-badge-pending' };
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────

function Sparkline({ data, color = '#c8a84b', width = 120, height = 36 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return <svg width={width} height={height} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x},${y}`;
  }).join(' ');

  const lastX = ((data.length - 1) / (data.length - 1)) * (width - 4) + 2;
  const lastY = height - 4 - ((data[data.length - 1] - min) / range) * (height - 8);

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* last point dot */}
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} opacity={0.9} />
    </svg>
  );
}

// ─── Bar Chart SVG ────────────────────────────────────────────────────────────

function BarChart({ data, labels, color = '#c8a84b', width = 200, height = 60 }: {
  data: number[];
  labels?: string[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data) || 1;
  const barW = Math.floor((width - (data.length - 1) * 3) / data.length);

  return (
    <svg width={width} height={height}>
      {data.map((v, i) => {
        const barH = Math.max(2, (v / max) * (height - 14));
        const x = i * (barW + 3);
        const y = height - 14 - barH;
        return (
          <g key={i}>
            <rect
              x={x} y={y}
              width={barW} height={barH}
              fill={color}
              opacity={0.25 + (v / max) * 0.6}
              rx={0}
            />
            {labels && labels[i] && (
              <text
                x={x + barW / 2} y={height - 2}
                textAnchor="middle"
                fontSize={7}
                fill="rgba(200,168,75,0.5)"
                fontFamily="monospace"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── World Map SVG ────────────────────────────────────────────────────────────

const CITIES: { name: string; lon: number; lat: number }[] = [
  { name: 'DXB', lon: 55.3,   lat: 25.2  },
  { name: 'LHR', lon: -0.1,   lat: 51.5  },
  { name: 'SIN', lon: 103.8,  lat: 1.3   },
  { name: 'NYC', lon: -74.0,  lat: 40.7  },
  { name: 'BOM', lon: 72.8,   lat: 19.1  },
];

// Simple equirectangular projection
function project(lon: number, lat: number, w: number, h: number) {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

// Quadratic bezier midpoint (slightly elevated arc)
function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.15;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

function WorldMap({ width = 300, height = 120 }: { width?: number; height?: number }) {
  const projected = CITIES.map(c => ({ ...c, ...project(c.lon, c.lat, width, height) }));
  const hub = projected[0]; // Dubai is hub

  return (
    <svg
      width={width}
      height={height}
      style={{ overflow: 'visible', display: 'block' }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Faint world outline rectangle */}
      <rect x={0} y={0} width={width} height={height}
        fill="none" stroke="rgba(200,168,75,0.06)" strokeWidth={0.5} />

      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={0} y1={f * height} x2={width} y2={f * height}
          stroke="rgba(200,168,75,0.05)" strokeWidth={0.5} />
      ))}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={f * width} y1={0} x2={f * width} y2={height}
          stroke="rgba(200,168,75,0.05)" strokeWidth={0.5} />
      ))}

      {/* Arcs from hub to each city */}
      {projected.slice(1).map((city, i) => (
        <path
          key={i}
          d={arcPath(hub.x, hub.y, city.x, city.y)}
          fill="none"
          stroke="rgba(200,168,75,0.35)"
          strokeWidth={0.8}
          strokeDasharray="3 2"
        />
      ))}

      {/* City dots + labels */}
      {projected.map((city) => (
        <g key={city.name}>
          <circle
            cx={city.x} cy={city.y} r={city.name === 'DXB' ? 3.5 : 2.2}
            fill={city.name === 'DXB' ? '#c8a84b' : 'rgba(200,168,75,0.6)'}
            stroke="rgba(200,168,75,0.3)"
            strokeWidth={0.5}
          />
          <text
            x={city.x + 4} y={city.y + 3}
            fontSize={6} fill="rgba(200,168,75,0.7)" fontFamily="monospace"
          >
            {city.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Panel entrance variant ───────────────────────────────────────────────────

const panelVariant = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' as const },
  }),
};

// ─── NAV items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { icon: string; label: string; command: string }[] = [
  { icon: '⌂',  label: 'HOME',       command: 'Give me a full briefing on everything important today.' },
  { icon: '◈',  label: 'ANALYTICS',  command: 'Give me an analytics overview of all projects and performance.' },
  { icon: '◉',  label: 'TEAMS',      command: 'Give me a teams and people briefing.' },
  { icon: '◎',  label: 'LOGISTICS',  command: 'Give me a logistics brief — shipping, supply chain, operations.' },
  { icon: '⋈',  label: 'MARKETING',  command: 'What is the current marketing performance and reach?' },
  { icon: '⚙',  label: 'AUTOMATION', command: 'Show me the status of all automation scripts and workflows.' },
  { icon: '✦',  label: 'SETTINGS',   command: 'What configuration or settings should I review?' },
  { icon: '◷',  label: 'PROFILE',    command: 'Give me a personal productivity and goals summary.' },
];

// ─── Supply chain items (static / realistic) ─────────────────────────────────

const SUPPLY_ITEMS = [
  { label: 'Global Network',           status: 'ACTIVE',   cls: 'd-badge-active'   },
  { label: 'Logistics Optimisation',   status: 'COMPLETE', cls: 'd-badge-complete' },
  { label: 'Shipping Coordination',    status: 'PENDING',  cls: 'd-badge-pending'  },
  { label: 'Data Reporting',           status: 'RUNNING',  cls: 'd-badge-running'  },
];

// ─── Brand reach data ─────────────────────────────────────────────────────────

const BRAND_DATA = [11, 22, 37, 40, 60, 80, 89, 100]; // relative units (×0.1m)
const BRAND_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardView({ onCommand, notionConnected }: DashboardViewProps) {
  const [dubaiTime, setDubaiTime] = useState(getDubaiTime());
  const [dubaiDate, setDubaiDate] = useState(getDubaiDate());
  const [scheduleEntries, setScheduleEntries] = useState<BrainEntry[]>([]);
  const [projectEntries, setProjectEntries] = useState<BrainEntry[]>([]);
  const [terminalEntries, setTerminalEntries] = useState<BrainEntry[]>([]);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [lastUpdated, setLastUpdated] = useState('—');
  const terminalRef = useRef<HTMLDivElement>(null);

  // Dubai clock
  useEffect(() => {
    const t = setInterval(() => {
      setDubaiTime(getDubaiTime());
      setDubaiDate(getDubaiDate());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch Notion data
  const fetchNotion = useCallback(async () => {
    if (!notionConnected) return;
    try {
      const [schedRes, projRes, termRes] = await Promise.all([
        fetch('/api/brain/recent?db=inbox&limit=5'),
        fetch('/api/brain/recent?db=inbox&limit=4'),
        fetch('/api/brain/recent?db=inbox&limit=4'),
      ]);
      const [schedData, projData, termData] = await Promise.all([
        schedRes.json(),
        projRes.json(),
        termRes.json(),
      ]);
      setScheduleEntries(schedData.entries || []);
      setProjectEntries(projData.entries || []);
      setTerminalEntries(termData.entries || []);
    } catch {
      // graceful fallback — keep existing state
    }
  }, [notionConnected]);

  useEffect(() => {
    fetchNotion();
    const t = setInterval(fetchNotion, 60_000);
    return () => clearInterval(t);
  }, [fetchNotion]);

  // Fetch market data
  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market');
      if (res.ok) {
        const data = await res.json();
        setMarket(data);
      }
    } catch {
      // use null — component renders fallback
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const t = setInterval(fetchMarket, 5 * 60_000);
    return () => clearInterval(t);
  }, [fetchMarket]);

  // Update "last updated" every minute
  useEffect(() => {
    const update = () =>
      setLastUpdated(
        new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalEntries]);

  // ── MOCK fallback entries (shown when Notion not connected) ──
  const mockSchedule: BrainEntry[] = [
    { id: 'm1', title: 'Team standup — DXB office', tags: ['meeting'], date: '09:00' },
    { id: 'm2', title: 'Supply chain review call', tags: ['logistics'], date: '11:30' },
    { id: 'm3', title: 'Investor update preparation', tags: ['finance'], date: '14:00' },
    { id: 'm4', title: 'Marketing brief review', tags: ['marketing'], date: '15:30' },
    { id: 'm5', title: 'EOD operations report', tags: ['ops'], date: '18:00' },
  ];
  const mockProjects: BrainEntry[] = [
    { id: 'p1', title: 'PRISM Trading Platform', tags: ['active'], date: '2026-05-27' },
    { id: 'p2', title: 'Elevate Brand Expansion', tags: ['active'], date: '2026-05-26' },
    { id: 'p3', title: 'Aviation Logistics Suite', tags: ['pending'], date: '2026-05-25' },
    { id: 'p4', title: 'Data Pipeline Migration', tags: ['complete'], date: '2026-05-24' },
  ];
  const mockTerminal: BrainEntry[] = [
    { id: 't1', title: 'Notion sync completed — 42 entries indexed', tags: [], date: '' },
    { id: 't2', title: 'Market data refresh — GC=F, SI=F', tags: [], date: '' },
    { id: 't3', title: 'Automation workflow triggered: EOD report', tags: [], date: '' },
    { id: 't4', title: 'Health check passed — all systems nominal', tags: [], date: '' },
  ];

  const displaySchedule  = notionConnected && scheduleEntries.length > 0  ? scheduleEntries  : mockSchedule;
  const displayProjects  = notionConnected && projectEntries.length > 0   ? projectEntries   : mockProjects;
  const displayTerminal  = notionConnected && terminalEntries.length > 0  ? terminalEntries  : mockTerminal;

  const goldData   = market?.gold   ?? { price: 3342.50, change: +0.42, history: [3290, 3305, 3318, 3300, 3325, 3338, 3342] };
  const silverData = market?.silver ?? { price: 32.74,   change: +0.18, history: [31.80, 32.10, 32.40, 32.20, 32.55, 32.68, 32.74] };

  // ── Panel header helper ──
  const PanelHeader = ({ title, sub }: { title: string; sub?: string }) => (
    <div
      className="flex items-center justify-between px-3 py-2 border-b"
      style={{ borderColor: 'var(--d-border)' }}
    >
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', color: 'var(--d-gold)', fontFamily: 'monospace' }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--d-text-lo)', fontFamily: 'monospace' }}>
          {sub}
        </div>
      )}
    </div>
  );

  // ───────────────────────────────────────────────────────── RENDER ──────────

  return (
    <div
      className="d-grid flex flex-col overflow-hidden"
      style={{ height: '100%', color: 'var(--d-text-hi)', fontFamily: 'monospace' }}
    >
      {/* ─── Three-column grid ─── */}
      <div
        className="flex-1 overflow-hidden grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          gap: '1px',
          background: 'var(--d-border)',
          minHeight: 0,
        }}
      >
        {/* ══════════════ LEFT — MACRO VIEW ══════════════ */}
        <motion.div
          custom={0}
          variants={panelVariant}
          initial="hidden"
          animate="show"
          className="d-panel flex flex-col overflow-hidden"
          style={{ background: 'var(--d-panel)' }}
        >
          <PanelHeader title="MACRO VIEW" sub="LIVE" />

          {/* Dubai clock */}
          <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--d-border)' }}>
            <div style={{ fontSize: '0.48rem', letterSpacing: '0.18em', color: 'var(--d-text-lo)', marginBottom: 2 }}>
              DUBAI  ·  GMT+4
            </div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--d-gold)',
                lineHeight: 1.1,
                textShadow: '0 0 18px rgba(200,168,75,0.4)',
              }}
            >
              {dubaiTime}
            </div>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--d-text-mid)', marginTop: 2 }}>
              {dubaiDate}
            </div>
          </div>

          {/* Schedule */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-3 pt-2 pb-1">
              <span style={{ fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--d-text-lo)' }}>
                UPCOMING SCHEDULE
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-2">
              {displaySchedule.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 py-1.5"
                  style={{
                    borderBottom: i < displaySchedule.length - 1 ? '1px solid rgba(200,168,75,0.06)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: '100%',
                      minHeight: 24,
                      background: i === 0 ? 'var(--d-teal)' : 'var(--d-text-lo)',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.62rem',
                        color: i === 0 ? 'var(--d-text-hi)' : 'var(--d-text-mid)',
                        letterSpacing: '0.02em',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {entry.title}
                    </div>
                    {entry.tags.length > 0 && (
                      <div style={{ fontSize: '0.48rem', color: 'var(--d-text-lo)', letterSpacing: '0.08em', marginTop: 1 }}>
                        {entry.tags[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--d-text-lo)', flexShrink: 0, letterSpacing: '0.05em' }}>
                    {entry.date ? entry.date.slice(0, 10) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Pulse */}
          <div className="border-t px-3 py-2" style={{ borderColor: 'var(--d-border)' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--d-text-lo)', marginBottom: 6 }}>
              MARKET PULSE
            </div>

            {/* Gold */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <div style={{ fontSize: '0.52rem', color: 'var(--d-text-mid)', letterSpacing: '0.12em' }}>XAU/USD</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--d-gold)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  ${goldData.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div
                  style={{
                    fontSize: '0.52rem',
                    color: goldData.change >= 0 ? 'var(--d-teal)' : '#e84040',
                    letterSpacing: '0.06em',
                  }}
                >
                  {goldData.change >= 0 ? '+' : ''}{goldData.change}%
                </div>
              </div>
              <Sparkline data={goldData.history} color="#c8a84b" width={90} height={30} />
            </div>

            {/* Silver */}
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: '0.52rem', color: 'var(--d-text-mid)', letterSpacing: '0.12em' }}>XAG/USD</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--d-text-hi)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  ${silverData.price.toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: '0.52rem',
                    color: silverData.change >= 0 ? 'var(--d-teal)' : '#e84040',
                    letterSpacing: '0.06em',
                  }}
                >
                  {silverData.change >= 0 ? '+' : ''}{silverData.change}%
                </div>
              </div>
              <Sparkline data={silverData.history} color="rgba(200,168,75,0.55)" width={90} height={30} />
            </div>
          </div>
        </motion.div>

        {/* ══════════════ CENTER — CORE OPERATIONS ══════════════ */}
        <motion.div
          custom={1}
          variants={panelVariant}
          initial="hidden"
          animate="show"
          className="d-panel flex flex-col overflow-hidden"
          style={{ background: 'var(--d-panel)' }}
        >
          <PanelHeader title="CORE OPERATIONS" sub={`SYNC ${lastUpdated}`} />

          {/* Project status cards */}
          <div className="px-3 pt-2 pb-2 border-b" style={{ borderColor: 'var(--d-border)' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--d-text-lo)', marginBottom: 6 }}>
              PROJECT STATUS
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {displayProjects.map(proj => {
                const badge = getStatusBadge(proj.tags);
                return (
                  <div
                    key={proj.id}
                    style={{
                      background: 'rgba(200,168,75,0.04)',
                      border: '1px solid rgba(200,168,75,0.1)',
                      padding: '6px 8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.6rem',
                        color: 'var(--d-text-hi)',
                        lineHeight: 1.3,
                        marginBottom: 5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {proj.title}
                    </div>
                    <span
                      className={badge.cls}
                      style={{
                        fontSize: '0.45rem',
                        letterSpacing: '0.12em',
                        padding: '1px 5px',
                        borderRadius: 10,
                        display: 'inline-block',
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* World map */}
          <div className="px-3 pt-2 pb-2 border-b flex-shrink-0" style={{ borderColor: 'var(--d-border)' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--d-text-lo)', marginBottom: 6 }}>
              GLOBAL NETWORK  ·  5 NODES ACTIVE
            </div>
            <div style={{ width: '100%', overflowX: 'hidden' }}>
              <WorldMap width={320} height={110} />
            </div>
            <div className="flex gap-3 mt-1 flex-wrap">
              {CITIES.map(c => (
                <div key={c.name} className="flex items-center gap-1">
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: c.name === 'DXB' ? 'var(--d-gold)' : 'rgba(200,168,75,0.5)' }} />
                  <span style={{ fontSize: '0.48rem', color: 'var(--d-text-lo)', letterSpacing: '0.08em' }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supply chain status */}
          <div className="flex-1 px-3 py-2 overflow-y-auto">
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--d-text-lo)', marginBottom: 6 }}>
              SUPPLY CHAIN STATUS
            </div>
            <div className="flex flex-col gap-1.5">
              {SUPPLY_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between"
                  style={{
                    padding: '5px 8px',
                    background: 'rgba(200,168,75,0.03)',
                    border: '1px solid rgba(200,168,75,0.07)',
                  }}
                >
                  <span style={{ fontSize: '0.6rem', color: 'var(--d-text-mid)', letterSpacing: '0.04em' }}>
                    {item.label}
                  </span>
                  <span
                    className={item.cls}
                    style={{ fontSize: '0.45rem', letterSpacing: '0.1em', padding: '1px 6px', borderRadius: 10 }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ══════════════ RIGHT — GROWTH ENGINE ══════════════ */}
        <motion.div
          custom={2}
          variants={panelVariant}
          initial="hidden"
          animate="show"
          className="d-panel flex flex-col overflow-hidden"
          style={{ background: 'var(--d-panel)' }}
        >
          <PanelHeader title="GROWTH ENGINE" sub="LIVE" />

          {/* Brand Reach bar chart */}
          <div className="px-3 pt-2 pb-2 border-b" style={{ borderColor: 'var(--d-border)' }}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--d-text-lo)' }}>
                BRAND REACH
              </span>
              <span style={{ fontSize: '0.5rem', color: 'var(--d-gold)', letterSpacing: '0.06em' }}>
                10.0M  ↑82%
              </span>
            </div>
            <div style={{ width: '100%', overflowX: 'hidden' }}>
              <BarChart
                data={BRAND_DATA}
                labels={BRAND_LABELS}
                color="#c8a84b"
                width={220}
                height={70}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span style={{ fontSize: '0.48rem', color: 'var(--d-text-lo)' }}>1.1M JAN</span>
              <span style={{ fontSize: '0.48rem', color: 'var(--d-gold)' }}>10.0M AUG</span>
            </div>
          </div>

          {/* Automation terminal */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-3 pt-2 pb-1 border-b" style={{ borderColor: 'var(--d-border)' }}>
              <div className="flex items-center gap-2">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--d-teal)', boxShadow: '0 0 6px rgba(45,155,138,0.6)' }} />
                <span style={{ fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--d-text-lo)' }}>
                  AUTOMATION SCRIPTS  ·  TERMINAL
                </span>
              </div>
            </div>
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-3"
              style={{
                background: 'rgba(10,10,8,0.8)',
                fontSize: '0.58rem',
                lineHeight: 1.7,
                letterSpacing: '0.03em',
                color: 'rgba(200,168,75,0.7)',
                fontFamily: 'monospace',
              }}
            >
              <div style={{ color: 'var(--d-text-lo)', marginBottom: 4, fontSize: '0.5rem' }}>
                JARVIS AUTOMATION v1.0 — SAMBHAV OS
              </div>
              <div style={{ color: 'var(--d-text-lo)', marginBottom: 8, fontSize: '0.5rem' }}>
                ─────────────────────────────
              </div>
              {displayTerminal.map((entry) => (
                <div key={entry.id} style={{ marginBottom: 2 }}>
                  <span style={{ color: 'var(--d-teal)', marginRight: 4 }}>&gt;</span>
                  <span style={{ color: 'var(--d-text-mid)' }}>LOG:</span>{' '}
                  <span>{entry.title}</span>
                </div>
              ))}
              <div style={{ marginTop: 4 }}>
                <span style={{ color: 'var(--d-teal)' }}>&gt;</span>{' '}
                <span className="d-cursor" />
              </div>
            </div>
          </div>

          {/* Last updated footer */}
          <div
            className="px-3 py-1.5 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--d-border)' }}
          >
            <span style={{ fontSize: '0.48rem', color: 'var(--d-text-lo)', letterSpacing: '0.08em' }}>
              LAST UPDATED
            </span>
            <span style={{ fontSize: '0.48rem', color: 'var(--d-text-lo)', letterSpacing: '0.08em' }}>
              {lastUpdated} GST
            </span>
          </div>
        </motion.div>
      </div>

      {/* ─── Bottom Navigation Bar ─── */}
      <div
        className="flex-shrink-0 border-t flex items-center justify-center gap-1 px-4 py-1"
        style={{
          borderColor: 'var(--d-border)',
          background: 'rgba(14,14,10,0.97)',
          backdropFilter: 'blur(12px)',
          flexWrap: 'wrap',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            className="d-nav-btn"
            onClick={() => onCommand(item.command)}
            title={item.command}
          >
            <span className="d-nav-icon">{item.icon}</span>
            <span className="d-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
