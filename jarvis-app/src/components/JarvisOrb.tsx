'use client';
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'responding';

// ─── State targets ────────────────────────────────────────────────────────

const T: Record<OrbState, { r: number; g: number; b: number; speed: number }> = {
  idle:       { r: 0,    g: 0.83, b: 1,    speed: 1.0 },
  listening:  { r: 0.27, g: 0.53, b: 1,    speed: 2.5 },
  thinking:   { r: 1,    g: 0.42, b: 0.2,  speed: 3.5 },
  responding: { r: 0,    g: 1,    b: 0.53, speed: 1.8 },
};

const STATE_HEX: Record<OrbState, string> = {
  idle: '#00d4ff', listening: '#4488ff', thinking: '#ff6b35', responding: '#00ff88',
};

// ─── Geometry helpers ─────────────────────────────────────────────────────

function buildTicks(radius: number, count: number, len: number): THREE.BufferGeometry {
  const pts: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    pts.push(c * radius, s * radius, 0, c * (radius + len), s * (radius + len), 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function buildArc(radius: number, span: number, segs = 80): THREE.BufferGeometry {
  const pts: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * span;
    pts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function buildRadials(count: number, r1: number, r2: number): THREE.BufferGeometry {
  const pts: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pts.push(Math.cos(a) * r1, Math.sin(a) * r1, 0, Math.cos(a) * r2, Math.sin(a) * r2, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

// ─── Three.js scene ───────────────────────────────────────────────────────

const JarvisScene: React.FC<{ orbState: OrbState }> = ({ orbState }) => {
  const col   = useRef(new THREE.Color(0, 0.83, 1));
  const speed = useRef(1.0);

  // Object refs
  const globe    = useRef<THREE.Mesh>(null!);
  const core     = useRef<THREE.Mesh>(null!);
  const arc1     = useRef<THREE.Mesh>(null!);
  const arc2     = useRef<THREE.Mesh>(null!);
  const arc3     = useRef<THREE.Mesh>(null!);
  const midRing  = useRef<THREE.Mesh>(null!);
  const outerRing = useRef<THREE.Mesh>(null!);
  const tiltRing = useRef<THREE.Mesh>(null!);
  const scanLine = useRef<THREE.Group>(null!);
  const scan2    = useRef<THREE.Group>(null!);

  // Materials — one per mesh (different opacity), all share color updates
  const mats = useMemo(() => ({
    globe:      new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.16 }),
    core:       new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 1.0 }),
    arc1:       new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.95 }),
    arc2:       new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.75 }),
    arc3:       new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.55 }),
    midRing:    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.70 }),
    outerRing:  new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.40 }),
    tiltRing:   new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.30 }),
    ticks36:    new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.50 }),
    ticks12:    new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.75 }),
    ticks72:    new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.30 }),
    radials:    new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.12 }),
    scan:       new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.95 }),
    scan2:      new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.55 }),
  }), []);

  // Stable geometries
  const ticks36  = useMemo(() => buildTicks(2.1, 36, 0.14), []);
  const ticks12  = useMemo(() => buildTicks(2.1, 12, 0.24), []);
  const ticks72  = useMemo(() => buildTicks(2.88, 72, 0.08), []);
  const radials  = useMemo(() => buildRadials(12, 0.95, 2.1), []);
  const scanGeo  = useMemo(() => buildArc(2.24, Math.PI * 0.38), []);
  const scanGeo2 = useMemo(() => buildArc(2.24, Math.PI * 0.12), []);

  // THREE.Line objects (stable, not re-created)
  const scanObj  = useMemo(() => new THREE.Line(scanGeo,  mats.scan),  [scanGeo,  mats]);
  const scan2Obj = useMemo(() => new THREE.Line(scanGeo2, mats.scan2), [scanGeo2, mats]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const tgt = T[orbState];

    // Smooth color + speed
    col.current.lerp(new THREE.Color(tgt.r, tgt.g, tgt.b), 0.045);
    speed.current = THREE.MathUtils.lerp(speed.current, tgt.speed, 0.045);
    const s = speed.current;

    // Sync all material colors
    Object.values(mats).forEach(m => (m as THREE.MeshBasicMaterial).color.copy(col.current));

    // Globe slow rotation
    if (globe.current) {
      globe.current.rotation.y = t * 0.10;
      globe.current.rotation.x = t * 0.04;
    }

    // Arc reactor pulse + spin
    if (core.current) {
      const p = 0.88 + Math.sin(t * s * 1.8) * 0.12;
      core.current.scale.setScalar(p);
    }
    if (arc1.current) arc1.current.rotation.z =  t * s * 1.3;
    if (arc2.current) arc2.current.rotation.z = -t * s * 0.8;
    if (arc3.current) arc3.current.rotation.z =  t * s * 0.5;

    // Precision rings
    if (midRing.current)   midRing.current.rotation.z   =  t * s * 0.18;
    if (outerRing.current) outerRing.current.rotation.z = -t * s * 0.09;
    if (tiltRing.current)  tiltRing.current.rotation.z  =  t * s * 0.32;

    // Scan sweep
    if (scanLine.current)  scanLine.current.rotation.z  =  t * s * 0.95;
    if (scan2.current)     scan2.current.rotation.z     = -t * s * 0.6;
  });

  return (
    <>
      {/* Wireframe globe — the signature JARVIS element */}
      <mesh ref={globe} material={mats.globe} position={[0, 0, -0.3]}>
        <sphereGeometry args={[1.85, 20, 14]} />
      </mesh>

      {/* Radial lines (inner grid) */}
      <lineSegments geometry={radials} material={mats.radials} />

      {/* Arc reactor — bright center disk */}
      <mesh ref={core} material={mats.core}>
        <circleGeometry args={[0.18, 32]} />
      </mesh>

      {/* Arc reactor rings (concentric, each spins differently) */}
      <mesh ref={arc1} material={mats.arc1}>
        <torusGeometry args={[0.38, 0.022, 8, 64]} />
      </mesh>
      <mesh ref={arc2} material={mats.arc2}>
        <torusGeometry args={[0.58, 0.013, 8, 64]} />
      </mesh>
      <mesh ref={arc3} material={mats.arc3}>
        <torusGeometry args={[0.80, 0.009, 8, 64]} />
      </mesh>

      {/* Precision mid ring with tick marks */}
      <mesh ref={midRing} material={mats.midRing}>
        <torusGeometry args={[2.24, 0.013, 8, 128]} />
      </mesh>
      <lineSegments geometry={ticks36} material={mats.ticks36} />
      <lineSegments geometry={ticks12} material={mats.ticks12} />

      {/* Scan sweep arcs */}
      <group ref={scanLine}>
        <primitive object={scanObj} />
      </group>
      <group ref={scan2}>
        <primitive object={scan2Obj} />
      </group>

      {/* Outer precision ring + ticks */}
      <mesh ref={outerRing} material={mats.outerRing}>
        <torusGeometry args={[2.96, 0.008, 8, 128]} />
      </mesh>
      <lineSegments geometry={ticks72} material={mats.ticks72} />

      {/* Tilted orbital ring */}
      <mesh ref={tiltRing} rotation={[Math.PI / 5, 0, 0]} material={mats.tiltRing}>
        <torusGeometry args={[2.6, 0.007, 8, 128]} />
      </mesh>
    </>
  );
};

