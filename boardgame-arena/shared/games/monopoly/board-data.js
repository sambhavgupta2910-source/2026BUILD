// Standard US Monopoly board, 40 spaces indexed by position 0-39.
// Each entry: { pos, name, type, group?, price?, rent?, houseCost?, mortgage? }
//   type: 'go' | 'property' | 'railroad' | 'utility' | 'community_chest' |
//         'chance' | 'tax' | 'jail' | 'free_parking' | 'go_to_jail'
//   Properties: rent = [base, 1house, 2houses, 3houses, 4houses, hotel]
//   Railroads: rent computed in index.js as 25 * 2^(ownedCount-1).
//   Utilities: rent computed in index.js as dice * (ownsBoth ? 10 : 4).
//   Tax: amount stored on the entry.

export const BOARD = [
  { pos: 0, name: 'GO', type: 'go' },
  { pos: 1, name: 'Mediterranean Avenue', type: 'property', group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30 },
  { pos: 2, name: 'Community Chest', type: 'community_chest' },
  { pos: 3, name: 'Baltic Avenue', type: 'property', group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30 },
  { pos: 4, name: 'Income Tax', type: 'tax', amount: 200 },
  { pos: 5, name: 'Reading Railroad', type: 'railroad', price: 200, mortgage: 100 },
  { pos: 6, name: 'Oriental Avenue', type: 'property', group: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  { pos: 7, name: 'Chance', type: 'chance' },
  { pos: 8, name: 'Vermont Avenue', type: 'property', group: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  { pos: 9, name: 'Connecticut Avenue', type: 'property', group: 'lightblue', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60 },
  { pos: 10, name: 'Jail / Just Visiting', type: 'jail' },
  { pos: 11, name: 'St. Charles Place', type: 'property', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  { pos: 12, name: 'Electric Company', type: 'utility', price: 150, mortgage: 75 },
  { pos: 13, name: 'States Avenue', type: 'property', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  { pos: 14, name: 'Virginia Avenue', type: 'property', group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80 },
  { pos: 15, name: 'Pennsylvania Railroad', type: 'railroad', price: 200, mortgage: 100 },
  { pos: 16, name: 'St. James Place', type: 'property', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  { pos: 17, name: 'Community Chest', type: 'community_chest' },
  { pos: 18, name: 'Tennessee Avenue', type: 'property', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  { pos: 19, name: 'New York Avenue', type: 'property', group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100 },
  { pos: 20, name: 'Free Parking', type: 'free_parking' },
  { pos: 21, name: 'Kentucky Avenue', type: 'property', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  { pos: 22, name: 'Chance', type: 'chance' },
  { pos: 23, name: 'Indiana Avenue', type: 'property', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  { pos: 24, name: 'Illinois Avenue', type: 'property', group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120 },
  { pos: 25, name: 'B. & O. Railroad', type: 'railroad', price: 200, mortgage: 100 },
  { pos: 26, name: 'Atlantic Avenue', type: 'property', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  { pos: 27, name: 'Ventnor Avenue', type: 'property', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  { pos: 28, name: 'Water Works', type: 'utility', price: 150, mortgage: 75 },
  { pos: 29, name: 'Marvin Gardens', type: 'property', group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140 },
  { pos: 30, name: 'Go To Jail', type: 'go_to_jail' },
  { pos: 31, name: 'Pacific Avenue', type: 'property', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  { pos: 32, name: 'North Carolina Avenue', type: 'property', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  { pos: 33, name: 'Community Chest', type: 'community_chest' },
  { pos: 34, name: 'Pennsylvania Avenue', type: 'property', group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160 },
  { pos: 35, name: 'Short Line', type: 'railroad', price: 200, mortgage: 100 },
  { pos: 36, name: 'Chance', type: 'chance' },
  { pos: 37, name: 'Park Place', type: 'property', group: 'darkblue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175 },
  { pos: 38, name: 'Luxury Tax', type: 'tax', amount: 100 },
  { pos: 39, name: 'Boardwalk', type: 'property', group: 'darkblue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200 },
];

// Color-group -> hex stripe color, used by the renderer.
export const GROUP_COLORS = {
  brown: '#8B4513',
  lightblue: '#AEE0F5',
  pink: '#D63E92',
  orange: '#F7941D',
  red: '#ED1B24',
  yellow: '#FEF200',
  green: '#1FB25A',
  darkblue: '#0072BB',
};
