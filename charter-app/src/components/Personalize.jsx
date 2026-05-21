import { useState } from 'react';
import { cateringOptions, entertainmentOptions, transferOptions } from '../data/aircraft.js';

const STEPS = ['Aircraft', 'Catering', 'Entertainment', 'Transfer', 'Special Requests'];

export default function Personalize({ aircraft, searchParams, petAboard, onConfirm }) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({
    catering: 'standard',
    entertainment: 'standard',
    transfer: 'none',
    specialRequests: '',
    petOption: null,
  });

  function pick(key, val) {
    setSelections(s => ({ ...s, [key]: val }));
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else onConfirm({ aircraft, searchParams, selections });
  }

  const stepDone = i => i < step;

  return (
    <section className="personalize-section" id="personalize">
      <div className="container">
        <div className="section-eyebrow">Step {step + 1} of {STEPS.length}</div>
        <h2 style={{ marginBottom: 8 }}>Personalise Your Flight</h2>
        <p className="text-muted" style={{ marginBottom: 36, fontSize: '1.05rem' }}>
          Every detail tailored to you — from what's on your plate to how you land.
        </p>

        <div className="step-nav">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={`step-item${step === i ? ' active' : ''}${stepDone(i) ? ' done' : ''}`}
              onClick={() => i <= step && setStep(i)}
            >
              <div className="step-num">{stepDone(i) ? '✓' : i + 1}</div>
              <div className="step-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="step-content">
          {step === 0 && (
            <div>
              <h3 style={{ marginBottom: 8 }}>Your Selected Aircraft</h3>
              <p className="text-muted" style={{ marginBottom: 24 }}>
                {aircraft.model} — {aircraft.category} · {aircraft.pax} passengers max
              </p>
              <div style={{
                background: 'white', border: '2px solid var(--navy)',
                borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 480
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <span style={{ fontSize: '3rem' }}>{aircraft.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{aircraft.model}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{aircraft.category}</div>
                  </div>
                </div>
                <div className="aircraft-specs">
                  <div className="spec-item">
                    <span className="spec-val">{aircraft.pax}</span>
                    <span className="spec-key">Passengers</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-val">{aircraft.range}</span>
                    <span className="spec-key">Range</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-val">{aircraft.speed}</span>
                    <span className="spec-key">Cruise</span>
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {aircraft.amenities.map(a => <span key={a} className="amenity-tag">{a}</span>)}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: 4 }}>On-Board Dining</h3>
              <p className="text-muted" style={{ marginBottom: 24 }}>What's on your menu at 45,000 ft?</p>
              <div className="option-grid">
                {cateringOptions.map(opt => (
                  <div
                    key={opt.id}
                    className={`option-card${selections.catering === opt.id ? ' selected' : ''}`}
                    onClick={() => pick('catering', opt.id)}
                  >
                    <div className="option-icon">{opt.icon}</div>
                    <div className="option-title">{opt.title}</div>
                    <div className="option-desc">{opt.desc}</div>
                    <div className="option-price">{opt.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ marginBottom: 4 }}>In-Flight Entertainment</h3>
              <p className="text-muted" style={{ marginBottom: 24 }}>How do you want to spend your time in the sky?</p>
              <div className="option-grid">
                {entertainmentOptions.map(opt => (
                  <div
                    key={opt.id}
                    className={`option-card${selections.entertainment === opt.id ? ' selected' : ''}`}
                    onClick={() => pick('entertainment', opt.id)}
                  >
                    <div className="option-icon">{opt.icon}</div>
                    <div className="option-title">{opt.title}</div>
                    <div className="option-desc">{opt.desc}</div>
                    <div className="option-price">{opt.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ marginBottom: 4 }}>Ground Transfer</h3>
              <p className="text-muted" style={{ marginBottom: 24 }}>From your door to the sky — and back again seamlessly.</p>
              <div className="option-grid">
                {transferOptions.map(opt => (
                  <div
                    key={opt.id}
                    className={`option-card${selections.transfer === opt.id ? ' selected' : ''}`}
                    onClick={() => pick('transfer', opt.id)}
                  >
                    <div className="option-icon">{opt.icon}</div>
                    <div className="option-title">{opt.title}</div>
                    <div className="option-desc">{opt.desc}</div>
                    <div className="option-price">{opt.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ maxWidth: 600 }}>
              <h3 style={{ marginBottom: 4 }}>Special Requests & Notes</h3>
              <p className="text-muted" style={{ marginBottom: 24 }}>
                Anniversary roses? Hypoallergenic pillows? A specific playlist? Tell us anything.
              </p>

              {petAboard && (
                <div style={{
                  background: 'var(--sage-light)', border: '1.5px solid #B8DBC8',
                  borderRadius: 'var(--radius)', padding: 18, marginBottom: 20
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>🐾 Pet Amenities Confirmed</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    Your companion will have a dedicated cabin bed, fresh water, approved harness point,
                    and a pet menu. Our crew is fully certified in animal care.
                  </p>
                </div>
              )}

              <div className="form-field">
                <label>Your special requests</label>
                <textarea
                  rows={5}
                  value={selections.specialRequests}
                  onChange={e => pick('specialRequests', e.target.value)}
                  placeholder="E.g. Gluten-free meals, extra champagne, birthday flowers, specific newspaper, quiet cabin setting…"
                />
              </div>

              <div style={{
                background: 'var(--gold-xlight)', border: '1px solid var(--gold-light)',
                borderRadius: 'var(--radius)', padding: 16, marginTop: 16
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>Your Selections</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.9 }}>
                  ✦ Aircraft: {aircraft.model}<br />
                  ✦ Dining: {cateringOptions.find(o => o.id === selections.catering)?.title}<br />
                  ✦ Entertainment: {entertainmentOptions.find(o => o.id === selections.entertainment)?.title}<br />
                  ✦ Transfer: {transferOptions.find(o => o.id === selections.transfer)?.title}<br />
                  {petAboard && '✦ Pet amenities: Included'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="step-actions">
          {step > 0 ? (
            <button className="btn-back" onClick={() => setStep(s => s - 1)}>← Back</button>
          ) : <div />}
          <button
            className={step === STEPS.length - 1 ? 'btn-gold' : 'btn-next'}
            onClick={next}
          >
            {step === STEPS.length - 1 ? '✦ Get My Quote' : 'Continue →'}
          </button>
        </div>
      </div>
    </section>
  );
}
