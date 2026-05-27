'use client';
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'responding';

// ─── State targets ────────────────────────────────────────────────────────

const T: Record<OrbState, { r: number; g: number; b: number; speed: number; bloom: number }> = {
  idle:       { r: 0,    g: 0.83, b: 1,    speed: 1.0, bloom: 0.6 },
  listening:  { r: 0.27, g: 0.53, b: 1,    speed: 2.2, bloom: 1.2 },
  thinking:   { r: 1,    g: 0.42, b: 0.2,  speed: 3.8, bloom: 1.1 },
  responding: { r: 0,    g: 1,    b: 0.53, speed: 1.6, bloom: 0.9 },
};

const STATE_HEX: Record<OrbState, string> = {
  idle: '#00d4ff', listening: '#4488ff', thinking: '#ff6b35', responding: '#00ff88',
};
const STATE_LABEL: Record<OrbState, string> = {
  idle: 'STANDBY', listening: 'LISTENING', thinking: 'PROCESSING', responding: 'SPEAKING',
};

// ─── Geometry builders ────────────────────────────────────────────────────

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

function buildArc(radius: number, span: number, segs = 120): THREE.BufferGeometry {
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

// Dynamic waveform ring — displaced sine wave on a circle
function buildWaveRing(radius: number, segs: number): THREE.BufferGeometry {
  const pts = new Float32Array((segs + 1) * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function updateWaveRing(
  geo: THREE.BufferGeometry,
  radius: number,
  segs: number,
  time: number,
  amplitude: number,
  freqs: number[],
  speed: number,
): void {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    let r = radius;
    for (const f of freqs) {
      r += amplitude * Math.sin(f * a + time * speed);
    }
    arr[i * 3]     = Math.cos(a) * r;
    arr[i * 3 + 1] = Math.sin(a) * r;
    arr[i * 3 + 2] = 0;
  }
  pos.needsUpdate = true;
}

// Cardinal diamond markers at N/E/S/W
function buildDiamonds(ringRadius: number, size: number): THREE.BufferGeometry {
  const pts: number[] = [];
  for (let q = 0; q < 4; q++) {
    const a = (q / 4) * Math.PI * 2;
    const cx = Math.cos(a) * ringRadius;
    const cy = Math.sin(a) * ringRadius;
    const tx = Math.cos(a), ty = Math.sin(a);
    const nx = -ty, ny = tx;
    pts.push(cx + tx * size, cy + ty * size, 0);  // tip out
    pts.push(cx + nx * size, cy + ny * size, 0);  // tip left
    pts.push(cx + nx * size, cy + ny * size, 0);
    pts.push(cx - tx * size, cy - ty * size, 0);  // tip in
    pts.push(cx - tx * size, cy - ty * size, 0);
    pts.push(cx - nx * size, cy - ny * size, 0);  // tip right
    pts.push(cx - nx * size, cy - ny * size, 0);
    pts.push(cx + tx * size, cy + ty * size, 0);  // back to tip out
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

// Crosshair lines at center
function buildCrosshair(inner: number, outer: number): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    pts.push(Math.cos(a) * inner, Math.sin(a) * inner, 0);
    pts.push(Math.cos(a) * outer, Math.sin(a) * outer, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

// ─── Scene ────────────────────────────────────────────────────────────────

const JarvisScene: React.FC<{ orbState: OrbState }> = ({ orbState }) => {
  const col   = useRef(new THREE.Color(0, 0.83, 1));
  const speed = useRef(1.0);

  // Mesh refs
  const globe    = useRef<THREE.Mesh>(null!);
  const core     = useRef<THREE.Mesh>(null!);
  const corePulse = useRef<THREE.Mesh>(null!);
  const arc1     = useRef<THREE.Mesh>(null!);
  const arc2     = useRef<THREE.Mesh>(null!);
  const arc3     = useRef<THREE.Mesh>(null!);
  const midRing  = useRef<THREE.Mesh>(null!);
  const outerRing = useRef<THREE.Mesh>(null!);
  const tiltRing = useRef<THREE.Mesh>(null!);
  const tiltRing2 = useRef<THREE.Mesh>(null!);
  const scanG1   = useRef<THREE.Group>(null!);
  const scanG2   = useRef<THREE.Group>(null!);
  const waveGeo1 = useRef<THREE.BufferGeometry>(null!);
  const waveGeo2 = useRef<THREE.BufferGeometry>(null!);
  const waveLine1 = useRef<THREE.Group>(null!);

  // Materials
  const mats = useMemo(() => ({
    globe:      new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.14 }),
    core:       new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 1.0 }),
    corePulse:  new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.15 }),
    arc1:       new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.95 }),
    arc2:       new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.78 }),
    arc3:       new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.58 }),
    midRing:    new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.72 }),
    outerRing:  new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.38 }),
    tiltRing:   new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.28 }),
    tiltRing2:  new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.20 }),
    ticks36:    new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.48 }),
    ticks12:    new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.80 }),
    ticks72:    new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.28 }),
    radials:    new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.10 }),
    diamonds:   new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.90 }),
    crosshair:  new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.30 }),
    scan:       new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.95 }),
    scan2:      new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.50 }),
    wave1:      new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.55 }),
    wave2:      new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.30 }),
  }), []);

  const WAVE_SEGS = 256;

  // Stable geometries
  const ticks36   = useMemo(() => buildTicks(2.1, 36, 0.14), []);
  const ticks12   = useMemo(() => buildTicks(2.1, 12, 0.26), []);
  const ticks72   = useMemo(() => buildTicks(2.88, 72, 0.08), []);
  const radials   = useMemo(() => buildRadials(12, 0.95, 2.1), []);
  const diamonds  = useMemo(() => buildDiamonds(2.36, 0.09), []);
  const crosshair = useMemo(() => buildCrosshair(0.22, 0.55), []);
  const scanGeo   = useMemo(() => buildArc(2.24, Math.PI * 0.38), []);
  const scanGeo2  = useMemo(() => buildArc(2.24, Math.PI * 0.11), []);
  const wg1       = useMemo(() => buildWaveRing(1.05, WAVE_SEGS), []);
  const wg2       = useMemo(() => buildWaveRing(1.55, WAVE_SEGS), []);

  // Line objects
  const scanObj  = useMemo(() => new THREE.Line(scanGeo, mats.scan), [scanGeo, mats]);
  const scan2Obj = useMemo(() => new THREE.Line(scanGeo2, mats.scan2), [scanGeo2, mats]);
  const wave1Obj = useMemo(() => new THREE.LineLoop(wg1, mats.wave1), [wg1, mats]);
  const wave2Obj = useMemo(() => new THREE.LineLoop(wg2, mats.wave2), [wg2, mats]);

  // Keep geo refs for mutation
  waveGeo1.current = wg1;
  waveGeo2.current = wg2;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const tgt = T[orbState];

    // Smooth color + speed transitions
    col.current.lerp(new THREE.Color(tgt.r, tgt.g, tgt.b), 0.05);
    speed.current = THREE.MathUtils.lerp(speed.current, tgt.speed, 0.05);
    const s = speed.current;

    // Sync all material colors
    Object.values(mats).forEach(m => {
      (m as THREE.MeshBasicMaterial).color.copy(col.current);
    });

    // ── Globe: slow rotation + organic tilt ──
    if (globe.current) {
      globe.current.rotation.y = t * 0.10;
      globe.current.rotation.x = t * 0.038;
    }

    // ── Arc reactor: pulsing core + spinning rings ──
    const pulse = Math.sin(t * s * 1.6) * 0.5 + 0.5;
    if (core.current)  core.current.scale.setScalar(0.85 + pulse * 0.18);
    if (corePulse.current) corePulse.current.scale.setScalar(1.0 + pulse * 1.4);

    if (arc1.current) arc1.current.rotation.z =  t * s * 1.4;
    if (arc2.current) arc2.current.rotation.z = -t * s * 0.85;
    if (arc3.current) arc3.current.rotation.z =  t * s * 0.52;

    // ── Precision rings: slow drift ──
    if (midRing.current)    midRing.current.rotation.z    =  t * s * 0.16;
    if (outerRing.current)  outerRing.current.rotation.z  = -t * s * 0.08;
    if (tiltRing.current)   tiltRing.current.rotation.z   =  t * s * 0.30;
    if (tiltRing2.current)  tiltRing2.current.rotation.z  = -t * s * 0.22;

    // ── Scan arcs sweep ──
    if (scanG1.current) scanG1.current.rotation.z =  t * s * 0.90;
    if (scanG2.current) scanG2.current.rotation.z = -t * s * 0.55;

    // ── Organic voice waveform rings ──
    // Amplitude scales dramatically with state
    const baseAmp = orbState === 'idle' ? 0.012 :
                    orbState === 'listening' ? 0.055 :
                    orbState === 'thinking' ? 0.038 : 0.072;

    if (waveGeo1.current) {
      updateWaveRing(waveGeo1.current, 1.05, WAVE_SEGS, t,
        baseAmp * (0.8 + 0.2 * Math.sin(t * 0.7)),
        [3, 5, 7, 11, 13], s * 1.2);
    }
    if (waveGeo2.current) {
      updateWaveRing(waveGeo2.current, 1.55, WAVE_SEGS, t,
        baseAmp * 0.6 * (0.7 + 0.3 * Math.sin(t * 0.5 + 1.2)),
        [2, 4, 8, 10], s * 0.8);
    }
  });

  return (
    <>
      {/* Wireframe globe */}
      <mesh ref={globe} material={mats.globe} position={[0, 0, -0.4]}>
        <sphereGeometry args={[1.85, 24, 18]} />
      </mesh>

      {/* Radial grid spokes */}
      <lineSegments geometry={radials} material={mats.radials} />

      {/* Crosshair */}
      <lineSegments geometry={crosshair} material={mats.crosshair} />

      {/* Pulsing corona behind core */}
      <mesh ref={corePulse} material={mats.corePulse}>
        <circleGeometry args={[0.35, 64]} />
      </mesh>

      {/* Arc reactor bright center */}
      <mesh ref={core} material={mats.core}>
        <circleGeometry args={[0.16, 64]} />
      </mesh>

      {/* Arc reactor spinning rings */}
      <mesh ref={arc1} material={mats.arc1}>
        <torusGeometry args={[0.38, 0.020, 8, 128]} />
      </mesh>
      <mesh ref={arc2} material={mats.arc2}>
        <torusGeometry args={[0.58, 0.013, 8, 128]} />
      </mesh>
      <mesh ref={arc3} material={mats.arc3}>
        <torusGeometry args={[0.80, 0.009, 8, 128]} />
      </mesh>

      {/* Voice-reactive waveform rings */}
      <group ref={waveLine1}>
        <primitive object={wave1Obj} />
        <primitive object={wave2Obj} />
      </group>

      {/* Precision mid ring + ticks + diamonds */}
      <mesh ref={midRing} material={mats.midRing}>
        <torusGeometry args={[2.24, 0.012, 8, 256]} />
      </mesh>
      <lineSegments geometry={ticks36} material={mats.ticks36} />
      <lineSegments geometry={ticks12} material={mats.ticks12} />
      <lineSegments geometry={diamonds} material={mats.diamonds} />

      {/* Scan sweeps */}
      <group ref={scanG1}>
        <primitive object={scanObj} />
      </group>
      <group ref={scanG2}>
        <primitive object={scan2Obj} />
      </group>

      {/* Outer ring + fine ticks */}
      <mesh ref={outerRing} material={mats.outerRing}>
        <torusGeometry args={[2.96, 0.007, 8, 256]} />
      </mesh>
      <lineSegments geometry={ticks72} material={mats.ticks72} />

      {/* Two tilted orbital rings for depth */}
      <mesh ref={tiltRing} rotation={[Math.PI / 5, 0, 0]} material={mats.tiltRing}>
        <torusGeometry args={[2.60, 0.007, 8, 192]} />
      </mesh>
      <mesh ref={tiltRing2} rotation={[0, Math.PI / 6, Math.PI / 8]} material={mats.tiltRing2}>
        <torusGeometry args={[2.42, 0.006, 8, 192]} />
      </mesh>
    </>
  );
};

