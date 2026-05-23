import { useState } from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import EmptyLegsStrip from './components/EmptyLegsStrip.jsx';
import FlightResults from './components/FlightResults.jsx';
import Personalize from './components/Personalize.jsx';
import PetSection from './components/PetSection.jsx';
import ExperienceSection from './components/ExperienceSection.jsx';
import QuotePanel from './components/QuotePanel.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const [searchParams, setSearchParams] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [quoteData, setQuoteData] = useState(null);
  const [toasts, setToasts] = useState([]);

  function addToast(toast) {
    setToasts(ts => [...ts, { ...toast, id: Date.now() }]);
  }

  async function handleSearch(params) {
    setSearchParams(params);
    setSelectedAircraft(null);
    setSearchLoading(true);
    window.setTimeout(() => {
      setSearchLoading(false);
      document.getElementById('fleet')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1800);
    addToast({ type: 'info', text: `Searching ${params.from?.city || '?'} → ${params.to?.city || '?'} for ${params.pax} passengers…` });
  }

  function handleAircraftSelect(ac) {
    setSelectedAircraft(ac);
    addToast({ type: 'success', text: `${ac.model} selected` });
    window.setTimeout(() => {
      document.getElementById('personalize')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function handleEmptyLegBook(leg) {
    addToast({ type: 'info', text: `Opening quote for ${leg.from.city} → ${leg.to.city}…` });
    setQuoteData({
      aircraft: {
        model: leg.aircraft,
        category: leg.category,
        icon: '✈️',
        pax: leg.seatsTotal - leg.seatsTaken,
        range: '—',
        speed: '—',
        amenities: [],
        basePrice: leg.price,
      },
      searchParams: {
        from: leg.from,
        to: leg.to,
        departure: new Date(leg.departureMs).toISOString().split('T')[0],
        pax: leg.seatsTotal - leg.seatsTaken,
      },
      selections: { catering: 'standard', entertainment: 'standard', transfer: 'none' },
    });
  }

  function handleConfirmPersonalize(data) {
    setQuoteData(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div>
      <Nav onRequestCharter={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })} />

      <Hero onSearch={handleSearch} />

      <EmptyLegsStrip onBook={handleEmptyLegBook} />

      {searchParams && (
        <FlightResults
          searchParams={searchParams}
          loading={searchLoading}
          onSelect={handleAircraftSelect}
        />
      )}

      {selectedAircraft && (
        <Personalize
          aircraft={selectedAircraft}
          searchParams={searchParams}
          petAboard={searchParams?.petAboard}
          onConfirm={handleConfirmPersonalize}
        />
      )}

      <ExperienceSection />

      <PetSection />

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="nav-logo">APEX<span style={{ color: 'var(--gold-bright)' }}>.</span></div>
              <p style={{ marginTop: 12 }}>
                Private aviation redefined. Transparent pricing, AI-matched aircraft,
                and a concierge that never sleeps.
              </p>
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <span className="license">AOC Licensed</span>
                <span className="license">IS-BAO Stage III</span>
              </div>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <ul>
                <li>Private Charter</li>
                <li>Empty Legs</li>
                <li>Jet Cards</li>
                <li>Fractional Ownership</li>
                <li>Aircraft Management</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Experience</h4>
              <ul>
                <li>Dining & Catering</li>
                <li>In-Flight Entertainment</li>
                <li>Ground Transfer</li>
                <li>Pet Travel</li>
                <li>Concierge</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li>About APEX</li>
                <li>Safety Standards</li>
                <li>Operator Partners</li>
                <li>Press</li>
                <li>Careers</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
              © 2026 APEX Charters Ltd. All rights reserved. Private aviation, reinvented.
            </span>
            <div className="nav-logo" style={{ fontSize: '1rem' }}>
              APEX<span style={{ color: 'var(--gold-bright)' }}>.</span>
            </div>
          </div>
        </div>
      </footer>

      {quoteData && (
        <QuotePanel
          quoteData={quoteData}
          onClose={() => setQuoteData(null)}
          onToast={addToast}
        />
      )}

      <Toast toasts={toasts} />

      <div className="mobile-cta-bar">
        <div className="mobile-cta-bar-inner">
          <div className="mobile-cta-bar-text">
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>APEX Charters</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Available 24 / 7</span>
          </div>
          <button
            className="mobile-cta-bar-btn"
            onClick={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Book Flight ✦
          </button>
        </div>
      </div>
    </div>
  );
}
