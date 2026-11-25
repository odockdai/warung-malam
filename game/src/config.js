// The tuning constants of Warung Malam: sizes, timings and the palette of the night market.
// One place to change how the game feels; everything else reads from here.

// The logical resolution the whole game is drawn at. The canvas scales to fit the window
// but every coordinate in the game is in these units.
export const VIEW = { width: 1280, height: 720 };

// One simulation step, in seconds. The world advances in fixed steps so the same seed
// always plays the same game.
export const STEP = 1 / 60;

// The stall's layout, in logical pixels. The counter runs along the middle; the customer
// queue waits in front of it (upper half) and the cook works behind it (lower half).
export const LAYOUT = {
  counterY: 424,          // top edge of the serving counter
  queueSlots: [370, 500, 630, 760, 890], // x positions of up to 5 waiting customers
  queueY: 236,
  orderBoardX: 24,
  orderBoardY: 18,
  stations: {
    rice:   { x: 130, y: 545, w: 150, h: 130, label: 'rice pot' },
    wok:    { x: 335, y: 545, w: 175, h: 130, label: 'wok' },
    grill:  { x: 565, y: 545, w: 175, h: 130, label: 'satay grill' },
    batter: { x: 795, y: 545, w: 150, h: 130, label: 'martabak pan' },
    plate:  { x: 1000, y: 545, w: 175, h: 130, label: 'plating counter' },
  },
};

// The stall's night-market palette: deep dusk, hot lamp-light, charcoal smoke.
export const COLOR = {
  sky0: '#171126', sky1: '#241537', sky2: '#33204a',
  lampGlow: '#ffb84d', lampHot: '#ffd98a',
  ground: '#231a20', groundHi: '#33242c',
  wood: '#5a3a26', woodHi: '#7a5136', woodDark: '#3c2517',
  charcoal: '#1c1518', ember: '#ff5a26', emberHi: '#ffb14d',
  steam: 'rgba(238,232,220,0.55)',
  ink: '#f5ead6', inkDim: '#c9b795',
  ui: '#2a1e2e', uiEdge: '#4a3348',
  serve: '#7de08a', warn: '#ffb84d', angry: '#ff6a5e',
  riceWhite: '#f2ead2', riceFried: '#c98d4b', noodle: '#e8c96a',
  satay: '#a5502c', satayChar: '#5e2a16', martabak: '#e0a34a', martabakEdge: '#8a5220',
  leaf: '#4a7a3a', chili: '#d43a2a', egg: '#ffd469',
};

// How the night runs. A full service is NIGHT_SECONDS long; orders arrive faster and customers
// lose patience quicker as the rush builds.
export const NIGHT = {
  seconds: 240,
  firstOrderAt: 2,
  spawnStart: 4.2,     // seconds between orders at the start of the night
  spawnEnd: 2.2,       // and at peak rush — faster than one cook can plate, so choosing
                       // what to cook next is the game
  patienceStart: 50,   // seconds a customer waits, early
  patienceEnd: 30,     // late in the night
  maxQueue: 5,
};

// Cooking timings, in seconds, for each heating stage.
export const COOK = {
  wokTime: 7.5,        // frying nasi goreng / kwetiau in the wok
  grillTime: 8.5,      // satay skewers over charcoal
  batterTime: 9.0,     // martabak setting in the pan
  burnGrace: 6.5,      // extra seconds after done before the food burns
  plateTime: 3.2,      // plating a finished dish — laying the rice, the garnish, the egg.
                       // slow enough that plating is a real step you plan around, and a
                       // plate mid-assembly is a common sight across the counter
};

// Scoring.
export const SCORE = {
  served: 100,          // base for a served order
  tipPerfect: 40,       // extra when served while the customer is patient
  tipFast: 15,          // smaller tip for merely on-time
  burnPenalty: 25,      // a burnt dish thrown away
  walkoutPenalty: 30,    // a customer who leaves angry
};

export const BEST_KEY = 'warung-malam-best';
