import { useState } from 'react';
import { aircraftFleet } from '../data/aircraft.js';
import AircraftSilhouette from './AircraftSilhouette.jsx';

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skel-img skeleton" />
      <div className="skel-body">
        <div className="skel-line skeleton" />
        <div className="skel-line short skeleton" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 56 }} className="skeleton" />)}
        </div>
        <div className="skel-line xshort skeleton" />
      </div>
    </div>
  );
}

export default function FlightResults({ searchParams, loading, onSelect, onQuickQuote }) {
  const [sort, setSort] = useState('recommended');
  const { from, to, pax = 4, aircraftPref = 'any' } = searchParams || {};

  const filtered = aircraftFleet.filter(a => {
    if (aircraftPref !== 'any' && a.categoryClass !== aircraftPref) return false;
    if (a.pax < pax) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price') return a.basePrice - b.basePrice;
    if (sort === 'range') return parseInt(b.range) - parseInt(a.range);
    if (sort === 'pax') return b.pax - a.pax;
    return (b.bestValue ? 1 : 0) - (a.bestValue ? 1 : 0);
  });

  return (
    <section className="results-section" id="fleet">
      <div className="container">
        <div className="results-header">
          <div className="results-summary">
            <div className="section-eyebrow">✦ Search Results</div>
            <h2>
              {from && to ? `${from.city} → ${to.city}` : 'Available Aircraft'}
            </h2>
            {from && (
              <p>
                {loading ? 'Aggregating quotes from 340+ operators…' :
                  `${sorted.length} aircraft matched · ${pax} passenger${pax > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          <div className="sort-bar">
            {[['recommended', 'Best Match'], ['price', 'Lowest Price'], ['range', 'Longest Range'], ['pax', 'Largest']].map(([val, label]) => (
              <button
                key={val}
                className={`sort-btn${sort === val ? ' active' : ''}`}
                onClick={() => setSort(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="ai-banner">
            <div className="ai-icon">✦</div>
            <div className="ai-text">
              <strong>APEX Intelligence is working</strong>
              <p>Aggregating live quotes from 340+ certified operators. Comparing routes, positioning costs & fuel.</p>
            </div>
            <div className="ai-pulse" />
          </div>
        )}

        <div className="aircraft-grid">
          {loading
            ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
            : sorted.map(ac => (
              <div key={ac.id} className="aircraft-card">
                <div className={`aircraft-visual ${ac.categoryClass}`} style={{ padding: 0 }}>
                  <AircraftSilhouette categoryClass={ac.categoryClass} />
                  <div className="aircraft-badge">{ac.category}</div>
                  {ac.bestValue && <div className="best-value-badge">★ Best Value</div>}
                </div>
                <div className="aircraft-body">
                  <div className="aircraft-name">{ac.name}</div>
                  <div className="aircraft-model">{ac.model}</div>
                  <div className="aircraft-specs">
                    <div className="spec-item">
                      <span className="spec-val">{ac.pax}</span>
                      <span className="spec-key">Passengers</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-val">{ac.range}</span>
                      <span className="spec-key">Range</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-val">{ac.speed}</span>
                      <span className="spec-key">Cruise</span>
                    </div>
                  </div>
                  <div className="aircraft-amenities">
                    {ac.amenities.map(a => (
                      <span key={a} className="amenity-tag">{a}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 16, fontStyle: 'italic' }}>
                    Best for: {ac.bestFor}
                  </div>
                  <div className="aircraft-footer">
                    <div className="aircraft-price">
                      <div className="from">from</div>
                      <div className="amount">${ac.basePrice.toLocaleString()}</div>
                      <div className="per">/ flight hour</div>
                    </div>
                    <div className="aircraft-actions">
                      {onQuickQuote && (
                        <button
                          className="quick-quote-btn"
                          onClick={() => onQuickQuote(ac)}
                          title="Skip personalisation and get an instant quote"
                        >
                          ⚡ Quick Quote
                        </button>
                      )}
                      <button className="select-btn" onClick={() => onSelect(ac)}>
                        Customise →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </section>
  );
}
