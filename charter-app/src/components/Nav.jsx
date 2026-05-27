import { useState, useEffect } from 'react';

export default function Nav({ onRequestCharter, onNavigate, activePage = 'home' }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  function close() { setMenuOpen(false); }

  function handleCharter(e) {
    e.preventDefault();
    close();
    onNavigate?.('home');
    setTimeout(() => onRequestCharter?.(), 50);
  }

  function handleNav(pageName) {
    close();
    onNavigate?.(pageName);
  }

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <div className="nav-brand">
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => handleNav('home')}
              aria-label="Elevate home"
            >
              <div className="nav-logo">Elevate<span>.</span></div>
              <div className="nav-tagline">Private Charters</div>
            </button>
          </div>

          <ul className="nav-links">
            {activePage === 'home' ? (
              <>
                <li><a href="#search">Search Flights</a></li>
                <li><a href="#empty-legs">Empty Legs</a></li>
                <li><a href="#fleet">Fleet</a></li>
                <li><a href="#experience">Experience</a></li>
              </>
            ) : (
              <li>
                <button
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}
                  onClick={() => handleNav('home')}
                >
                  ← Charter Search
                </button>
              </li>
            )}
            <li>
              <button
                className={`nav-page-link${activePage === 'jetcard' ? ' active' : ''}`}
                onClick={() => handleNav('jetcard')}
              >
                Jet Cards
              </button>
            </li>
            <li>
              <button
                className={`nav-page-link${activePage === 'fractional' ? ' active' : ''}`}
                onClick={() => handleNav('fractional')}
              >
                Fractional
              </button>
            </li>
            <li>
              <button
                className={`nav-page-link${activePage === 'membership' ? ' active' : ''}`}
                onClick={() => handleNav('membership')}
              >
                Membership
              </button>
            </li>
            <li>
              <a href="#search" className="nav-cta" onClick={handleCharter}>
                Request Charter
              </a>
            </li>
          </ul>

          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            aria-label="Menu"
            onClick={() => setMenuOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu" onClick={close}>
          <div className="mobile-menu-inner" onClick={e => e.stopPropagation()}>
            <button className="mobile-menu-close" onClick={close}>✕</button>
            <div className="nav-logo" style={{ marginBottom: 8 }}>Elevate<span>.</span></div>
            <div className="nav-tagline" style={{ marginBottom: 32, color: 'var(--muted)' }}>Private Charters</div>
            <nav>
              <a href="#search" onClick={close}>Search Flights</a>
              <a href="#empty-legs" onClick={close}>Empty Legs</a>
              <a href="#fleet" onClick={close}>Fleet</a>
              <a href="#experience" onClick={close}>Experience</a>
              <button className="mm-link" onClick={() => handleNav('jetcard')}>Jet Cards</button>
              <button className="mm-link" onClick={() => handleNav('fractional')}>Fractional</button>
              <button className="mm-link" onClick={() => handleNav('membership')}>Membership</button>
            </nav>
            <button className="mm-cta" onClick={handleCharter}>✦ Request Charter</button>
          </div>
        </div>
      )}
    </>
  );
}
