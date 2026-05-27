const TESTIMONIALS = [
  {
    initials: 'RM',
    color: '#B8882C',
    name: 'Rahul Mehta',
    title: 'CEO, Nexus Capital Group',
    route: 'BOM → DXB → LHR',
    aircraft: 'Global 7500',
    stars: 5,
    quote:
      "Elevate quoted us in under 4 minutes for a complex Mumbai–Dubai–London multi-leg. Every other broker took 48 hours and added mystery fees. The Global 7500 was immaculate — board room in the sky. We'll never use anyone else.",
  },
  {
    initials: 'SA',
    color: '#2C6B4E',
    name: 'Sarah Al-Rashidi',
    title: 'Managing Director, Gulf Ventures',
    route: 'DXB → RUH → AUH',
    aircraft: 'Challenger 650',
    stars: 5,
    quote:
      'The transparent pricing is what sold me first. I knew exactly what I was paying — no fuel surcharge surprise, no landing fee ambush. The catering was extraordinary. Concierge confirmed ground transfer within 8 minutes. Remarkable.',
  },
  {
    initials: 'JW',
    color: '#1A2F6B',
    name: 'James Whitfield',
    title: 'Chairman, Whitfield Private Equity',
    route: 'LHR → GVA → MCM',
    aircraft: 'Phenom 300E',
    stars: 5,
    quote:
      'Last-minute Geneva deal trip. Elevate had the aircraft confirmed, catering sorted, and ground transfer arranged in under 20 minutes. The Phenom was perfect for a 3-person team. Pricing was exactly as quoted. Truly exceptional service.',
  },
];

function Stars({ count }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#D4A843', fontSize: '1rem' }}>★</span>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="testimonials-section" id="testimonials">
      <div className="container">
        <div className="section-eyebrow">✦ Client Stories</div>
        <h2 style={{ marginBottom: 10 }}>Trusted by Leaders Across Industries</h2>
        <p className="text-muted" style={{ marginBottom: 48, fontSize: '1.05rem', maxWidth: 560 }}>
          From last-minute deal trips to complex multi-leg itineraries, Elevate clients fly with confidence.
        </p>

        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="testimonial-card">
              <Stars count={t.stars} />
              <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="testimonial-footer">
                <div className="testimonial-avatar" style={{ background: t.color }}>
                  {t.initials}
                </div>
                <div className="testimonial-meta">
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-title">{t.title}</div>
                  <div className="testimonial-tags">
                    <span className="testimonial-tag route">{t.route}</span>
                    <span className="testimonial-tag aircraft">{t.aircraft}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="trust-bar">
          <div className="trust-bar-label">Trusted & Certified</div>
          <div className="trust-badges">
            <div className="trust-badge">
              <span className="trust-badge-icon">🛡</span>
              <div>
                <div className="trust-badge-name">ARGUS Platinum</div>
                <div className="trust-badge-sub">Operator Safety Rating</div>
              </div>
            </div>
            <div className="trust-badge">
              <span className="trust-badge-icon">✦</span>
              <div>
                <div className="trust-badge-name">IS-BAO Stage III</div>
                <div className="trust-badge-sub">Safety Management</div>
              </div>
            </div>
            <div className="trust-badge">
              <span className="trust-badge-icon">🏆</span>
              <div>
                <div className="trust-badge-name">WYVERN Wingman</div>
                <div className="trust-badge-sub">Safety Audited</div>
              </div>
            </div>
            <div className="trust-badge">
              <span className="trust-badge-icon">✈</span>
              <div>
                <div className="trust-badge-name">UAE GCAA Licensed</div>
                <div className="trust-badge-sub">AOC Certified</div>
              </div>
            </div>
            <div className="trust-badge">
              <span className="trust-badge-icon">🌐</span>
              <div>
                <div className="trust-badge-name">340+ Operators</div>
                <div className="trust-badge-sub">Verified Network</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
