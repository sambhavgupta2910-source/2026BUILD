import { useState } from 'react';

const categories = {
  Dining: [
    { icon: '👨‍🍳', title: 'Private Chef Service', desc: 'Michelin-trained chefs create bespoke menus tailored to every dietary preference — from Japanese kaiseki to classic British.', tag: 'Available on all aircraft' },
    { icon: '🍾', title: 'Fine Wine & Spirits', desc: 'Hand-curated cellar of first-growth Bordeaux, rare Scotch, and vintage Champagne. Sommelier pairings available.', tag: 'By request' },
    { icon: '🫘', title: 'Artisan Coffee Bar', desc: 'Single-origin espresso, matcha ceremony, or a full loose-leaf tea service at altitude. Your barista is on board.', tag: 'Included' },
  ],
  Connectivity: [
    { icon: '🛰️', title: 'Starlink Premium', desc: 'Low-latency satellite internet across the entire globe. Stream 4K, video-call without stutter, work without compromise.', tag: 'Heavy & Ultra jets' },
    { icon: '📞', title: 'Encrypted Sat Phone', desc: 'Secure, crystal-clear voice communication anywhere in the world. IMSI-resistant routing for confidential calls.', tag: 'On request' },
    { icon: '💻', title: 'Floating Office', desc: 'Dual 4K displays, secure Bloomberg terminal, encrypted VPN, and a printer/scanner setup for full productivity.', tag: 'Boardroom option' },
  ],
  Wellness: [
    { icon: '🛁', title: 'Shower Suites', desc: 'Full wet-room showers aboard Global 7500 and G700. Arrive fresh after any long-haul, ready for any occasion.', tag: 'Ultra Long Range only' },
    { icon: '💆', title: 'Spa & Massage', desc: 'Certified therapists on board for long-haul flights. Reflexology, aromatherapy, or deep-tissue massage at cruising altitude.', tag: 'On request' },
    { icon: '🧘', title: 'Wellness Amenities', desc: 'Essential oil diffusers, sleep kits with cashmere blankets, noise-cancellation systems, and meditation soundscapes.', tag: 'Included' },
  ],
  Security: [
    { icon: '🛡️', title: 'Private Terminal Access', desc: 'Fixed Base Operators (FBOs) worldwide. No queues, no security lines, no crowds — your aircraft is ready at the ramp.', tag: 'All flights' },
    { icon: '🚘', title: 'Close Protection', desc: 'Discreet armed and unarmed security professionals for ground transfers and on-board escort. Background-cleared crews.', tag: 'On request' },
    { icon: '🔏', title: 'Manifest Privacy', desc: 'Your passenger manifest, flight path and ground movements are held to strict NDA. No third-party data sharing.', tag: 'Standard' },
  ],
};

export default function ExperienceSection() {
  const [activeTab, setActiveTab] = useState('Dining');

  return (
    <section className="experience-section" id="experience">
      <div className="container">
        <div className="section-eyebrow">The APEX Experience</div>
        <h2>Every moment is curated.</h2>
        <p className="section-sub">
          From wheels-up to wheels-down, no detail is left to chance.
        </p>

        <div className="experience-tabs">
          {Object.keys(categories).map(tab => (
            <button
              key={tab}
              className={`exp-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="experience-grid">
          {categories[activeTab].map(card => (
            <div key={card.title} className="exp-card">
              <div className="exp-card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <div className="exp-card-tag">✦ {card.tag}</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 56,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 36px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
        }}>
          {[
            { val: '24/7', label: 'Concierge availability' },
            { val: '4 min', label: 'Average quote time' },
            { val: '340+', label: 'Certified operators' },
            { val: '100%', label: 'Client satisfaction' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.4rem', fontWeight: 700, color: 'var(--gold-bright)' }}>
                {s.val}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
