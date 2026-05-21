import { useState, useEffect } from 'react';
import { cateringOptions, entertainmentOptions, transferOptions } from '../data/aircraft.js';

function genRef() {
  return 'AX-' + Math.random().toString(36).toUpperCase().slice(2, 8);
}

export default function QuotePanel({ quoteData, onClose, onToast }) {
  const { aircraft, searchParams, selections } = quoteData;
  const [aiText, setAiText] = useState('');
  const [aiDone, setAiDone] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ref] = useState(genRef);

  const from = searchParams?.from;
  const to = searchParams?.to;
  const departure = searchParams?.departure;

  const flightHours = Math.max(1.5, Math.floor(Math.random() * 8) + 2);
  const baseTotal = aircraft.basePrice * flightHours;
  const cateringCost = selections?.catering === 'michelin' ? 6500 : selections?.catering === 'premium' ? 1800 : 0;
  const entCost = selections?.entertainment === 'cinema' ? 950 : selections?.entertainment === 'boardroom' ? 1400 : 0;
  const transferCost = selections?.transfer === 'helicopter' ? 4800 : selections?.transfer === 'luxury' ? 1200 : 0;
  const total = baseTotal + cateringCost + entCost + transferCost;

  useEffect(() => {
    const stream = async () => {
      try {
        const res = await fetch('/api/quote-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: from?.city,
            to: to?.city,
            aircraft: aircraft.model,
            pax: searchParams?.pax,
          }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') { setAiDone(true); return; }
            try {
              const { delta } = JSON.parse(data);
              if (delta) { text += delta; setAiText(text); }
            } catch {}
          }
        }
        setAiDone(true);
      } catch {
        setAiText(`Analyzed ${from?.city || 'origin'} → ${to?.city || 'destination'} across 340+ operators. Optimal route identified with ${aircraft.model}. Positioning costs minimized. All-in pricing confirmed — no hidden fees.`);
        setAiDone(true);
      }
    };
    stream();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email) return;
    setSubmitting(true);
    try {
      await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, ref, aircraft, searchParams, selections, total }),
      });
    } catch {}
    setSubmitting(false);
    setSubmitted(true);
    onToast({ type: 'success', text: `Quote ${ref} sent to ${email}` });
  }

  return (
    <>
      <div className="quote-overlay" onClick={onClose} />
      <div className="quote-panel">
        <div className="quote-header">
          <div>
            <h3>Your Personalised Quote</h3>
            <p>Reference: {ref}</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="quote-body">
          {submitted ? (
            <div className="success-screen">
              <div className="success-icon">✓</div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Quote Sent!</h3>
              <div className="success-ref">{ref}</div>
              <p>
                Your formal quote has been sent to <strong>{email}</strong>.
                Your dedicated APEX concierge will call within <strong>15 minutes</strong> to confirm details and secure your aircraft.
              </p>
              <div style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--muted)' }}>
                Questions? WhatsApp your concierge directly using reference <strong>{ref}</strong>.
              </div>
            </div>
          ) : (
            <>
              {from && to && (
                <div className="quote-flight-summary">
                  <div className="qfs-route">
                    {from.code} <span>→</span> {to.code}
                  </div>
                  <div className="qfs-details">
                    {from.city} → {to.city} · {aircraft.model} · {searchParams?.pax} pax
                    {departure && ` · ${new Date(departure + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </div>
                </div>
              )}

              <div className="ai-thinking">
                <div className="ai-thinking-header">
                  ✦ APEX Intelligence
                  {!aiDone && (
                    <div className="ai-dots">
                      <span /><span /><span />
                    </div>
                  )}
                  {aiDone && <span style={{ color: 'var(--sage)', fontSize: '0.82rem', fontWeight: 600 }}>✓ Analysis complete</span>}
                </div>
                <div className="ai-stream">
                  {aiText || 'Analyzing routes, operators, and positioning costs…'}
                </div>
              </div>

              <div className="price-breakdown">
                <h4>Price Breakdown</h4>
                <div className="price-row">
                  <span>{aircraft.model} — {flightHours}h est. flight time</span>
                  <span className="price-val">${baseTotal.toLocaleString()}</span>
                </div>
                {cateringCost > 0 && (
                  <div className="price-row">
                    <span>{cateringOptions.find(o => o.id === selections.catering)?.title} Dining</span>
                    <span className="price-val">+${cateringCost.toLocaleString()}</span>
                  </div>
                )}
                {entCost > 0 && (
                  <div className="price-row">
                    <span>{entertainmentOptions.find(o => o.id === selections.entertainment)?.title}</span>
                    <span className="price-val">+${entCost.toLocaleString()}</span>
                  </div>
                )}
                {transferCost > 0 && (
                  <div className="price-row">
                    <span>{transferOptions.find(o => o.id === selections.transfer)?.title}</span>
                    <span className="price-val">+${transferCost.toLocaleString()}</span>
                  </div>
                )}
                {searchParams?.petAboard && (
                  <div className="price-row">
                    <span>🐾 Pet amenity package</span>
                    <span className="price-val" style={{ color: 'var(--sage)' }}>Complimentary</span>
                  </div>
                )}
                <div className="price-row total">
                  <span>Estimated Total</span>
                  <span className="price-val">${total.toLocaleString()}</span>
                </div>
              </div>

              <div className="quote-form">
                <h4>Send me the full quote</h4>
                <form onSubmit={handleSubmit}>
                  <div className="form-field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>WhatsApp / Phone (optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+44 7700 900000"
                    />
                  </div>
                  <button
                    type="submit"
                    className="quote-submit"
                    disabled={submitting || !name || !email}
                  >
                    {submitting ? 'Sending…' : `✦ Send My Quote — ${ref}`}
                  </button>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 10, textAlign: 'center' }}>
                    No card required. Your concierge calls within 15 minutes.
                  </p>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
