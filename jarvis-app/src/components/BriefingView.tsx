'use client';
import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ─── Neural network particle visualization ────────────────────────────────

const NODE_COUNT = 120;
const CONNECT_DIST = 2.2;

const NeuralNet: React.FC<{ active: boolean }> = ({ active }) => {
  const pointsRef  = useRef<THREE.Points>(null!);
  const linesRef   = useRef<THREE.LineSegments>(null!);
  const burstRef   = useRef<THREE.Mesh>(null!);
  const speed      = useRef(active ? 1.8 : 0.6);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(NODE_COUNT * 3);
    const vel = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const r = 1.5 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi) * 0.4;
      vel[i * 3]     = (Math.random() - 0.5) * 0.004;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.004;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return { positions: pos, velocities: vel };
  }, []);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const maxLines = NODE_COUNT * NODE_COUNT;
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxLines * 6), 3));
    return g;
  }, []);

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(), 3));
    return g;
  }, [positions]);

  const nodeMat  = useMemo(() => new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.06, transparent: true, opacity: 0.9 }), []);
  const lineMat  = useMemo(() => new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.18, vertexColors: false }), []);
  const burstMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.0 }), []);

  const pos = positions.slice();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    speed.current = THREE.MathUtils.lerp(speed.current, active ? 1.8 : 0.6, 0.03);
    const s = speed.current;

    // Move nodes
    for (let i = 0; i < NODE_COUNT; i++) {
      pos[i * 3]     += velocities[i * 3]     * s;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * s;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * s;
      // Soft boundary bounce
      const r = Math.sqrt(pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2);
      if (r > 5.5 || r < 0.5) {
        velocities[i * 3]     *= -1;
        velocities[i * 3 + 1] *= -1;
        velocities[i * 3 + 2] *= -1;
      }
    }

    // Update node positions
    const nodePos = nodeGeo.attributes.position as THREE.BufferAttribute;
    (nodePos.array as Float32Array).set(pos);
    nodePos.needsUpdate = true;

    // Build connection lines
    const linePos = lineGeo.attributes.position as THREE.BufferAttribute;
    const lineArr = linePos.array as Float32Array;
    let lineIdx = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < CONNECT_DIST) {
          lineArr[lineIdx++] = pos[i * 3];
          lineArr[lineIdx++] = pos[i * 3 + 1];
          lineArr[lineIdx++] = pos[i * 3 + 2];
          lineArr[lineIdx++] = pos[j * 3];
          lineArr[lineIdx++] = pos[j * 3 + 1];
          lineArr[lineIdx++] = pos[j * 3 + 2];
        }
      }
    }
    lineGeo.setDrawRange(0, lineIdx / 3);
    linePos.needsUpdate = true;

    // Central burst pulse
    if (burstRef.current) {
      const pulse = Math.sin(t * s * 2) * 0.5 + 0.5;
      burstRef.current.scale.setScalar(0.3 + pulse * (active ? 1.8 : 0.6));
      burstMat.opacity = pulse * (active ? 0.6 : 0.25);
    }

    // Slow global rotation
    if (pointsRef.current) pointsRef.current.rotation.z = t * 0.02 * s;
    if (linesRef.current)  linesRef.current.rotation.z  = t * 0.02 * s;
  });

  return (
    <>
      <mesh ref={burstRef} material={burstMat}>
        <circleGeometry args={[1, 64]} />
      </mesh>
      <points ref={pointsRef} geometry={nodeGeo} material={nodeMat} />
      <lineSegments ref={linesRef} geometry={lineGeo} material={lineMat} />
    </>
  );
};

// ─── KPI Panel ────────────────────────────────────────────────────────────

interface KPIItem { label: string; value: string; delta?: string; up?: boolean }

