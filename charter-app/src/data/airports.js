export const airports = [
  { code: 'DXB', city: 'Dubai', country: 'UAE', name: 'Dubai International' },
  { code: 'AUH', city: 'Abu Dhabi', country: 'UAE', name: 'Zayed International' },
  { code: 'LHR', city: 'London', country: 'UK', name: 'Heathrow' },
  { code: 'LCY', city: 'London', country: 'UK', name: 'City Airport' },
  { code: 'FBO', city: 'London', country: 'UK', name: 'Farnborough' },
  { code: 'JFK', city: 'New York', country: 'USA', name: 'John F. Kennedy' },
  { code: 'TEB', city: 'New York', country: 'USA', name: 'Teterboro (Private)' },
  { code: 'CDG', city: 'Paris', country: 'France', name: 'Charles de Gaulle' },
  { code: 'LBG', city: 'Paris', country: 'France', name: 'Le Bourget (Private)' },
  { code: 'SIN', city: 'Singapore', country: 'Singapore', name: 'Changi' },
  { code: 'HKG', city: 'Hong Kong', country: 'HK', name: 'International' },
  { code: 'NRT', city: 'Tokyo', country: 'Japan', name: 'Narita' },
  { code: 'LAX', city: 'Los Angeles', country: 'USA', name: 'International' },
  { code: 'VAN', city: 'Los Angeles', country: 'USA', name: 'Van Nuys (Private)' },
  { code: 'MIA', city: 'Miami', country: 'USA', name: 'International' },
  { code: 'OPF', city: 'Miami', country: 'USA', name: 'Opa-locka Exec (Private)' },
  { code: 'GVA', city: 'Geneva', country: 'Switzerland', name: 'International' },
  { code: 'ZRH', city: 'Zurich', country: 'Switzerland', name: 'International' },
  { code: 'FCO', city: 'Rome', country: 'Italy', name: 'Fiumicino' },
  { code: 'MXP', city: 'Milan', country: 'Italy', name: 'Malpensa' },
  { code: 'MCO', city: 'Nice', country: 'France', name: 'Côte d\'Azur' },
  { code: 'SYD', city: 'Sydney', country: 'Australia', name: 'Kingsford Smith' },
  { code: 'MEL', city: 'Melbourne', country: 'Australia', name: 'Essendon (Private)' },
  { code: 'BOM', city: 'Mumbai', country: 'India', name: 'Chhatrapati Shivaji' },
  { code: 'DEL', city: 'Delhi', country: 'India', name: 'Indira Gandhi' },
  { code: 'DOH', city: 'Doha', country: 'Qatar', name: 'Hamad International' },
  { code: 'RUH', city: 'Riyadh', country: 'Saudi Arabia', name: 'King Khalid' },
  { code: 'CPT', city: 'Cape Town', country: 'South Africa', name: 'International' },
  { code: 'NBO', city: 'Nairobi', country: 'Kenya', name: 'Jomo Kenyatta' },
  { code: 'BCN', city: 'Barcelona', country: 'Spain', name: 'El Prat' },
  { code: 'MAD', city: 'Madrid', country: 'Spain', name: 'Adolfo Suárez' },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', name: 'Schiphol' },
  { code: 'FRA', city: 'Frankfurt', country: 'Germany', name: 'International' },
  { code: 'VIE', city: 'Vienna', country: 'Austria', name: 'International' },
  { code: 'ATH', city: 'Athens', country: 'Greece', name: 'Eleftherios Venizelos' },
  { code: 'IST', city: 'Istanbul', country: 'Turkey', name: 'Istanbul Airport' },
  { code: 'BKK', city: 'Bangkok', country: 'Thailand', name: 'Suvarnabhumi' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', name: 'International' },
  { code: 'DPS', city: 'Bali', country: 'Indonesia', name: 'Ngurah Rai' },
  { code: 'MLE', city: 'Malé', country: 'Maldives', name: 'Velana International' },
  { code: 'SXM', city: 'St. Maarten', country: 'Caribbean', name: 'Princess Juliana' },
  { code: 'EYW', city: 'Key West', country: 'USA', name: 'International' },
  { code: 'ASP', city: 'Aspen', country: 'USA', name: 'Pitkin County' },
  { code: 'MHH', city: 'Marsh Harbour', country: 'Bahamas', name: 'International' },
  { code: 'NAS', city: 'Nassau', country: 'Bahamas', name: 'Lynden Pindling' },
  { code: 'VCE', city: 'Venice', country: 'Italy', name: 'Marco Polo' },
  { code: 'PMI', city: 'Mallorca', country: 'Spain', name: 'Son Sant Joan' },
  { code: 'MYK', city: 'Mykonos', country: 'Greece', name: 'National' },
  { code: 'JTR', city: 'Santorini', country: 'Greece', name: 'Thira' },
  { code: 'SFO', city: 'San Francisco', country: 'USA', name: 'International' },
];

export function searchAirports(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return airports.filter(a =>
    a.code.toLowerCase().includes(q) ||
    a.city.toLowerCase().includes(q) ||
    a.country.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q)
  ).slice(0, 6);
}