// ─── HUD data overlays ────────────────────────────────────────────────────

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

// ─── Main export ──────────────────────────────────────────────────────────

interface JarvisOrbProps { orbState?: OrbState }

const JarvisOrb: React.FC<JarvisOrbProps> = ({ orbState = 'idle' }) => {
  const hex = STATE_HEX[orbState];

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: 'transparent' }}>
      {/* Three.js canvas with bloom */}
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 36 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ambientLight intensity={0.02} />
        <JarvisScene orbState={orbState} />
        <EffectComposer>
          <Bloom
            intensity={orbState === 'listening' ? 1.4 : orbState === 'thinking' ? 1.2 : 0.9}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.6}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* Left readouts */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-center gap-3.5 px-3 pointer-events-none"
        style={{ width: '21%' }}>
        {READOUTS_LEFT.map(({ label, val }) => (
          <div key={label} style={{ borderLeft: `1px solid ${hex}55`, paddingLeft: 8 }}>
            <div style={{ fontSize: '0.40rem', letterSpacing: '0.18em', color: `${hex}70`, fontFamily: 'monospace' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.10em', color: hex, fontFamily: 'monospace', marginTop: 2, textShadow: `0 0 8px ${hex}` }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Right readouts */}
      <div className="absolute right-0 top-0 h-full flex flex-col justify-center gap-3.5 px-3 pointer-events-none"
        style={{ width: '21%' }}>
        {READOUTS_RIGHT.map(({ label, val }) => (
          <div key={label} style={{ borderRight: `1px solid ${hex}55`, paddingRight: 8, textAlign: 'right' }}>
            <div style={{ fontSize: '0.40rem', letterSpacing: '0.18em', color: `${hex}70`, fontFamily: 'monospace' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.10em', color: hex, fontFamily: 'monospace', marginTop: 2, textShadow: `0 0 8px ${hex}` }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* State label */}
      <div className="absolute bottom-4 left-1/2 pointer-events-none"
        style={{ transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{
          fontSize: '0.50rem', letterSpacing: '0.32em', color: hex,
          fontFamily: 'monospace', textShadow: `0 0 14px ${hex}`,
        }}>
          ● {STATE_LABEL[orbState]}
        </div>
      </div>

      {/* Corner HUD brackets */}
      {([
        { top: 8, left: 8 },
        { top: 8, right: 8 },
        { bottom: 8, left: 8 },
        { bottom: 8, right: 8 },
      ] as const).map((pos, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          ...pos, width: 16, height: 16,
          borderTop:    i < 2  ? `1px solid ${hex}cc` : 'none',
          borderBottom: i >= 2 ? `1px solid ${hex}cc` : 'none',
          borderLeft:   i % 2 === 0 ? `1px solid ${hex}cc` : 'none',
          borderRight:  i % 2 !== 0 ? `1px solid ${hex}cc` : 'none',
        }} />
      ))}
    </div>
  );
};

export default JarvisOrb;
