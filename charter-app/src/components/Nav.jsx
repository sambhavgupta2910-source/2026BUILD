import { useState, useEffect } from 'react';

export default function Nav({ onRequestCharter }) {
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
    onRequestCharter?.();
  }

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <div className="nav-brand">
            <div>
              <div className="nav-logo">APEX<span>.</span></div>
              <div className="nav-tagline">Private Charters</div>
            </div>
          </div>

          <ul className="nav-links">
            <li><a href="#search">Search Flights</a></li>
            <li><a href="#empty-legs">Empty Legs</a></li>
            <li><a href="#fleet">Fleet</a></li>
            <li><a href="#experience">Experience</a></li>
            <li><a href="#pets">Pets</a></li>
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
            <div className="nav-logo" style={{ marginBottom: 8 }}>APEX<span>.</span></div>
            <div className="nav-tagline" style={{ marginBottom: 32, color: 'var(--muted)' }}>Private Charters</div>
            <nav>
              <a href="#search" onClick={close}>Search Flights</a>
              <a href="#empty-legs" onClick={close}>Empty Legs</a>
              <a href="#fleet" onClick={close}>Fleet</a>
              <a href="#experience" onClick={close}>Experience</a>
              <a href="#pets" onClick={close}>Pets</a>
            </nav>
            <button className="mm-cta" onClick={handleCharter}>✦ Request Charter</button>
          </div>
        </div>
      )}
    </>
  );
}
