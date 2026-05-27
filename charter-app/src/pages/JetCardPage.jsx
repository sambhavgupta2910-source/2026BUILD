const CARDS = [
  {
    name: 'Starter',
    hours: '25 Hours',
    rate: '$4,950',
    per: '/ flight hour',
    total: '$123,750',
    category: 'Light & Midsize Jets',
    notice: '24-hour notice guarantee',
    features: [
      'All-in hourly rate (fuel, crew, fees)',
      'Light Jet or Midsize aircraft',
      'Hours never expire',
      'Dedicated account manager',
      '24-hour booking notice',
      'Unused hours refundable at 90% in year 1',
    ],
    highlight: false,
  },
  {
    name: 'Business',
    hours: '50 Hours',
    rate: '$8,200',
    per: '/ flight hour',
    total: '$410,000',
    category: 'Super Midsize & Heavy Jets',
    notice: '12-hour notice guarantee',
    features: [
      'All-in hourly rate (fuel, crew, fees)',
      'Super Midsize, Heavy, or upgrade to Ultra',
      'Hours never expire',
      'Priority 24/7 concierge line',
      '12-hour booking notice',
      'Free aircraft upgrade on 10+ hour flights',
      'Complimentary catering up to $500/flight',
    ],
    highlight: true,
  },
  {
    name: 'Elite',
    hours: '100 Hours',
    rate: '$11,500',
    per: '/ flight hour',
    total: '$1,150,000',
    category: 'Heavy & Ultra Long Range',
    notice: '8-hour notice guarantee',
    features: [
      'All-in hourly rate (fuel, crew, fees)',
      'Heavy Jet or Ultra Long Range exclusively',
      'Hours never expire, carry over indefinitely',
      'White-glove concierge team (24/7)',
      '8-hour booking notice',
      'Complimentary catering on all flights',
      'Global trip support — visas, slots, permits',
      'VIP lounge access in 60+ airports',
    ],
    highlight: false,
  },
];

function Comparison() {
  const rows = [
    { label: 'All-in pricing', starter: true, business: true, elite: true },
    { label: 'Hours never expire', starter: true, business: true, elite: true },
    { label: 'Dedicated account manager', starter: true, business: true, elite: true },
    { label: 'Priority concierge (24/7)', starter: false, business: true, elite: true },
    { label: 'Complimentary catering', starter: false, business: '≤ $500', elite: 'Unlimited' },
    { label: 'Aircraft upgrade access', starter: false, business: '10h+ flights', elite: 'Always' },
    { label: 'VIP lounge access', starter: false, business: false, elite: '60+ airports' },
    { label: 'Booking notice', starter: '24h', business: '12h', elite: '8h' },
  ];

  return (
    <div className="comparison-table-wrap">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Starter</th>
            <th className="comp-highlight">Business</th>
            <th>Elite</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <td>{r.label}</td>
              {['starter', 'business', 'elite'].map(tier => (
                <td key={tier} className={tier === 'business' ? 'comp-highlight' : ''}>
                  {r[tier] === true ? <span className="comp-yes">✓</span>
                    : r[tier] === false ? <span className="comp-no">—</span>
                    : <span className="comp-val">{r[tier]}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function JetCardPage({ onNavigateHome }) {
  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="page-hero">
        <div className="container">
          <button className="page-back-btn" onClick={onNavigateHome}>← Back to Home</button>
          <div className="section-eyebrow" style={{ marginTop: 32 }}>✦ Jet Card Program</div>
          <h1 style={{ marginBottom: 16 }}>Buy Hours.<br /><em>Fly Anytime.</em></h1>
          <p className="hero-sub" style={{ maxWidth: 600 }}>
            Pre-purchase flight hours at a locked-in rate. One number covers everything —
            fuel, crew, catering, landing fees. No surprises. Ever.
          </p>
          <div className="page-hero-stats">
            <div className="hero-stat"><strong>8h</strong><span>Minimum notice</span></div>
            <div className="hero-stat"><strong>0</strong><span>Hidden fees</span></div>
            <div className="hero-stat"><strong>∞</strong><span>Hours never expire</span></div>
            <div className="hero-stat"><strong>340+</strong><span>Aircraft available</span></div>
          </div>
        </div>
      </div>

      {/* Jet Cards */}
      <section className="section">
        <div className="container">
          <div className="section-eyebrow">Jet Card Tiers</div>
          <h2 style={{ marginBottom: 48 }}>One Rate. All-In.</h2>
          <div className="pricing-grid">
            {CARDS.map(c => (
              <div key={c.name} className={`pricing-card${c.highlight ? ' pricing-highlight' : ''}`}>
                {c.highlight && <div className="pricing-popular">Best Value</div>}
                <div className="pricing-tier-name">{c.name}</div>
                <div className="pricing-share">{c.hours} Pre-Purchased</div>
                <div className="pricing-hours">{c.category}</div>
                <div className="pricing-amount">
                  <span className="pricing-from">from</span>
                  <span className="pricing-price">{c.rate}</span>
                  <span className="pricing-period">{c.per}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 16 }}>
                  Total investment: <strong style={{ color: 'var(--navy)' }}>{c.total}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--sage)', marginBottom: 20, fontWeight: 600 }}>
                  ✓ {c.notice}
                </div>
                <ul className="pricing-features">
                  {c.features.map(f => (
                    <li key={f}><span className="pricing-check">✓</span> {f}</li>
                  ))}
                </ul>
                <button
                  className={`pricing-cta${c.highlight ? ' pricing-cta-highlight' : ''}`}
                  onClick={() => window.open('https://wa.me/971545297292?text=Hi%2C%20I%27m%20interested%20in%20the%20' + c.name + '%20Jet%20Card%20from%20APEX%20Charters', '_blank')}
                >
                  Get {c.name} Card →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-eyebrow">Side by Side</div>
          <h2 style={{ marginBottom: 40 }}>Compare the Cards</h2>
          <Comparison />
        </div>
      </section>

      <section className="page-cta-section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginBottom: 16 }}>Start Flying on Your Terms</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 32, fontSize: '1.1rem' }}>
            Custom hour blocks and aircraft category upgrades are available. Talk to our Jet Card team today.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="page-cta-btn-primary"
              onClick={() => window.open('https://wa.me/971545297292?text=Hi%2C%20I%27d%20like%20to%20buy%20a%20Jet%20Card%20with%20APEX%20Charters', '_blank')}
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
