const CRUISE_SPEEDS = { light: 440, midsize: 455, super: 470, heavy: 487, ultra: 510 };
const TRIP_FEES    = { light: 1800, midsize: 2400, super: 3200, heavy: 4500, ultra: 6000 };

function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const r = d => d * Math.PI / 180;
  const dLat = r(lat2 - lat1), dLon = r(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcFlightPrice(from, to, categoryClass, basePrice) {
  if (!from?.lat || !to?.lat) {
    const hrs = 3.5;
    return { flightHours: hrs, distNm: null, tripCost: Math.round((hrs * basePrice + 2400) / 100) * 100 };
  }
  const distNm = Math.round(haversineNm(from.lat, from.lon, to.lat, to.lon));
  const speed  = CRUISE_SPEEDS[categoryClass] || 460;
  const fees   = TRIP_FEES[categoryClass]    || 2400;
  const flightHours = Math.max(0.75, Math.round((distNm / speed) * 1.12 * 10) / 10);
  const tripCost = Math.round((flightHours * basePrice + fees) / 100) * 100;
  return { flightHours, distNm, tripCost };
}
