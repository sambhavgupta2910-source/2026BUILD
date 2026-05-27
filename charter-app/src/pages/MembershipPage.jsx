const TIERS = [
  {
    name: 'APEX Essential',
    tagline: 'For the occasional flyer who demands the best',
    monthlyFee: '$2,500',
    period: '/ month',
    discount: '15%',
    discountLabel: 'off all charters',
    accentColor: '#B8882C',
    features: [
      '15% discount on all on-demand charters',
      'Priority booking (48-hour advance notice)',
      'Dedicated account manager',
      'Member-only empty leg alerts',
      'Digital concierge via WhatsApp',
      'Access to Jet Card at member rates',
    ],
    highlight: false,
  },
  {
    name: 'APEX Premier',
    tagline: 'For frequent flyers who live at 45,000 feet',
    monthlyFee: '$5,000',
    period: '/ month',
    discount: '20%',
    discountLabel: 'off all charters',
    accentColor: '#D4A843',
    features: [
      '20% discount on all on-demand charters',
      'Same-day booking guarantee (6-hour notice)',
      'Priority 24/7 concierge team',
      'First access to empty legs before public',
      'Complimentary lounge access — 40+ airports',
      'Curated destination experiences (3/year)',
      'Companion traveller discount (10%)',
      'Dedicated flight operations contact',
    ],
    highlight: true,
  },
  {
    name: 'APEX Infinite',
    tagline: 'For those who require the extraordinary',
    monthlyFee: '$12,500',
    period: '/ month',
    discount: '25%',
    discountLabel: 'off all charters',
    accentColor: '#1A2F6B',
    features: [
      '25% discount on all on-demand charters',
      'On-call jet — 2-hour availability guarantee',
      'Private chef on all flights',
      'Global concierge (visas, hotels, events)',
      'VIP lounge access in 60+ airports worldwide',
      'Curated experiences (unlimited, bespoke)',
      'Family travel included in membership',
      'Dedicated operations team (24/7/365)',
      'Annual aviation review & flight planning session',
    ],
    highlight: false,
  },
];

const PERKS = [
  { icon: '✦', title: 'Member Pricing', body: 'Lock in discounted charter rates that never change during your membership term.' },
  { icon: '⚡', title: 'Priority Access', body: 'Your requests jump the queue. Empty legs, last-minute slots — members first, always.' },
  { icon: '🍽', title: 'Curated Experiences', body: 'From Michelin dining at 40,000ft to private island access on landing — all arranged by your concierge.' },
  { icon: '🛡', title: 'ARGUS Platinum Only', body: 'Every flight is matched to an ARGUS Platinum or WYVERN Wingman-rated operator. No exceptions.' },
  { icon: '🌐', title: 'Global Network', body: "340+ certified operators across 6 continents. If there's an aircraft, APEX will find it for you." },
  { icon: '📱', title: 'Dedicated App Access', body: 'Priority booking portal, live flight tracking, and direct concierge chat — all in one app.' },
];

