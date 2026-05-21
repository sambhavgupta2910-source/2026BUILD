import { useState, useEffect } from 'react';

export default function Nav({ onRequestCharter }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
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
            <a
              href="#search"
              className="nav-cta"
              onClick={e => { e.preventDefault(); onRequestCharter?.(); }}
            >
              Request Charter
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
