// Chance and Community Chest decks for Monopoly. Each card:
//   { id, text, effect }
// Effect types (all handled in index.js):
//   { type:'move_to', pos, collectGo? }   - move to absolute pos (collect $200 if passing GO unless collectGo:false)
//   { type:'move_relative', spaces }       - move forward/back (negative = back), no GO on backward
//   { type:'collect', amount }             - bank pays player
//   { type:'pay', amount }                 - player pays bank
//   { type:'collect_from_each', amount }   - each other player pays this player
//   { type:'pay_each', amount }            - player pays each other player
//   { type:'go_to_jail' }                  - directly to jail, no GO money
//   { type:'get_out_of_jail_free' }        - player keeps card (jailCards++)
//   { type:'nearest_railroad', multiplier }- move to nearest railroad ahead, pay multiplier x rent if owned
//   { type:'nearest_utility' }             - move to nearest utility ahead, pay 10x dice if owned
//   { type:'repairs', perHouse, perHotel } - pay bank perHouse*houses + perHotel*hotels

export const CHANCE_CARDS = [
  { id: 'ch1', text: 'Advance to GO. Collect $200.', effect: { type: 'move_to', pos: 0 } },
  { id: 'ch2', text: 'Advance to Illinois Avenue. If you pass GO, collect $200.', effect: { type: 'move_to', pos: 24 } },
  { id: 'ch3', text: 'Advance to St. Charles Place. If you pass GO, collect $200.', effect: { type: 'move_to', pos: 11 } },
  { id: 'ch4', text: 'Advance to the nearest Utility. If owned, throw dice and pay owner ten times the amount thrown.', effect: { type: 'nearest_utility' } },
  { id: 'ch5', text: 'Advance to the nearest Railroad. Pay owner twice the rental to which they are otherwise entitled.', effect: { type: 'nearest_railroad', multiplier: 2 } },
  { id: 'ch6', text: 'Advance to the nearest Railroad. Pay owner twice the rental to which they are otherwise entitled.', effect: { type: 'nearest_railroad', multiplier: 2 } },
  { id: 'ch7', text: 'Bank pays you dividend of $50.', effect: { type: 'collect', amount: 50 } },
  { id: 'ch8', text: 'Get Out of Jail Free. This card may be kept until needed.', effect: { type: 'get_out_of_jail_free' } },
  { id: 'ch9', text: 'Go back three spaces.', effect: { type: 'move_relative', spaces: -3 } },
  { id: 'ch10', text: 'Go to Jail. Go directly to Jail. Do not pass GO, do not collect $200.', effect: { type: 'go_to_jail' } },
  { id: 'ch11', text: 'Make general repairs on all your property: pay $25 per house and $100 per hotel.', effect: { type: 'repairs', perHouse: 25, perHotel: 100 } },
  { id: 'ch12', text: 'Speeding fine. Pay $15.', effect: { type: 'pay', amount: 15 } },
  { id: 'ch13', text: 'Take a trip to Reading Railroad. If you pass GO, collect $200.', effect: { type: 'move_to', pos: 5 } },
  { id: 'ch14', text: 'Advance to Boardwalk.', effect: { type: 'move_to', pos: 39 } },
  { id: 'ch15', text: 'You have been elected Chairman of the Board. Pay each player $50.', effect: { type: 'pay_each', amount: 50 } },
  { id: 'ch16', text: 'Your building loan matures. Collect $150.', effect: { type: 'collect', amount: 150 } },
];

export const COMMUNITY_CHEST_CARDS = [
  { id: 'cc1', text: 'Advance to GO. Collect $200.', effect: { type: 'move_to', pos: 0 } },
  { id: 'cc2', text: 'Bank error in your favor. Collect $200.', effect: { type: 'collect', amount: 200 } },
  { id: 'cc3', text: "Doctor's fee. Pay $50.", effect: { type: 'pay', amount: 50 } },
  { id: 'cc4', text: 'From sale of stock you get $50.', effect: { type: 'collect', amount: 50 } },
  { id: 'cc5', text: 'Get Out of Jail Free. This card may be kept until needed.', effect: { type: 'get_out_of_jail_free' } },
  { id: 'cc6', text: 'Go to Jail. Go directly to Jail. Do not pass GO, do not collect $200.', effect: { type: 'go_to_jail' } },
  { id: 'cc7', text: 'Holiday fund matures. Receive $100.', effect: { type: 'collect', amount: 100 } },
  { id: 'cc8', text: 'Income tax refund. Collect $20.', effect: { type: 'collect', amount: 20 } },
  { id: 'cc9', text: 'It is your birthday. Collect $10 from every player.', effect: { type: 'collect_from_each', amount: 10 } },
  { id: 'cc10', text: 'Life insurance matures. Collect $100.', effect: { type: 'collect', amount: 100 } },
  { id: 'cc11', text: 'Hospital fees. Pay $100.', effect: { type: 'pay', amount: 100 } },
  { id: 'cc12', text: 'School fees. Pay $50.', effect: { type: 'pay', amount: 50 } },
  { id: 'cc13', text: 'Receive $25 consultancy fee.', effect: { type: 'collect', amount: 25 } },
  { id: 'cc14', text: 'You are assessed for street repairs: pay $40 per house and $115 per hotel.', effect: { type: 'repairs', perHouse: 40, perHotel: 115 } },
  { id: 'cc15', text: 'You have won second prize in a beauty contest. Collect $10.', effect: { type: 'collect', amount: 10 } },
  { id: 'cc16', text: 'You inherit $100.', effect: { type: 'collect', amount: 100 } },
];
