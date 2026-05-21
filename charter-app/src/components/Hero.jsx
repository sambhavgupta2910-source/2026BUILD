import { useState, useRef, useEffect } from 'react';
import { searchAirports } from '../data/airports.js';

function AirportField({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value?.city ? `${value.code} — ${value.city}` : '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (value?.city) setQuery(`${value.code} — ${value.city}`);
  }, [value]);

  function handleInput(e) {
    const v = e.target.value;
    setQuery(v);
    if (v.length >= 1) {
      setSuggestions(searchAirports(v));
      setOpen(true);
    } else {
      setSuggestions([]);
      setOpen(false);
      onChange(null);
    }
  }

  function select(airport) {
    setQuery(`${airport.code} — ${airport.city}`);
    onChange(airport);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="search-field field-wrap" ref={ref}>
      <label>{label}</label>
      <input
        value={query}
        onChange={handleInput}
        onFocus={() => query.length >= 1 && setSuggestions(searchAirports(query)) && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map(a => (
            <div key={a.code} className="suggestion-item" onMouseDown={() => select(a)}>
              <span className="sug-code">{a.code}</span>
              <div className="sug-info">
                <div className="sug-city">{a.city}</div>
                <div className="sug-name">{a.name}</div>
              </div>
              <span className="sug-country">{a.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Hero({ onSearch }) {
  const [tripType, setTripType] = useState('return');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [departure, setDeparture] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pax, setPax] = useState(4);
  const [petAboard, setPetAboard] = useState(false);
  const [aircraftPref, setAircraftPref] = useState('any');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function swap() {
    setFrom(to);
    setTo(from);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!from || !to) { setError('Please select origin and destination airports.'); return; }
    if (!departure) { setError('Please choose a departure date.'); return; }
    if (tripType === 'return' && !returnDate) { setError('Please choose a return date.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, departure, returnDate, pax, petAboard, aircraftPref, tripType }),
      });
      const data = await res.json();
      onSearch({ from, to, departure, returnDate, pax, petAboard, aircraftPref, tripType, ...data });
    } catch {
      onSearch({ from, to, departure, returnDate, pax, petAboard, aircraftPref, tripType, results: null });
    } finally {
      setLoading(false);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <section className="hero" id="search">
      <div className="hero-content">
        <div className="hero-badge">
          ✦ AI-Powered Private Aviation
        </div>
        <h1 className="hero-title">
          Your World.<br />
          <em>Your Way.</em>
        </h1>
        <p className="hero-sub">
          Access 8,000+ aircraft worldwide. Instant AI-matched quotes. No broker markups.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <strong>8,400+</strong>
            <span>Aircraft available</span>
          </div>
          <div className="hero-stat">
            <strong>190+</strong>
            <span>Countries served</span>
          </div>
          <div className="hero-stat">
            <strong>~4 min</strong>
            <span>To your first quote</span>
          </div>
          <div className="hero-stat">
            <strong>0%</strong>
            <span>Hidden fees</span>
          </div>
        </div>

        <div className="search-card">
          <div className="search-tabs">
            {[['oneway', 'One-Way'], ['return', 'Return'], ['multistop', 'Multi-Stop']].map(([val, label]) => (
              <button
                key={val}
                className={`search-tab${tripType === val ? ' active' : ''}`}
                onClick={() => setTripType(val)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <form className="search-body" onSubmit={handleSubmit}>
            <div className="search-row">
              <AirportField
                label="From"
                value={from}
                onChange={setFrom}
                placeholder="City or airport (e.g. Dubai)"
              />
              <button type="button" className="swap-btn" onClick={swap} title="Swap airports">
                ⇄
              </button>
              <AirportField
                label="To"
                value={to}
                onChange={setTo}
                placeholder="City or airport (e.g. London)"
              />
            </div>

            <div className="search-dates">
              <div className="search-field">
                <label>Departure</label>
                <input
                  type="date"
                  value={departure}
                  onChange={e => setDeparture(e.target.value)}
                  min={todayStr}
                />
              </div>
              {tripType === 'return' && (
                <div className="search-field">
                  <label>Return</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    min={departure || todayStr}
                  />
                </div>
              )}
              <div className="search-field">
                <label>Aircraft Class</label>
                <select value={aircraftPref} onChange={e => setAircraftPref(e.target.value)}>
                  <option value="any">Any Class</option>
                  <option value="light">Light Jet (1-8 pax)</option>
                  <option value="midsize">Midsize (1-9 pax)</option>
                  <option value="super">Super Midsize (1-10 pax)</option>
                  <option value="heavy">Heavy Jet (1-13 pax)</option>
                  <option value="ultra">Ultra Long Range (1-14 pax)</option>
                </select>
              </div>
            </div>

            <div className="search-extras">
              <div className="extra-item">
                <span>Passengers</span>
                <div className="pax-control">
                  <button type="button" className="pax-btn" onClick={() => setPax(p => Math.max(1, p - 1))}>−</button>
                  <span className="pax-count">{pax}</span>
                  <button type="button" className="pax-btn" onClick={() => setPax(p => Math.min(20, p + 1))}>+</button>
                </div>
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
              <div className="toggle-wrap">
                <span>🐾 Pet aboard?</span>
                <button
                  type="button"
                  className={`toggle${petAboard ? ' on' : ''}`}
                  onClick={() => setPetAboard(p => !p)}
                  aria-label="Pet aboard toggle"
                />
                <strong style={{ fontSize: '0.875rem', color: 'var(--navy)' }}>
                  {petAboard ? 'Yes — pet amenities included' : 'No'}
                </strong>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'var(--rose-light)', border: '1px solid #E8C4C0',
                borderRadius: 10, padding: '10px 16px', marginBottom: 12,
                color: 'var(--rose)', fontWeight: 600, fontSize: '0.9rem'
              }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              className={`search-submit${loading ? ' loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span>Finding best aircraft…</span>
                  <div className="submit-progress" />
                </>
              ) : (
                <>✦ Find My Aircraft</>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
