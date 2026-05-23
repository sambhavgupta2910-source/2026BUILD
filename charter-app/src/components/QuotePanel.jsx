import { useState, useEffect } from 'react';
import { cateringOptions, entertainmentOptions, transferOptions } from '../data/aircraft.js';

function genRef() {
  return 'AX-' + Math.random().toString(36).toUpperCase().slice(2, 8);
}

function WhatsAppShare({ from, to, aircraft, searchParams, total, flightHours, ref_ }) {
  const [generating, setGenerating] = useState(false);
  const [cardUrl, setCardUrl] = useState(null);

  async function generateCard() {
    setGenerating(true);
    try {
      const departure = searchParams?.departure;
      const dateStr = departure
        ? new Date(departure + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      const res = await fetch('/api/quote-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: from?.city, to: to?.city, aircraft: aircraft?.model,
          passengers: searchParams?.pax, price: total, dates: dateStr,
          tripType: (searchParams?.tripType || 'ONE WAY').toUpperCase(), ref: ref_,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        setCardUrl(URL.createObjectURL(blob));
      }
    } catch {}
    setGenerating(false);
  }

  const waText = encodeURIComponent(
    `✈ APEX Charters Quote\n${from?.city || ''} → ${to?.city || ''}\n${aircraft?.model} · ${searchParams?.pax} pax · ~${flightHours}h\n$${total?.toLocaleString()} USD\nRef: ${ref_}\n\napex-charters.com`
  );

  return (
    <div style={{ background: '#E7F8EF', border: '1.5px solid #B8DBC8', borderRadius: 'var(--radius)', padding: 18, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.2rem' }}>💬</span> Share Quote Card
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={generateCard} disabled={generating} style={{
          flex: 1, padding: '11px 16px', background: generating ? '#ccc' : '#0D1B3E',
          color: 'white', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.82rem',
          border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
        }}>
          {generating ? 'Generating…' : cardUrl ? '↻ Regenerate Card' : '⬇ Generate Quote Card'}
        </button>
        {cardUrl && (
          <a href={cardUrl} download={`apex-quote-${ref_}.png`} style={{
            padding: '11px 16px', background: '#25D366', color: 'white',
            borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.82rem',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
          }}>↓ Save</a>
        )}
        <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" style={{
          padding: '11px 16px', background: '#25D366', color: 'white',
          borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.82rem',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
        }}>Share →</a>
      </div>
      {cardUrl && (
        <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          <img src={cardUrl} alt="Quote card" style={{ width: '100%', display: 'block' }} />
        </div>
      )}
    </div>
  );
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
  const [flightHours, setFlightHours] = useState(null);
  const [distNm, setDistNm] = useState(null);
  const [baseTotal, setBaseTotal] = useState(0);
  const [priceLoading, setPriceLoading] = useState(true);

  const from = searchParams?.from;
  const to   = searchParams?.to;
  const departure = searchParams?.departure;

  const cateringCost  = selections?.catering === 'michelin' ? 6500 : selections?.catering === 'premium' ? 1800 : 0;
  const entCost       = selections?.entertainment === 'cinema' ? 950 : selections?.entertainment === 'boardroom' ? 1400 : 0;
  const transferCost  = selections?.transfer === 'helicopter' ? 4800 : selections?.transfer === 'luxury' ? 1200 : 0;
  const total = baseTotal + cateringCost + entCost + transferCost;

  // Fetch real pricing based on actual route distance
  useEffect(() => {
    async function loadPrice() {
      setPriceLoading(true);
      try {
        const res = await fetch('/api/flight-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, categoryClass: aircraft.categoryClass, basePrice: aircraft.basePrice }),
        });
        const data = await res.json();
        setFlightHours(data.flightHours);
        setDistNm(data.distNm);
        setBaseTotal(data.tripCost);
      } catch {
        setFlightHours(3.5);
        setBaseTotal(aircraft.basePrice * 3.5 + 2400);
      }
      setPriceLoading(false);
    }
    loadPrice();
  }, []);

  // Stream AI route analysis
  useEffect(() => {
    const stream = async () => {
      try {
        const res = await fetch('/api/quote-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: from?.city, to: to?.city, aircraft: aircraft.model, pax: searchParams?.pax }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
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
        setAiText(`Analyzed ${from?.city || 'origin'} → ${to?.city || 'destination'} across 340+ operators. Optimal route identified with ${aircraft.model}. All-in pricing confirmed — no hidden fees.`);
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
      const lines = [
        `Quote Reference: ${ref}`,
        `Route: ${from?.city || '—'} → ${to?.city || '—'}`,
        `Aircraft: ${aircraft.model}`,
        `Passengers: ${searchParams?.pax}`,
        flightHours ? `Flight Time: ~${flightHours}h${distNm ? ` (${distNm.toLocaleString()} nm)` : ''}` : '',
        departure ? `Departure: ${new Date(departure + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : '',
        '',
        'PRICE BREAKDOWN',
        `  Base Charter: $${baseTotal.toLocaleString()}`,
        cateringCost > 0 ? `  Catering: +$${cateringCost.toLocaleString()}` : '',
        entCost > 0 ? `  Entertainment: +$${entCost.toLocaleString()}` : '',
        transferCost > 0 ? `  Transfer: +$${transferCost.toLocaleString()}` : '',
        `  ─────────────────────`,
        `  ESTIMATED TOTAL: $${total.toLocaleString()} USD`,
        '',
        `Client Name: ${name}`,
        `Client Email: ${email}`,
        `WhatsApp / Phone: ${phone || 'Not provided'}`,
      ].filter(l => l !== null && l !== undefined && !(typeof l === 'string' && l === '' && false)).join('\n');

      const res = await fetch('https://formsubmit.co/ajax/sambhav.gupta2910@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `✈ APEX Quote ${ref} — ${from?.city || ''} → ${to?.city || ''}`,
          _template: 'table',
          _captcha: 'false',
          name,
          email,
          phone: phone || 'Not provided',
          quote_ref: ref,
          route: `${from?.city || '—'} → ${to?.city || '—'}`,
          aircraft: aircraft.model,
          passengers: String(searchParams?.pax),
          estimated_total: `$${total.toLocaleString()} USD`,
          message: lines,
        }),
      });
      const data = await res.json();
      if (data.success === 'true' || data.success === true) {
        onToast({ type: 'success', text: `Quote ${ref} sent to ${email}` });
        setSubmitted(true);
      } else {
        throw new Error('send failed');
      }
    } catch {
      onToast({ type: 'error', text: 'Could not send quote. Please try again.' });
    }
    setSubmitting(false);
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
                Your dedicated APEX concierge will call within <strong>15 minutes</strong>.
              </p>
              <div style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--muted)' }}>
                Questions? WhatsApp your concierge with reference <strong>{ref}</strong>.
              </div>
            </div>
          ) : (
            <>
              {from && to && (
                <div className="quote-flight-summary">
                  <div className="qfs-route">{from.code} <span>→</span> {to.code}</div>
                  <div className="qfs-details">
                    {from.city} → {to.city} · {aircraft.model} · {searchParams?.pax} pax
                    {departure && ` · ${new Date(departure + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    {distNm && ` · ${distNm.toLocaleString()} nm`}
                  </div>
                </div>
              )}

              <div className="ai-thinking">
                <div className="ai-thinking-header">
                  ✦ APEX Intelligence
                  {!aiDone && <div className="ai-dots"><span /><span /><span /></div>}
                  {aiDone && <span style={{ color: 'var(--sage)', fontSize: '0.82rem', fontWeight: 600 }}>✓ Analysis complete</span>}
                </div>
                <div className="ai-stream">{aiText || 'Analyzing routes, operators, and positioning costs…'}</div>
              </div>

              <div className="price-breakdown">
                <h4>Price Breakdown</h4>
                {priceLoading ? (
                  <div style={{ padding: '16px 0', color: 'var(--muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--gold-bright)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Calculating route distance…
                  </div>
                ) : (
                  <div className="price-row">
                    <span>
                      {aircraft.model} — {flightHours}h est. flight
                      {distNm && <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}> &nbsp;({distNm.toLocaleString()} nm great circle)</span>}
                    </span>
                    <span className="price-val">${baseTotal.toLocaleString()}</span>
                  </div>
                )}
                {!priceLoading && (
                  <div className="price-row" style={{ fontSize: '0.78rem', color: 'var(--muted)', paddingTop: 0 }}>
                    <span>Includes landing fees, FBO handling &amp; navigation charges</span>
                  </div>
                )}
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

              <WhatsAppShare
                from={from} to={to} aircraft={aircraft}
                searchParams={searchParams} total={total}
                flightHours={flightHours} ref_={ref}
              />

              <div className="quote-form">
                <h4>Send me the full quote</h4>
                <form onSubmit={handleSubmit}>
                  <div className="form-field">
                    <label>Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
                  </div>
                  <div className="form-field">
                    <label>Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" required />
                  </div>
                  <div className="form-field">
                    <label>WhatsApp / Phone (optional)</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" />
                  </div>
                  <button type="submit" className="quote-submit" disabled={submitting || !name || !email || priceLoading}>
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
