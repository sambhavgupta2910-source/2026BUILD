import { emptyLegs } from '../data/emptyLegs.js';
import { useCountdown } from '../hooks/useCountdown.js';

function LegCard({ leg, onBook }) {
  const { display, isUrgent } = useCountdown(leg.departureMs);
  const taken = leg.seatsTaken;
  const avail = leg.seatsTotal - taken;
  const dots = Array.from({ length: leg.seatsTotal }, (_, i) => i < taken);

  return (
    <div className="leg-card" onClick={() => onBook(leg)}>
      <div className="leg-card-accent" />
      <div className="leg-card-body">
        <div className="leg-route">
          <div className="leg-airport">
            <div className="code">{leg.from.code}</div>
            <div className="city">{leg.from.city}</div>
          </div>
          <div className="leg-arrow">
            ✈
            <span>{leg.flightTime}</span>
          </div>
          <div className="leg-airport" style={{ textAlign: 'right' }}>
            <div className="code">{leg.to.code}</div>
            <div className="city">{leg.to.city}</div>
          </div>
        </div>

        <div className="leg-meta">
          <div>
            <div className="leg-aircraft">{leg.aircraft}</div>
          </div>
          <div className="leg-category">{leg.category}</div>
        </div>

        <div className="leg-footer">
          <div className="leg-countdown">
            <div className="countdown-label">Departs in</div>
            <div className={`countdown-time${isUrgent ? ' urgent' : ''}`}>{display}</div>
          </div>

          <div className="leg-seats">
            <div className="seats-dots">
              {dots.map((taken, i) => (
                <div key={i} className={`seat-dot${taken ? ' taken' : ''}`} />
              ))}
            </div>
            <div className="seats-label">{avail} seat{avail !== 1 ? 's' : ''} left</div>
          </div>

          <div className="leg-price">
            <div className="from">from</div>
            <div className="amount">
              ${leg.price.toLocaleString()}
            </div>
          </div>
        </div>

        <button className="leg-book-btn" onClick={e => { e.stopPropagation(); onBook(leg); }}>
          Book Empty Leg →
        </button>
      </div>
    </div>
  );
}

export default function EmptyLegsStrip({ onBook }) {
  return (
    <section className="empty-legs" id="empty-legs">
      <div className="empty-legs-header">
        <div>
          <div className="section-eyebrow">✈ Live Availability</div>
          <h2>Empty Legs — Fly for Less</h2>
          <p>Existing scheduled flights with open seats. Fly at a fraction of the charter cost.</p>
        </div>
        <button className="view-all-btn">View all 47 routes →</button>
      </div>

      <div className="legs-scroll" style={{ maxWidth: '100%', paddingLeft: 24, paddingRight: 24 }}>
        {emptyLegs.map(leg => (
          <LegCard key={leg.id} leg={leg} onBook={onBook} />
        ))}
      </div>
    </section>
  );
}
