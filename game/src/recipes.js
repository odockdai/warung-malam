// The menu of Warung Malam: every dish the stall can serve, what station cooks it,
// and how it is built. The depth is in the sharing: nasi goreng and kwetiau both need the
// one wok, the two satays both need the one grill — so a rush of mixed orders is a fight
// over a single fire, and which ticket you light first is the decision the game is about.
// Dishes that needRice also lean on the rice pot, a second resource to keep an eye on.
//
// Each dish: the station that heats it, the garnish that finishes it, the price it earns,
// and the words a customer uses to order it. Every plate runs prep -> heat -> plate -> serve,
// and heat is a window, not a state — done becomes burned if you don't come back.

export const STATIONS = ['rice', 'wok', 'grill', 'batter', 'plate'];

export const DISHES = {
  nasiGoreng: {
    name: 'Nasi Goreng',
    short: 'NASI',
    station: 'wok',
    needsRice: true,
    garnish: 'egg',
    price: 120,
    heatKey: 'wokTime',
    desc: 'fried rice, egg on top',
    color: '#c98d4b',
    orders: ['one nasi goreng, extra spicy', 'nasi goreng for me', 'the fried rice, please'],
  },
  kwetiau: {
    name: 'Kwetiau Goreng',
    short: 'KWETIAU',
    station: 'wok',
    needsRice: false,
    garnish: 'leaf',
    price: 130,
    heatKey: 'wokTime',
    desc: 'fried flat noodles, greens',
    color: '#e8c96a',
    orders: ['kwetiau, make it smoky', 'flat noodles, please', 'kwetiau goreng'],
  },
  satay: {
    name: 'Sate Ayam',
    short: 'SATE',
    station: 'grill',
    needsRice: false,
    garnish: 'chili',
    price: 150,
    heatKey: 'grillTime',
    desc: 'chicken skewers, peanut',
    color: '#a5502c',
    orders: ['five sticks of satay', 'sate ayam, extra peanut', 'skewers, char them well'],
  },
  satayPadang: {
    name: 'Sate Padang',
    short: 'PADANG',
    station: 'grill',
    needsRice: true,
    garnish: 'chili',
    price: 170,
    heatKey: 'grillTime',
    desc: 'spicy beef satay, rice cake',
    color: '#8a3a1c',
    orders: ['sate padang, the spicy one', 'beef satay with lontong'],
  },
  martabak: {
    name: 'Martabak Manis',
    short: 'MARTABAK',
    station: 'batter',
    needsRice: false,
    garnish: 'egg',
    price: 140,
    heatKey: 'batterTime',
    desc: 'sweet thick pancake',
    color: '#e0a34a',
    orders: ['one martabak, chocolate cheese', 'martabak manis, please', 'the sweet one'],
  },
  nasiUduk: {
    name: 'Nasi Uduk',
    short: 'UDUK',
    station: 'rice',
    needsRice: true,
    garnish: 'leaf',
    price: 110,
    heatKey: 'wokTime',
    desc: 'coconut rice, fried shallot',
    color: '#f2ead2',
    orders: ['nasi uduk, warm', 'coconut rice for me'],
  },
};

// The garnish tokens: little finishing touches that change what a dish needs at plating.
export const GARNISH = {
  egg:   { name: 'fried egg', color: '#ffd469' },
  leaf:  { name: 'greens',    color: '#4a7a3a' },
  chili: { name: 'sambal',    color: '#d43a2a' },
};

// All dish keys in the order they unlock through the night — the stall starts simple
// and the menu widens as the rush builds, so pressure grows without adding chores.
export const UNLOCK_ORDER = ['nasiGoreng', 'satay', 'kwetiau', 'martabak', 'nasiUduk', 'satayPadang'];

/** Dishes available at a given point in the night, 0..1 of the way through. */
export function dishesAt(progress) {
  const count = Math.min(UNLOCK_ORDER.length, 2 + Math.floor(progress * (UNLOCK_ORDER.length - 1)));
  return UNLOCK_ORDER.slice(0, Math.max(2, count));
}

/** The step list a dish needs, as route legs through the kitchen. */
export function recipeSteps(dishKey) {
  const dish = DISHES[dishKey];
  const steps = [];
  steps.push({ kind: 'prep', station: dish.station, label: dish.needsRice ? 'rice + prep' : 'prep' });
  steps.push({ kind: 'heat', station: dish.station, label: dish.station === 'grill' ? 'grill' : dish.station === 'batter' ? 'pan' : 'fry' });
  steps.push({ kind: 'garnish', station: 'plate', label: 'plate + ' + (GARNISH[dish.garnish]?.name || 'garnish') });
  return steps;
}