export default function MembershipPage({ onNavigateHome }) {
  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="page-hero">
        <div className="container">
          <button className="page-back-btn" onClick={onNavigateHome}>← Back to Home</button>
          <div className="section-eyebrow" style={{ marginTop: 32 }}>✦ Membership</div>
          <h1 style={{ marginBottom: 16 }}>Fly Private,<br /><em>On Your Terms.</em></h1>
          <p className="hero-sub" style={{ maxWidth: 600 }}>
            An APEX Membership is your passport to the world's finest private aviation network.
            Guaranteed access. Locked-in discounts. A concierge that works harder than you do.
          </p>
          <div className="page-hero-stats">
            <div className="hero-stat"><strong>25%</strong><span>Max discount</span></div>
            <div className="hero-stat"><strong>2h</strong><span>On-call jet</span></div>
            <div className="hero-stat"><strong>60+</strong><span>VIP lounges</span></div>
            <div className="hero-stat"><strong>24/7</strong><span>Concierge</span></div>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <section className="section">
        <div className="container">
          <div className="section-eyebrow">Membership Tiers</div>
          <h2 style={{ marginBottom: 48 }}>Choose Your Level of Access</h2>
          <div className="membership-grid">
            {TIERS.map(t => (
              <div
                key={t.name}
                className={`membership-card${t.highlight ? ' membership-highlight' : ''}`}
                style={{ '--accent': t.accentColor }}
              >
                {t.highlight && <div className="pricing-popular">Most Popular</div>}
                <div className="membership-accent-bar" style={{ background: t.accentColor }} />
                <div className="membership-tier-name" style={{ color: t.accentColor }}>{t.name}</div>
                <div className="membership-tagline">{t.tagline}</div>

                <div className="membership-discount-pill" style={{ borderColor: t.accentColor, color: t.accentColor }}>
                  {t.discount} {t.discountLabel}
                </div>

                <div className="pricing-amount" style={{ marginTop: 20 }}>
                  <span className="pricing-price">{t.monthlyFee}</span>
                  <span className="pricing-period">{t.period}</span>
                </div>

                <ul className="pricing-features" style={{ marginTop: 24 }}>
                  {t.features.map(f => (
                    <li key={f}>
                      <span className="pricing-check" style={{ color: t.accentColor }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                <button
                  className="pricing-cta"
                  style={t.highlight ? { background: t.accentColor, color: 'var(--navy)', border: 'none' } : { borderColor: t.accentColor, color: t.accentColor }}
                  onClick={() => window.open('https://wa.me/971545297292?text=Hi%2C%20I%27m%20interested%20in%20the%20' + encodeURIComponent(t.name) + '%20membership%20with%20APEX%20Charters', '_blank')}
                >
                  Join {t.name.replace('APEX ', '')} →
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--muted)', fontSize: '0.9rem' }}>
            All memberships billed annually. Cancel with 60-day notice after 6 months. Prices exclude VAT.
          </p>
        </div>
      </section>

      {/* Member perks */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-eyebrow">Why Members Love APEX</div>
          <h2 style={{ marginBottom: 48 }}>Built for People Who Value Their Time</h2>
          <div className="experience-grid">
            {PERKS.map(p => (
              <div key={p.title} className="experience-card">
                <div className="exp-icon">{p.icon}</div>
                <h3 className="exp-title">{p.title}</h3>
                <p className="exp-body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ-style objection handling */}
      <section className="section">
        <div className="container">
          <div className="section-eyebrow">Common Questions</div>
          <h2 style={{ marginBottom: 40 }}>Everything You Need to Know</h2>
          <div className="faq-grid">
            {[
              { q: 'Can I cancel my membership?', a: 'Yes. After the first 6 months you can cancel with 60 days notice. Annual memberships are non-refundable after month 3.' },
              { q: 'Do discounts apply to empty legs?', a: 'Member discounts apply to on-demand charter. Empty legs are already priced at 40–70% below market, so discounts are not stacked.' },
              { q: 'Can I upgrade or downgrade tiers?', a: 'You can upgrade any time. Downgrades take effect at the next annual renewal.' },
              { q: 'Is the concierge really 24/7?', a: 'Yes — APEX operates from Dubai, London, and New York, covering all time zones. Premier and Infinite members have a direct line to a named concierge.' },
              { q: 'Are there blackout dates?', a: 'No blackout dates for any tier. Infinite members have a 2-hour on-call jet guarantee year-round including public holidays.' },
              { q: 'Can I share my membership?', a: 'Essential and Premier tiers are individual. Infinite membership includes your family (up to 4 named travellers).' },
            ].map(f => (
              <div key={f.q} className="faq-item">
                <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{f.q}</h3>
                <p className="text-muted" style={{ fontSize: '0.92rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-cta-section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginBottom: 16 }}>Ready to Join APEX?</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 32, fontSize: '1.1rem' }}>
            Speak with our membership team to find the right tier for your travel patterns.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="page-cta-btn-primary"
              onClick={() => window.open('https://wa.me/971545297292?text=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20APEX%20Membership', '_blank')}
            >
              💬 Talk to Our Membership Team
            </button>
            <button className="page-cta-btn-secondary" onClick={onNavigateHome}>
              ← Back to Charter Search
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
