/* Clean side-profile SVG silhouettes per aircraft category */

function LightJetSVG() {
  return (
    <svg viewBox="0 0 320 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fuselage */}
      <path d="M20 62 Q60 56 120 54 L240 54 Q280 54 298 60 Q280 68 240 68 L120 68 Q60 68 20 62Z" fill="currentColor" opacity="0.9"/>
      {/* Nose cone */}
      <path d="M240 54 Q270 54 298 60 Q270 68 240 68Z" fill="currentColor"/>
      {/* Tail fin */}
      <path d="M30 62 L20 34 L38 50 L50 56Z" fill="currentColor" opacity="0.85"/>
      {/* Horizontal stabiliser */}
      <path d="M25 62 L8 58 L8 66 L30 65Z" fill="currentColor" opacity="0.75"/>
      {/* Main wing */}
      <path d="M120 56 L80 28 L90 52 L180 52 L190 28 L200 56Z" fill="currentColor" opacity="0.85"/>
      {/* Engine pods (rear mounted) */}
      <ellipse cx="58" cy="52" rx="18" ry="6" fill="currentColor" opacity="0.7"/>
      <ellipse cx="58" cy="72" rx="18" ry="6" fill="currentColor" opacity="0.7"/>
      {/* Windows */}
      <circle cx="200" cy="61" r="3" fill="white" opacity="0.5"/>
      <circle cx="218" cy="61" r="3" fill="white" opacity="0.5"/>
      <circle cx="236" cy="61" r="3" fill="white" opacity="0.5"/>
      <circle cx="254" cy="61" r="3" fill="white" opacity="0.5"/>
      <circle cx="271" cy="61" r="2.5" fill="white" opacity="0.4"/>
    </svg>
  );
}

function MidsizeJetSVG() {
  return (
    <svg viewBox="0 0 340 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 62 Q70 54 140 52 L260 52 Q295 52 316 60 Q295 70 260 70 L140 70 Q70 70 18 62Z" fill="currentColor" opacity="0.9"/>
      <path d="M260 52 L296 58 Q296 62 296 62 L260 70Z" fill="currentColor"/>
      <path d="M26 62 L14 30 L34 48 L48 56Z" fill="currentColor" opacity="0.85"/>
      <path d="M22 62 L4 57 L4 67 L28 66Z" fill="currentColor" opacity="0.75"/>
      <path d="M130 54 L82 22 L94 50 L196 50 L208 22 L220 54Z" fill="currentColor" opacity="0.85"/>
      <ellipse cx="52" cy="50" rx="20" ry="6.5" fill="currentColor" opacity="0.7"/>
      <ellipse cx="52" cy="74" rx="20" ry="6.5" fill="currentColor" opacity="0.7"/>
      <circle cx="210" cy="61" r="3" fill="white" opacity="0.5"/>
      <circle cx="228" cy="61" r="3" fill="white" opacity="0.5"/>
      <circle cx="246" cy="61" r="3" fill="white" opacity="0.5"/>
      <circle cx="264" cy="61" r="3" fill="white" opacity="0.5"/>
      <circle cx="280" cy="61" r="3" fill="white" opacity="0.4"/>
      <circle cx="295" cy="61" r="2.5" fill="white" opacity="0.35"/>
    </svg>
  );
}

function SuperMidsizeSVG() {
  return (
    <svg viewBox="0 0 360 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 61 Q80 52 155 50 L278 50 Q312 50 330 59 Q312 70 278 72 L155 72 Q80 70 16 61Z" fill="currentColor" opacity="0.9"/>
      <path d="M278 50 L320 57 Q320 61 320 63 L278 72Z" fill="currentColor"/>
      <path d="M24 61 L10 26 L32 46 L50 55Z" fill="currentColor" opacity="0.85"/>
      <path d="M20 61 L2 55 L2 67 L26 66Z" fill="currentColor" opacity="0.75"/>
      <path d="M145 52 L90 18 L104 48 L210 48 L224 18 L238 52Z" fill="currentColor" opacity="0.85"/>
      <ellipse cx="50" cy="48" rx="22" ry="7" fill="currentColor" opacity="0.7"/>
      <ellipse cx="50" cy="74" rx="22" ry="7" fill="currentColor" opacity="0.7"/>
      <circle cx="220" cy="61" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="238" cy="61" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="256" cy="61" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="273" cy="61" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="290" cy="61" r="3" fill="white" opacity="0.4"/>
      <circle cx="306" cy="61" r="3" fill="white" opacity="0.35"/>
    </svg>
  );
}