// ─── HTML data overlays ───────────────────────────────────────────────────

const READOUTS_LEFT = [
  { label: 'NEURAL LINK',  val: 'ACTIVE'  },
  { label: 'ARC OUTPUT',   val: '97.3%'   },
  { label: 'SHIELD INT',   val: '100%'    },
  { label: 'THREAT LVL',   val: 'NONE'    },
];
const READOUTS_RIGHT = [
  { label: 'TARGETING',    val: 'ONLINE'  },
  { label: 'JARVIS',       val: 'ONLINE'  },
  { label: 'SYSTEMS',      val: 'NOMINAL' },
  { label: 'LAT / LON',    val: '25.2°N'  },
];

const STATE_LABEL: Record<OrbState, string> = {
  idle: 'STANDBY', listening: 'LISTENING', thinking: 'PROCESSING', responding: 'SPEAKING',
};

// ─── Main export ──────────────────────────────────────────────────────────

interface JarvisOrbProps { orbState?: OrbState }

const JarvisOrb: React.FC<JarvisOrbProps> = ({ orbState = 'idle' }) => {
  const hex = STATE_HEX[orbState];

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: 'transparent' }}>
      {/* Three.js canvas */}
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ambientLight intensity={0.05} />
        <JarvisScene orbState={orbState} />
      </Canvas>

      {/* Left data column */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-center gap-3 px-3 pointer-events-none"
        style={{ width: '22%' }}>
        {READOUTS_LEFT.map(({ label, val }) => (
          <div key={label} style={{ borderLeft: `1px solid ${hex}44`, paddingLeft: 8 }}>
            <div style={{ fontSize: '0.42rem', letterSpacing: '0.16em', color: `${hex}88`, fontFamily: 'monospace' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.1em', color: hex, fontFamily: 'monospace', marginTop: 1 }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Right data column */}
      <div className="absolute right-0 top-0 h-full flex flex-col justify-center gap-3 px-3 pointer-events-none"
        style={{ width: '22%' }}>
        {READOUTS_RIGHT.map(({ label, val }) => (
          <div key={label} style={{ borderRight: `1px solid ${hex}44`, paddingRight: 8, textAlign: 'right' }}>
            <div style={{ fontSize: '0.42rem', letterSpacing: '0.16em', color: `${hex}88`, fontFamily: 'monospace' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.1em', color: hex, fontFamily: 'monospace', marginTop: 1 }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom center state label */}
      <div className="absolute bottom-3 left-1/2 pointer-events-none"
        style={{ transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{
          fontSize: '0.52rem', letterSpacing: '0.3em', color: hex,
          fontFamily: 'monospace', textShadow: `0 0 12px ${hex}`,
        }}>
          ● {STATE_LABEL[orbState]}
        </div>
      </div>

      {/* Corner brackets */}
      {[
        { top: 8, left: 8 },
        { top: 8, right: 8 },
        { bottom: 8, left: 8 },
        { bottom: 8, right: 8 },
      ].map((pos, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          ...pos,
          width: 14, height: 14,
          borderTop:    i < 2  ? `1px solid ${hex}` : 'none',
          borderBottom: i >= 2 ? `1px solid ${hex}` : 'none',
          borderLeft:   i % 2 === 0 ? `1px solid ${hex}` : 'none',
          borderRight:  i % 2 !== 0 ? `1px solid ${hex}` : 'none',
        }} />
      ))}
    </div>
  );
};

export default JarvisOrb;
