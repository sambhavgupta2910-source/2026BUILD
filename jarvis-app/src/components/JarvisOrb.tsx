import React, { useRef, useState, useMemo, useCallback } from 'react';
import {
  Canvas,
  useFrame,
  extend,
  useThree,
  type ThreeEvent,
} from '@react-three/fiber';
import { Sphere, Torus, Stars, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'responding';

// State-driven config: colors [r,g,b], speeds, intensities
const STATE: Record<OrbState, {
  core: [number, number, number];
  rim:  [number, number, number];
  glow: [number, number, number];
  pulse: number;
  intensity: number;
  ringSpeed: number;
  ringOpacity: number;
  rotMult: number;
}> = {
  idle: {
    core: [0.2, 0.8, 1.0], rim: [0.0, 0.35, 1.0], glow: [0.0, 0.8, 1.0],
    pulse: 1.5, intensity: 0.85, ringSpeed: 1.0, ringOpacity: 0.55, rotMult: 0.5,
  },
  listening: {
    core: [0.15, 0.5, 1.0], rim: [0.5, 0.3, 1.0], glow: [0.3, 0.5, 1.0],
    pulse: 5.5, intensity: 1.65, ringSpeed: 3.0, ringOpacity: 0.95, rotMult: 1.6,
  },
  thinking: {
    core: [1.0, 0.45, 0.0], rim: [0.9, 0.1, 0.0], glow: [1.0, 0.38, 0.0],
    pulse: 3.2, intensity: 1.45, ringSpeed: 3.8, ringOpacity: 0.88, rotMult: 2.2,
  },
  responding: {
    core: [0.0, 1.0, 0.5], rim: [0.0, 0.7, 0.25], glow: [0.0, 0.95, 0.4],
    pulse: 2.0, intensity: 1.3, ringSpeed: 2.1, ringOpacity: 0.78, rotMult: 1.0,
  },
};

// ─── Shaders ──────────────────────────────────────────────────────────────

const EnergyCoreMaterial = shaderMaterial(
  {
    time: 0,
    intensity: 1.0,
    pulseFreq: 2.0,
    coreColor: new THREE.Color(0.2, 0.8, 1.0),
    rimColor: new THREE.Color(0.0, 0.4, 1.0),
  },
  `varying vec2 vUv;
   varying vec3 vNormal;
   varying vec3 vViewPosition;
   void main() {
     vUv = uv;
     vNormal = normalize(normalMatrix * normal);
     vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
     vViewPosition = -mvPosition.xyz;
     gl_Position = projectionMatrix * mvPosition;
   }`,
  `uniform float time;
   uniform float intensity;
   uniform float pulseFreq;
   uniform vec3 coreColor;
   uniform vec3 rimColor;
   varying vec2 vUv;
   varying vec3 vNormal;
   varying vec3 vViewPosition;
   void main() {
     vec3 normal = normalize(vNormal);
     vec3 viewDir = normalize(vViewPosition);
     float fresnel = 1.0 - abs(dot(normal, viewDir));
     fresnel = pow(fresnel, 2.0);
     float pulse = sin(time * pulseFreq) * 0.5 + 0.5;
     pulse = pow(pulse, 3.0);
     float noise = sin(vUv.x * 10.0 + time) * sin(vUv.y * 10.0 + time * 1.3) * 0.1;
     vec3 color = mix(coreColor, rimColor, fresnel);
     color += pulse * 0.8;
     color += noise;
     float alpha = fresnel * intensity + pulse * 0.3;
     gl_FragColor = vec4(color, alpha);
   }`
);

const HologramRingMaterial = shaderMaterial(
  { time: 0, opacity: 0.6, speed: 1.0, glowColor: new THREE.Color(0.0, 0.8, 1.0), wireColor: new THREE.Color(0.2, 1.0, 0.8) },
  `varying vec2 vUv;
   varying vec3 vNormal;
   void main() {
     vUv = uv;
     vNormal = normalize(normalMatrix * normal);
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
  `uniform float time;
   uniform float opacity;
   uniform float speed;
   uniform vec3 glowColor;
   uniform vec3 wireColor;
   varying vec2 vUv;
   varying vec3 vNormal;
   void main() {
     float wire = sin(vUv.x * 40.0 + time * speed) * sin(vUv.y * 40.0 + time * speed * 0.7);
     wire = smoothstep(0.8, 1.0, wire);
     float pulse = sin(vUv.x * 6.28 - time * speed * 2.0) * 0.5 + 0.5;
     pulse = pow(pulse, 4.0);
     vec3 color = mix(glowColor, wireColor, wire);
     color += pulse * wireColor * 2.0;
     float alpha = (wire + pulse) * opacity;
     gl_FragColor = vec4(color, alpha);
   }`
);

const ParticleMaterial = shaderMaterial(
  { time: 0, size: 1.0, color: new THREE.Color(0.3, 0.8, 1.0) },
  `uniform float time;
   uniform float size;
   attribute float phase;
   attribute float speed;
   varying float vAlpha;
   void main() {
     vec3 pos = position;
     float angle = time * speed + phase;
     pos.x = cos(angle) * length(position);
     pos.z = sin(angle) * length(position);
     pos.y += sin(time * 2.0 + phase) * 0.5;
     vAlpha = sin(time + phase) * 0.5 + 0.5;
     vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
     gl_PointSize = size * (300.0 / -mvPosition.z);
     gl_Position = projectionMatrix * mvPosition;
   }`,
  `uniform vec3 color;
   varying float vAlpha;
   void main() {
     vec2 center = gl_PointCoord - 0.5;
     float dist = length(center);
     if (dist > 0.5) discard;
     float alpha = (1.0 - dist * 2.0) * vAlpha;
     vec3 finalColor = color * (2.0 - dist);
     gl_FragColor = vec4(finalColor, alpha);
   }`
);

extend({ EnergyCoreMaterial, HologramRingMaterial, ParticleMaterial });

type CoreMat  = THREE.ShaderMaterial & { time: number; intensity: number; pulseFreq: number; coreColor: THREE.Color; rimColor: THREE.Color };
type RingMat  = THREE.ShaderMaterial & { time: number; opacity: number; speed: number; glowColor: THREE.Color; wireColor: THREE.Color };
type PartMat  = THREE.ShaderMaterial & { time: number; size: number; color: THREE.Color };

declare module '@react-three/fiber' {
  interface ThreeElements {
    energyCoreMaterial: Partial<CoreMat> & { ref?: React.Ref<CoreMat>; transparent?: boolean; side?: THREE.Side; blending?: THREE.Blending };
    hologramRingMaterial: Partial<RingMat> & { ref?: React.Ref<RingMat>; transparent?: boolean; side?: THREE.Side; blending?: THREE.Blending };
    particleMaterial: Partial<PartMat> & { ref?: React.Ref<PartMat>; transparent?: boolean; blending?: THREE.Blending };
  }
}

// ─── Components ───────────────────────────────────────────────────────────

const ParticleSystem: React.FC<{ count: number; radius: number }> = ({ count, radius }) => {
  const mesh = useRef<THREE.Points>(null!);
  const matRef = useRef<PartMat | null>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius + (Math.random() - 0.5) * 2;
      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.5 + Math.random() * 0.5;
    }
    return { positions, phases, speeds };
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.time = clock.getElapsedTime();
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute args={[particles.positions, 3]} attach="attributes-position" />
        <bufferAttribute args={[particles.phases, 1]}    attach="attributes-phase" />
        <bufferAttribute args={[particles.speeds, 1]}    attach="attributes-speed" />
      </bufferGeometry>
      <particleMaterial ref={matRef} size={4} transparent blending={THREE.AdditiveBlending} />
    </points>
  );
};

const EnergyRings: React.FC<{ hovered: boolean; orbState: OrbState }> = ({ hovered, orbState }) => {
  const rings   = useRef<(THREE.Mesh | null)[]>([]);
  const matRefs = useRef<(RingMat | null)[]>([]);

  const ringConfigs = useMemo(() => [
    { radius: 2.2,  thickness: 0.020, speed: 1.0,   axis: [1, 0, 0]      as const, angle: 0 },
    { radius: 2.6,  thickness: 0.015, speed: -0.7,  axis: [0, 1, 0]      as const, angle: Math.PI / 3 },
    { radius: 3.0,  thickness: 0.010, speed: 0.5,   axis: [0.7, 0.7, 0]  as const, angle: Math.PI / 2 },
    { radius: 3.4,  thickness: 0.008, speed: -0.3,  axis: [0, 0, 1]      as const, angle: Math.PI / 4 },
  ], []);

  const currentGlow = useRef(new THREE.Color(...STATE.idle.glow));
  const currentWire = useRef(new THREE.Color(0.2, 1.0, 0.8));

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const cfg = STATE[orbState];
    const targetGlow = new THREE.Color(...cfg.glow);
    const targetWire = new THREE.Color(...cfg.core).multiplyScalar(1.4);
    currentGlow.current.lerp(targetGlow, 0.04);
    currentWire.current.lerp(targetWire, 0.04);

    rings.current.forEach((ring, i) => {
      if (!ring || !matRefs.current[i]) return;
      const rc = ringConfigs[i];
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(new THREE.Vector3(...rc.axis).normalize(), rc.angle + time * rc.speed);
      ring.quaternion.copy(q);
      const mat = matRefs.current[i]!;
      mat.time    = time;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, (hovered ? cfg.ringOpacity + 0.1 : cfg.ringOpacity), 0.06);
      mat.speed   = THREE.MathUtils.lerp(mat.speed, cfg.ringSpeed * Math.abs(rc.speed), 0.06);
      mat.glowColor.lerp(currentGlow.current, 0.06);
      mat.wireColor.lerp(currentWire.current, 0.06);
    });
  });

  return (
    <>
      {ringConfigs.map((rc, i) => (
        <Torus
          key={i}
          ref={(el: THREE.Mesh | null) => { rings.current[i] = el; }}
          args={[rc.radius, rc.thickness, 8, 64]}
        >
          <hologramRingMaterial
            ref={(el: RingMat | null) => { matRefs.current[i] = el; }}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </Torus>
      ))}
    </>
  );
};

const DataCore: React.FC<{ orbState: OrbState }> = ({ orbState }) => {
  const coreRef = useRef<THREE.Mesh>(null!);
  const matRef  = useRef<CoreMat | null>(null);
  const currentCore = useRef(new THREE.Color(...STATE.idle.core));
  const currentRim  = useRef(new THREE.Color(...STATE.idle.rim));

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const cfg = STATE[orbState];

    currentCore.current.lerp(new THREE.Color(...cfg.core), 0.05);
    currentRim.current.lerp(new THREE.Color(...cfg.rim), 0.05);

    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.5 * cfg.rotMult;
      coreRef.current.rotation.x = Math.sin(time * 0.3) * 0.1;
      const scale = 1 + Math.sin(time * 2) * (orbState === 'listening' ? 0.12 : 0.05);
      coreRef.current.scale.setScalar(scale);
    }
    if (matRef.current) {
      matRef.current.time = time;
      matRef.current.pulseFreq  = THREE.MathUtils.lerp(matRef.current.pulseFreq,  cfg.pulse,     0.05);
      matRef.current.intensity  = THREE.MathUtils.lerp(matRef.current.intensity,  cfg.intensity, 0.05);
      matRef.current.coreColor.lerp(currentCore.current, 0.08);
      matRef.current.rimColor.lerp(currentRim.current, 0.08);
    }
  });

  return (
    <Sphere ref={coreRef} args={[0.8, 32, 32]}>
      <energyCoreMaterial
        ref={matRef}
        transparent
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </Sphere>
  );
};

const HolographicBackground: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = t * 0.05;
      ref.current.rotation.x = t * 0.03;
    }
  });
  return (
    <Sphere ref={ref} args={[15, 16, 16]} position={[0, 0, 0]}>
      <meshBasicMaterial color={0x001122} transparent opacity={0.02} side={THREE.BackSide} />
    </Sphere>
  );
};

const OrbContent: React.FC<{ orbState: OrbState }> = ({ orbState }) => {
  const group = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const { viewport } = useThree();

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (group.current) {
        group.current.rotation.y += (e.point.x / viewport.width) * 2 * 0.01;
        group.current.rotation.x += (e.point.y / viewport.height) * 2 * 0.01;
      }
    },
    [viewport]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.8) * 0.15;
      group.current.position.x = Math.cos(t * 0.5) * 0.1;
    }
  });

  return (
    <>
      <HolographicBackground />
      <group
        ref={group}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerMove={handlePointerMove}
      >
        <DataCore orbState={orbState} />
        <EnergyRings hovered={hovered} orbState={orbState} />
        <ParticleSystem count={50} radius={4}   />
        <ParticleSystem count={30} radius={5.5} />
        <ParticleSystem count={20} radius={7}   />
        <group rotation={[Math.PI / 2, 0, 0]}>
          <ParticleSystem count={25} radius={3.5} />
        </group>
      </group>
    </>
  );
};

// ─── Main export ─────────────────────────────────────────────────────────

interface JarvisOrbProps {
  orbState?: OrbState;
}

const JarvisOrb: React.FC<JarvisOrbProps> = ({ orbState = 'idle' }) => {
  const lightColor = {
    idle:       0x00aaff,
    listening:  0x4455ff,
    thinking:   0xff6600,
    responding: 0x00ff88,
  }[orbState];

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: 'transparent' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.2} color={0x004466} />
        <pointLight position={[0, 0, 0]}   intensity={2.0} color={lightColor} />
        <pointLight position={[5, 5, 5]}   intensity={0.8} color={0x0088cc} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color={0x4400aa} />
        <fog attach="fog" args={[0x001122, 8, 20]} />
        <OrbContent orbState={orbState} />
        <Stars radius={50} depth={30} count={800} factor={2} fade speed={0.4} saturation={0.8} />
      </Canvas>
    </div>
  );
};

export default JarvisOrb;
