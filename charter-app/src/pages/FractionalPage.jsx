const TIERS = [
  {
    name: 'Silver',
    share: '1/16 Share',
    hours: '50 hrs / year',
    notice: '24-hour notice',
    price: '$285,000',
    period: '/ year',
    features: [
      'Guaranteed availability on 24-hour notice',
      'Light or Midsize jet program',
      'Full maintenance & insurance included',
      'Dedicated account manager',
      'Access to 340+ operator network',
      'Hours roll over (up to 20% next year)',
    ],
    highlight: false,
  },
  {
    name: 'Gold',
    share: '1/8 Share',
    hours: '100 hrs / year',
    notice: '12-hour notice',
    price: '$520,000',
    period: '/ year',
    features: [
      'Guaranteed availability on 12-hour notice',
      'Midsize to Super Midsize jet program',
      'Full maintenance & insurance included',
      'Priority aircraft upgrade access',
      'Dedicated concierge (24/7)',
      'Hours roll over (up to 25% next year)',
      'Complimentary ground transfer in all major hubs',
    ],
    highlight: true,
  },
  {
    name: 'Platinum',
    share: '1/4 Share',
    hours: '200 hrs / year',
    notice: '10-hour notice',
    price: '$950,000',
    period: '/ year',
    features: [
      'Guaranteed availability on 10-hour notice',
      'Heavy or Ultra Long Range jet program',
      'Full maintenance & insurance included',
      'Aircraft change flexibility mid-program',
      'White-glove concierge team (24/7)',
      'Hours roll over (up to 30% next year)',
      'Complimentary catering on all flights',
      'Global trip planning & visa support',
    ],
    highlight: false,
  },
];

export default function FractionalPage({ onNavigateHome }) {
  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Hero */}
      <div className="page-hero">
        <div className="container">
          <button className="page-back-btn" onClick={onNavigateHome}>← Back to Home</button>
          <div className="section-eyebrow" style={{ marginTop: 32 }}>✦ Fractional Ownership</div>
          <h1 style={{ marginBottom: 16 }}>Own Your Sky.<br /><em>Share the Cost.</em></h1>
          <p className="hero-sub" style={{ maxWidth: 600 }}>
            Buy a share of your chosen aircraft. Get guaranteed access, fixed costs, and the
            flexibility of ownership — without full ownership complexity.
          </p>
          <div className="page-hero-stats">
            <div className="hero-stat"><strong>10h</strong><span>Minimum notice</span></div>
            <div className="hero-stat"><strong>0</strong><span>Fuel surprises</span></div>
            <div className="hero-stat"><strong>1/16</strong><span>Minimum share</span></div>
            <div className="hero-stat"><strong>Fixed</strong><span>Monthly cost</span></div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-eyebrow">How It Works</div>
          <h2 style={{ marginBottom: 40 }}>Simple. Transparent. Yours.</h2>
          <div className="how-it-works-grid">
            {[
              { n: '01', title: 'Choose Your Share', body: 'Select from 1/16 to 1/2 share of a curated aircraft in your preferred category — Light, Midsize, or Ultra Long Range.' },
              { n: '02', title: 'Lock In Your Rate', body: 'Sign a 1- or 3-year agreement. Fixed monthly management fee, fixed occupied hourly rate. No fuel or catering surprises.' },
              { n: '03', title: 'Fly On Demand', body: 'Book flights with as little as 10 hours notice. APEX guarantees availability from our 340+ certified operator network.' },
              { n: '04', title: 'Evolve As You Grow', body: 'Step up your share tier, change aircraft category, or exit with a 90-day buyback guarantee at current market value.' },
            ].map(s => (
              <div key={s.n} className="how-step">
                <div className="how-step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p className="text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="section">
        <div className="container">
          <div className="section-eyebrow">Ownership Tiers</div>
          <h2 style={{ marginBottom: 48 }}>Choose Your Share Level</h2>
          <div className="pricing-grid">
            {TIERS.map(t => (
              <div key={t.name} className={`pricing-card${t.highlight ? ' pricing-highlight' : ''}`}>
                {t.highlight && <div className="pricing-popular">Most Popular</div>}
                <div className="pricing-tier-name">{t.name}</div>
                <div className="pricing-share">{t.share}</div>
                <div className="pricing-hours">{t.hours} · {t.notice}</div>
                <div className="pricing-amount">
                  <span className="pricing-from">from</span>
                  <span className="pricing-price">{t.price}</span>
                  <span className="pricing-period">{t.period}</span>
                </div>
                <ul className="pricing-features">
                  {t.features.map(f => (
                    <li key={f}><span className="pricing-check">✓</span> {f}</li>
                  ))}
                </ul>
                <button
                  className={`pricing-cta${t.highlight ? ' pricing-cta-highlight' : ''}`}
                  onClick={() => window.open('https://wa.me/971545297292?text=Hi%2C%20I%27m%20interested%20in%20the%20' + t.name + '%20fractional%20ownership%20program', '_blank')}
                >
                  Enquire — {t.name} →
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--muted)', fontSize: '0.9rem' }}>
            All prices exclude VAT. Management fees quoted separately. Custom shares available on request.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="page-cta-section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginBottom: 16 }}>Ready to Own Your Share?</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 32, fontSize: '1.1rem' }}>
            Our fractional team will design a programme matched to your travel patterns and budget.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="page-cta-btn-primary"
              onClick={() => window.open('https://wa.me/971545297292?text=Hi%2C%20I%27d%20like%20to%20discuss%20fractional%20ownership%20with%20APEX%20Charters', '_blank')}
            >
              💬 WhatsApp Our Team
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