const KPIPanel: React.FC<{
  title: string;
  sub?: string;
  items: KPIItem[];
  accent?: string;
  style?: React.CSSProperties;
}> = ({ title, sub, items, accent = '#00d4ff', style }) => (
  <div style={{
    background: 'rgba(4,8,16,0.88)',
    border: `1px solid ${accent}33`,
    backdropFilter: 'blur(12px)',
    padding: '10px 14px',
    minWidth: 180,
    ...style,
  }}>
    <div style={{ fontSize: '0.45rem', letterSpacing: '0.22em', color: `${accent}99`, fontFamily: 'monospace', marginBottom: 2 }}>
      {title}
    </div>
    {sub && (
      <div style={{ fontSize: '0.40rem', letterSpacing: '0.14em', color: `${accent}55`, fontFamily: 'monospace', marginBottom: 8 }}>
        {sub}
      </div>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map(({ label, value, delta, up }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: '0.50rem', color: 'rgba(180,200,220,0.6)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
            {label}
          </span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: accent, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.04em', textShadow: `0 0 10px ${accent}` }}>
              {value}
            </span>
            {delta && (
              <span style={{ fontSize: '0.42rem', color: up ? '#00ff88' : '#ff4455', marginLeft: 5, fontFamily: 'monospace' }}>
                {up ? '▲' : '▼'}{delta}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Briefing View ────────────────────────────────────────────────────────

interface BriefingViewProps {
  active: boolean;
  lastMessage?: string;
  groqOk: boolean;
  notionOk: boolean;
}

interface ProjectStatus { name: string; status: string; entries: string[] }
interface BriefingData {
  projects: ProjectStatus[];
  recentDecisions: string[];
  recentEntities: string[];
  weekSummary: string[];
}

export default function BriefingView({ active, lastMessage, groqOk, notionOk }: BriefingViewProps) {
  const [clock, setClock] = useState('');
  const [date, setDate] = useState('');
  const [briefing, setBriefing] = useState<BriefingData | null>(null);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing');
      if (res.ok) setBriefing(await res.json());
    } catch { /* use mock data */ }
  }, []);

  useEffect(() => {
    if (notionOk) fetchBriefing();
  }, [notionOk, fetchBriefing]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDate(now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#020408', overflow: 'hidden', fontFamily: 'monospace' }}>

      {/* Neural net canvas */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}>
          <NeuralNet active={active} />
          <EffectComposer>
            <Bloom intensity={active ? 1.6 : 0.8} luminanceThreshold={0.05} luminanceSmoothing={0.5} mipmapBlur />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(2,4,8,0.7)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,212,255,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#00d4ff' }}>JARVIS</span>
          <span style={{ fontSize: '0.45rem', letterSpacing: '0.15em', color: 'rgba(0,212,255,0.5)' }}>SAMBHAV OS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: '2px 10px', border: `1px solid ${active ? '#00ff88' : '#00d4ff'}55`, background: active ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,255,0.08)' }}>
            <span style={{ fontSize: '0.45rem', letterSpacing: '0.2em', color: active ? '#00ff88' : '#00d4ff' }}>
              {active ? '◈ BRIEFING — LIVE' : '◉ STANDBY'}
            </span>
          </div>
          {notionOk && (
            <button
              onClick={fetchBriefing}
              style={{ padding: '2px 8px', border: '1px solid rgba(0,212,255,0.3)', background: 'transparent', cursor: 'pointer', fontSize: '0.42rem', letterSpacing: '0.15em', color: 'rgba(0,212,255,0.6)', fontFamily: 'monospace' }}
              title="Refresh Notion data"
            >
              ↺ SYNC
            </button>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: '#00d4ff', fontWeight: 700 }}>{clock}</div>
          <div style={{ fontSize: '0.42rem', letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)' }}>DUBAI · {date}</div>
        </div>
      </div>

      {/* Top-left: This Week / Brain Inbox */}
      <div style={{ position: 'absolute', top: 60, left: 20 }}>
        {briefing ? (
          <KPIPanel
            title="BRAIN · INBOX"
            sub={`${briefing.weekSummary.length} RECENT ITEMS`}
            accent="#00d4ff"
            items={briefing.weekSummary.length > 0
              ? briefing.weekSummary.slice(0, 4).map(t => ({ label: t.slice(0, 28), value: '—' }))
              : [{ label: 'NO ITEMS', value: '—' }]
            }
          />
        ) : (
          <KPIPanel
            title="THIS WEEK"
            sub="LAST 7 DAYS"
            accent="#00d4ff"
            items={[
              { label: 'NEW CLIENTS ONBOARDED', value: notionOk ? '...' : '4',      delta: '2',   up: true },
              { label: 'NEW MRR',               value: notionOk ? '...' : '$11,000', delta: '18%', up: true },
              { label: 'ACTIVE COMMUNITY',      value: notionOk ? '...' : '847',     delta: '12',  up: true },
            ]}
          />
        )}
      </div>

      {/* Bottom-left: Decisions */}
      <div style={{ position: 'absolute', bottom: 90, left: 20 }}>
        {briefing ? (
          <KPIPanel
            title="OPEN DECISIONS"
            accent="#fbbf24"
            items={briefing.recentDecisions.length > 0
              ? briefing.recentDecisions.slice(0, 4).map(t => ({ label: t.slice(0, 26), value: '⬡' }))
              : [{ label: 'NO OPEN DECISIONS', value: '✓' }]
            }
          />
        ) : (
          <KPIPanel
            title="YESTERDAY · ADS"
            accent="#fbbf24"
            items={[
              { label: 'TOTAL SPEND',  value: '$487'  },
              { label: 'RETURN ON AD', value: '3.6x', delta: '0.4',  up: true },
              { label: 'BEST CTR',     value: '8.2%', delta: '1.1%', up: true },
            ]}
          />
        )}
      </div>

      {/* Top-right: Pipeline / Entities */}
      <div style={{ position: 'absolute', top: 60, right: 20 }}>
        {briefing ? (
          <KPIPanel
            title="KEY ENTITIES"
            sub="CLIENTS & CONTACTS"
            accent="#a855f7"
            items={briefing.recentEntities.length > 0
              ? briefing.recentEntities.slice(0, 4).map(t => ({ label: t.slice(0, 28), value: '▸' }))
              : [{ label: 'NO ENTITIES', value: '—' }]
            }
          />
        ) : (
          <KPIPanel
            title="PIPELINE · LEADS"
            sub="YESTERDAY"
            accent="#a855f7"
            items={[
              { label: 'LEADS FOUND',    value: '23',    delta: '5', up: true },
              { label: 'CALLS BOOKED',   value: '18' },
              { label: 'SENT / REPLIES', value: '11 / 4' },
              { label: 'CLOSED',         value: '1' },
            ]}
          />
        )}
      </div>

      {/* Bottom-right: Projects (always from Notion when available) */}
      <div style={{ position: 'absolute', bottom: 90, right: 20 }}>
        <KPIPanel
          title="ACTIVE PROJECTS"
          accent="#ff6b35"
          items={briefing
            ? briefing.projects.map(p => ({
                label: `${p.name.toUpperCase()} · ${p.entries[0]?.slice(0, 20) || (p.name === 'PRISM' ? 'REAL ESTATE' : p.name === 'ELEVATE' ? 'BRAND' : p.name === 'Trading' ? 'MACRO' : 'OPS')}`,
                value: p.status,
                up: p.status === 'ACTIVE',
              }))
            : [
                { label: 'PRISM · REAL ESTATE', value: 'ACTIVE' },
                { label: 'ELEVATE · BRAND',     value: 'ACTIVE' },
                { label: 'TRADING · MACRO',     value: 'ACTIVE' },
                { label: 'AVIATION · OPS',      value: 'ACTIVE' },
              ]
          }
        />
      </div>

      {/* Bottom briefing bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 20px', background: 'rgba(2,4,8,0.85)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(0,212,255,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.42rem', letterSpacing: '0.18em', color: 'rgba(0,212,255,0.5)', flexShrink: 0 }}>◈ JARVIS</span>
          <span style={{ fontSize: '0.58rem', color: 'rgba(180,220,255,0.8)', letterSpacing: '0.04em', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lastMessage || (groqOk ? 'Double-clap to activate briefing. Systems online.' : 'Configure GROQ_API_KEY to activate.')}
          </span>
        </div>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
          {[
            { label: 'GROQ', ok: groqOk, color: '#00ff88' },
            { label: 'BRAIN', ok: notionOk, color: '#00d4ff' },
            { label: 'LIVE', ok: true, color: '#00d4ff' },
          ].map(({ label, ok, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: ok ? color : '#ff4455', boxShadow: ok ? `0 0 5px ${color}` : 'none' }} />
              <span style={{ fontSize: '0.40rem', letterSpacing: '0.12em', color: ok ? color : '#ff4455' }}>{label}.{ok ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Corner HUD brackets */}
      {([{ top: 52, left: 0 }, { top: 52, right: 0 }, { bottom: 68, left: 0 }, { bottom: 68, right: 0 }] as const).map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          width: 20, height: 20,
          borderTop:    i < 2  ? '1px solid rgba(0,212,255,0.4)' : 'none',
          borderBottom: i >= 2 ? '1px solid rgba(0,212,255,0.4)' : 'none',
          borderLeft:   i % 2 === 0 ? '1px solid rgba(0,212,255,0.4)' : 'none',
          borderRight:  i % 2 !== 0 ? '1px solid rgba(0,212,255,0.4)' : 'none',
        }} />
      ))}
    </div>
  );
}