function HeavyJetSVG() {
  return (
    <svg viewBox="0 0 380 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 60 Q85 49 165 47 L295 47 Q332 47 352 58 Q332 71 295 73 L165 73 Q85 71 14 60Z" fill="currentColor" opacity="0.9"/>
      <path d="M295 47 L344 55 Q344 60 344 62 L295 73Z" fill="currentColor"/>
      <path d="M22 60 L8 22 L30 44 L52 54Z" fill="currentColor" opacity="0.87"/>
      <path d="M18 60 L0 54 L0 66 L24 65Z" fill="currentColor" opacity="0.75"/>
      <path d="M155 49 L95 14 L110 45 L222 45 L238 14 L253 49Z" fill="currentColor" opacity="0.85"/>
      <ellipse cx="48" cy="44" rx="24" ry="8" fill="currentColor" opacity="0.72"/>
      <ellipse cx="48" cy="76" rx="24" ry="8" fill="currentColor" opacity="0.72"/>
      <circle cx="238" cy="60" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="256" cy="60" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="273" cy="60" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="290" cy="60" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="307" cy="60" r="3.5" fill="white" opacity="0.45"/>
      <circle cx="323" cy="60" r="3" fill="white" opacity="0.4"/>
      <circle cx="337" cy="60" r="3" fill="white" opacity="0.3"/>
    </svg>
  );
}

function UltraLongRangeSVG() {
  return (
    <svg viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Long tapered fuselage — Gulfstream G700 profile */}
      <path d="M12 60 Q90 47 175 45 L310 45 Q352 45 374 58 Q352 73 310 75 L175 75 Q90 73 12 60Z" fill="currentColor" opacity="0.9"/>
      {/* Distinctive Gulfstream pointed nose */}
      <path d="M310 45 L368 54 Q374 58 374 60 L368 64 L310 75Z" fill="currentColor"/>
      {/* Tall swept tail fin */}
      <path d="M20 60 L6 18 L28 42 L54 53Z" fill="currentColor" opacity="0.88"/>
      {/* Horizontal stabiliser — swept */}
      <path d="M16 60 L0 52 L0 68 L22 66Z" fill="currentColor" opacity="0.75"/>
      {/* Swept-back wing — longer chord */}
      <path d="M162 47 L96 10 L114 43 L232 43 L250 10 L268 47Z" fill="currentColor" opacity="0.85"/>
      {/* Under-wing nacelles (Gulfstream style) */}
      <ellipse cx="44" cy="44" rx="26" ry="8.5" fill="currentColor" opacity="0.72"/>
      <ellipse cx="44" cy="76" rx="26" ry="8.5" fill="currentColor" opacity="0.72"/>
      {/* Windows — more of them for long cabin */}
      <circle cx="252" cy="60" r="3.5" fill="white" opacity="0.52"/>
      <circle cx="268" cy="60" r="3.5" fill="white" opacity="0.52"/>
      <circle cx="284" cy="60" r="3.5" fill="white" opacity="0.52"/>
      <circle cx="300" cy="60" r="3.5" fill="white" opacity="0.5"/>
      <circle cx="316" cy="60" r="3.5" fill="white" opacity="0.48"/>
      <circle cx="331" cy="60" r="3.5" fill="white" opacity="0.45"/>
      <circle cx="346" cy="60" r="3" fill="white" opacity="0.4"/>
      <circle cx="360" cy="60" r="3" fill="white" opacity="0.35"/>
    </svg>
  );
}

const SILHOUETTES = {
  light: LightJetSVG,
  midsize: MidsizeJetSVG,
  super: SuperMidsizeSVG,
  heavy: HeavyJetSVG,
  ultra: UltraLongRangeSVG,
};

const GRADIENTS = {
  light:   ['#1B3A6B', '#0D2244'],
  midsize: ['#1B4D3E', '#0D2E25'],
  super:   ['#3D2E0A', '#261D06'],
  heavy:   ['#2A1B4D', '#160D2E'],
  ultra:   ['#4D1B1B', '#2E0D0D'],
};

const ACCENT_COLORS = {
  light:   '#5BA3D9',
  midsize: '#4DB87A',
  super:   '#D4A843',
  heavy:   '#9B7FD4',
  ultra:   '#E07070',
};

export default function AircraftSilhouette({ categoryClass, tailNumber }) {
  const SVG = SILHOUETTES[categoryClass] || HeavyJetSVG;
  const [g1, g2] = GRADIENTS[categoryClass] || GRADIENTS.heavy;
  const accent = ACCENT_COLORS[categoryClass] || '#D4A843';
  const gradId = `grad-${categoryClass}`;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(145deg, ${g1} 0%, ${g2} 100%)`,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Subtle runway grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 70% 50%, ${accent}18 0%, transparent 60%)`,
      }}/>
      {/* Ground line */}
      <div style={{
        position: 'absolute', bottom: 24, left: 16, right: 16,
        height: 1, background: `${accent}30`,
      }}/>
      {/* Shadow under aircraft */}
      <div style={{
        position: 'absolute', bottom: 20,
        left: '20%', right: '20%',
        height: 8,
        background: 'rgba(0,0,0,0.35)',
        borderRadius: '50%',
        filter: 'blur(6px)',
      }}/>
      {/* Aircraft SVG */}
      <div style={{ color: accent, width: '88%', position: 'relative', zIndex: 1 }}>
        <SVG />
      </div>
      {/* Tail number badge */}
      {tailNumber && (
        <div style={{
          position: 'absolute', bottom: 10, right: 12,
          fontSize: '0.65rem', fontWeight: 700,
          color: `${accent}`,
          letterSpacing: '0.1em',
          opacity: 0.7,
        }}>
          {tailNumber}
        </div>
      )}
    </div>
  );
}
