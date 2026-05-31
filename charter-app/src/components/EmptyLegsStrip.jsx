import { emptyLegs } from '../data/emptyLegs.js';
import { useCountdown } from '../hooks/useCountdown.js';

import { useState, useEffect } from 'react';

function pad(n) { return String(n).padStart(2, '0'); }

function CountdownBlocks({ targetMs, isUrgent, isCritical }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, targetMs - now);
  const totalSecs = Math.floor(remaining / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;

  const units = days > 0
    ? [{ val: days, label: 'days' }, { val: hours, label: 'hrs' }, { val: mins, label: 'min' }]
    : [{ val: hours, label: 'hrs' }, { val: mins, label: 'min' }, { val: secs, label: 'sec' }];

  return (
    <div className={`cd-blocks${isUrgent ? ' cd-urgent' : ''}${isCritical ? ' cd-critical' : ''}`}>
      {units.map(({ val, label }, i) => (
        <div key={label} className="cd-unit">
          <div className="cd-value">{pad(val)}</div>
          <div className="cd-label">{label}</div>
          {i < units.length - 1 && <div className="cd-sep">:</div>}
        </div>
      ))}
    </div>
  );
}

function SeatBar({ total, taken }) {
  const avail = total - taken;
  const pct = Math.round((taken / total) * 100);
  const isLow = avail <= 2;
  const isMed = avail <= Math.ceil(total * 0.3) && !isLow;

  return (
    <div className="seat-bar-wrap">
      <div className="seat-bar-header">
        <span className={`seat-count${isLow ? ' seat-count-low' : isMed ? ' seat-count-med' : ''}`}>
          {isLow && avail === 1 ? '🔴 LAST SEAT' : isLow ? `🔴 ${avail} seats left` : isMed ? `🟡 ${avail} seats left` : `${avail} seats available`}
        </span>
        <span className="seat-of">{avail} of {total}</span>
      </div>
      <div className="seat-bar-track">
        <div
          className={`seat-bar-fill${isLow ? ' fill-low' : isMed ? ' fill-med' : ' fill-ok'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="seat-icons-row">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`seat-icon${i < taken ? ' si-taken' : ' si-free'}`}
            title={i < taken ? 'Taken' : 'Available'}
          />
        ))}
      </div>
    </div>
  );
}

function LegCard({ leg, onBook }) {
  const { isUrgent } = useCountdown(leg.departureMs);
  const remaining = Math.max(0, leg.departureMs - Date.now());
  const isCritical = remaining < 2 * 3600000;
  const avail = leg.seatsTotal - leg.seatsTaken;
  const isLastSeat = avail === 1;

  return (
    <div
      className={`leg-card${isCritical ? ' leg-card-critical' : ''}`}
      onClick={() => onBook(leg)}
    >
      <div className={`leg-card-accent${isCritical ? ' accent-critical' : isUrgent ? ' accent-urgent' : ''}`} />

      <div className="leg-card-body">
        {/* Route header */}
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

        {/* Aircraft row */}
        <div className="leg-meta">
          <div className="leg-aircraft">{leg.aircraft}</div>
          <div className="leg-category">{leg.category}</div>
        </div>

        {/* ── DEPARTURE COUNTDOWN ── */}
        <div className="leg-departs-wrap">
          <div className="leg-departs-label">
            {isCritical ? '⚡ BOARDING SOON — Departs in' : 'Departs in'}
          </div>
          <CountdownBlocks
            targetMs={leg.departureMs}
            isUrgent={isUrgent}
            isCritical={isCritical}
          />
        </div>

        {/* ── SEAT COUNTER ── */}
        <SeatBar total={leg.seatsTotal} taken={leg.seatsTaken} />

        {/* Price + CTA */}
        <div className="leg-footer-row">
          <div className="leg-price">
            <div className="from">from</div>
            <div className="amount">${leg.price.toLocaleString()}</div>
          </div>
          <button
            className={`leg-book-btn${isLastSeat ? ' btn-last-seat' : ''}`}
            onClick={e => { e.stopPropagation(); onBook(leg); }}
          >
            {isLastSeat ? '⚡ Claim Last Seat' : 'Book Empty Leg →'}
          </button>
        </div>
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
