import { useState } from 'react';
import { petOptions } from '../data/aircraft.js';

export default function PetSection() {
  const [selected, setSelected] = useState(null);

  return (
    <section className="pet-section" id="pets">
      <div className="container">
        <div className="pet-inner">
          <div>
            <div className="pet-emoji">🐾</div>
            <div className="section-eyebrow" style={{ color: 'var(--sage)' }}>Flying with Companions</div>
            <h2>Your pets fly<br />first-class too.</h2>
            <p style={{ marginTop: 16, fontSize: '1.05rem', color: 'var(--muted)', maxWidth: 400 }}>
              No cargo holds. No separation. Your companion flies in the cabin with you,
              treated with the same care as every guest aboard.
            </p>
            <ul className="pet-checks">
              <li className="pet-check">Cabin beds & personalised pet menu</li>
              <li className="pet-check">Climate-controlled travel throughout</li>
              <li className="pet-check">Zero airline crate restrictions</li>
              <li className="pet-check">Vet documentation assistance</li>
              <li className="pet-check">Crew certified in animal care & handling</li>
              <li className="pet-check">Customs & import clearance support</li>
            </ul>
          </div>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem' }}>
              What kind of companion is flying with you?
            </p>
            <div className="pet-options-grid">
              {petOptions.map(opt => (
                <div
                  key={opt.id}
                  className={`pet-option-card${selected === opt.id ? ' selected' : ''}`}
                  onClick={() => setSelected(opt.id)}
                >
                  <h4>{opt.title}</h4>
                  <p>{opt.desc}</p>
                </div>
              ))}
            </div>

            {selected && (
              <div style={{
                marginTop: 20,
                background: 'white',
                border: '1.5px solid var(--sage)',
                borderRadius: 'var(--radius)',
                padding: 18,
                animation: 'fadeSlideIn 0.3s ease',
              }}>
                <div style={{ fontWeight: 700, color: 'var(--sage)', marginBottom: 8 }}>
                  ✓ {petOptions.find(o => o.id === selected)?.title} — all set
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                  We'll automatically include all required pet amenities, documentation
                  assistance, and cabin setup. Your concierge will reach out to confirm
                  breed/species details before your flight.
                </p>
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <a
                href="#search"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '13px 24px',
                  background: 'var(--sage)',
                  color: 'white',
                  borderRadius: 'var(--radius)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  transition: 'var(--transition)',
                }}
              >
                🐾 Book Pet-Friendly Charter
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
