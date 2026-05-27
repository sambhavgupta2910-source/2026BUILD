import { useState } from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import EmptyLegsStrip from './components/EmptyLegsStrip.jsx';
import FlightResults from './components/FlightResults.jsx';
import Personalize from './components/Personalize.jsx';
import PetSection from './components/PetSection.jsx';
import ExperienceSection from './components/ExperienceSection.jsx';
import Testimonials from './components/Testimonials.jsx';
import QuotePanel from './components/QuotePanel.jsx';
import Toast from './components/Toast.jsx';
import FractionalPage from './pages/FractionalPage.jsx';
import JetCardPage from './pages/JetCardPage.jsx';
import MembershipPage from './pages/MembershipPage.jsx';

export default function App() {
  const [page, setPage] = useState('home');
  const [searchParams, setSearchParams] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [quoteData, setQuoteData] = useState(null);
  const [toasts, setToasts] = useState([]);

  function addToast(toast) {
    setToasts(ts => [...ts, { ...toast, id: Date.now() }]);
  }

  function navigateTo(p) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    addToast({ type: 'success', text: `${ac.model} selected — personalise your flight` });
    window.setTimeout(() => {
      document.getElementById('personalize')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function handleQuickQuote(ac) {
    addToast({ type: 'success', text: `Instant quote for ${ac.model}` });
    setQuoteData({
      aircraft: ac,
      searchParams,
      selections: { catering: 'standard', entertainment: 'standard', transfer: 'none', specialRequests: '' },
    });
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

  if (page === 'fractional') {
    return (
      <>
        <Nav onRequestCharter={() => { navigateTo('home'); }} onNavigate={navigateTo} activePage={page} />
        <FractionalPage onNavigateHome={() => navigateTo('home')} />
        <Toast toasts={toasts} />
      </>
    );
  }

  if (page === 'jetcard') {
    return (
      <>
        <Nav onRequestCharter={() => { navigateTo('home'); }} onNavigate={navigateTo} activePage={page} />
        <JetCardPage onNavigateHome={() => navigateTo('home')} />
        <Toast toasts={toasts} />
      </>
    );
  }

  if (page === 'membership') {
    return (
      <>
        <Nav onRequestCharter={() => { navigateTo('home'); }} onNavigate={navigateTo} activePage={page} />
        <MembershipPage onNavigateHome={() => navigateTo('home')} />
        <Toast toasts={toasts} />
      </>
    );
  }

  return (
    <div>
      <Nav
        onRequestCharter={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })}
        onNavigate={navigateTo}
        activePage={page}
      />

      <Hero onSearch={handleSearch} />

      <EmptyLegsStrip onBook={handleEmptyLegBook} />

      {searchParams && (
        <FlightResults
          searchParams={searchParams}
          loading={searchLoading}
          onSelect={handleAircraftSelect}
          onQuickQuote={handleQuickQuote}
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

      <Testimonials />

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="nav-logo">Elevate<span style={{ color: 'var(--gold-bright)' }}>.</span></div>
              <p style={{ marginTop: 12 }}>
                Private aviation redefined. Transparent pricing, AI-matched aircraft,
                and a concierge that never sleeps.
              </p>
              <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="license">AOC Licensed</span>
                <span className="license">IS-BAO Stage III</span>
                <span className="license">ARGUS Platinum</span>
              </div>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <ul>
                <li><a href="#search">Private Charter</a></li>
                <li><a href="#empty-legs">Empty Legs</a></li>
                <li><button className="footer-link-btn" onClick={() => navigateTo('jetcard')}>Jet Cards</button></li>
                <li><button className="footer-link-btn" onClick={() => navigateTo('fractional')}>Fractional Ownership</button></li>
                <li><button className="footer-link-btn" onClick={() => navigateTo('membership')}>Membership</button></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Experience</h4>
              <ul>
                <li>Dining &amp; Catering</li>
                <li>In-Flight Entertainment</li>
                <li>Ground Transfer</li>
                <li>Pet Travel</li>
                <li>Concierge</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li>About Elevate</li>
                <li>Safety Standards</li>
                <li>Operator Partners</li>
                <li>Press</li>
                <li>Careers</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
              © 2026 Elevate Ltd. All rights reserved. Private aviation, reinvented.
            </span>
            <div className="nav-logo" style={{ fontSize: '1rem' }}>
              Elevate<span style={{ color: 'var(--gold-bright)' }}>.</span>
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

      {/* Floating WhatsApp button */}
      <a
        href="https://wa.me/971545297292?text=Hi%2C%20I%27d%20like%20a%20private%20jet%20quote%20from%20Elevate"
        target="_blank"
        rel="noreferrer"
        style={{
          position: 'fixed', bottom: 90, right: 20, zIndex: 999,
          width: 56, height: 56, borderRadius: '50%',
          background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,211,102,0.5)', textDecoration: 'none',
          fontSize: '1.6rem', transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        aria-label="Chat on WhatsApp"
      >💬</a>

      <div className="mobile-cta-bar">
        <div className="mobile-cta-bar-inner">
          <div className="mobile-cta-bar-text">
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Elevate</span>
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
