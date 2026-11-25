// The simulation of Warung Malam: customers, orders, stations, the cook, and the clock.
// Pure state advanced in fixed steps — no drawing. The same seed plays the same night.
//
// How a night plays: customers arrive at the queue naming a dish; the player walks the
// cook (A/D, arrows, or click) and acts (Space / E / click) at each station:
//   - at the wok, grill or martabak pan: start the oldest waiting dish for that station,
//     pick it up when it is done, or dump it when it has burned;
//   - at the plating counter: set down a hot dish to plate it with its garnish, or pick
//     up a finished plate;
//   - anywhere along the counter with a plate in hand: serve the oldest customer who
//     ordered that dish.
// Food keeps heating once started — done is a window, not a state: leave it and it burns.
// The depth is the routing: which fires to start, what to pick up first, who is served next.

import { COOK, LAYOUT, NIGHT, SCORE } from './config.js';
import { DISHES, dishesAt } from './recipes.js';

export const EVENT_SERVED = 'served';
export const EVENT_WALKOUT = 'walkout';
export const EVENT_BURNED = 'burned';
export const EVENT_PLATED = 'plated';
export const EVENT_PICKUP = 'pickup';
export const EVENT_START = 'start-cook';
export const EVENT_DING = 'ding';
export const EVENT_DISCARD = 'discard';
export const EVENT_NIGHT_END = 'night-end';

export const MOOD_PATIENT = 'patient';
export const MOOD_WAITING = 'waiting';
export const MOOD_ANNOYED = 'annoyed';
export const MOOD_ANGRY = 'angry';

let nextId = 1;

function makeCustomer(rng, dishKey, slot, arrivesAt, patience) {
  const dish = DISHES[dishKey];
  return {
    id: nextId++,
    dishKey,
    slot,
    orderText: rng.pick(dish.orders),
    arrivesAt,
    patienceMax: patience,
    patienceLeft: patience,
    served: false,
    left: false,
    angry: false,
    x: 1400,
    bobPhase: rng.next() * Math.PI * 2,
    variant: rng.int(0, 4),
    payFlash: 0,
  };
}

export function createWorld(rng) {
  return {
    rng,
    time: 0,
    clockLeft: NIGHT.seconds,
    score: 0,
    coins: 0,
    servedCount: 0,
    lostCount: 0,
    burnedCount: 0,
    combo: 0,
    comboBest: 0,
    nextSpawnIn: NIGHT.firstOrderAt,
    customers: [],
    stations: makeStations(),
    plated: [],            // finished plates waiting on the plating counter, oldest first
    cook: {
      x: 640, y: 595,
      targetX: 640,
      speed: 460,
      facing: 1,
      carrying: null,      // { kind: 'hot' | 'plate', dishKey }
      busy: 0,
      action: null,        // 'prep' | 'carry' | 'serve' | 'plate' — the hands' current work
      stirPhase: 0,
      moveAxis: 0,         // -1/0/1 direct control from held keys
    },
    events: [],
    nightOver: false,
    spawnLog: [],
  };
}

function makeStations() {
  const stations = {};
  for (const key of Object.keys(LAYOUT.stations)) {
    stations[key] = { key, item: null }; // item: { dishKey, heat, done, burn, burned }
  }
  return stations;
}

function nightProgress(world) {
  return 1 - world.clockLeft / NIGHT.seconds;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function currentSpawnGap(world) {
  return lerp(NIGHT.spawnStart, NIGHT.spawnEnd, Math.min(1, nightProgress(world) * 1.25));
}
function currentPatience(world) {
  return lerp(NIGHT.patienceStart, NIGHT.patienceEnd, nightProgress(world));
}
function firstFreeSlot(world) {
  const used = new Set(world.customers.filter(c => !c.left && !c.served).map(c => c.slot));
  for (let i = 0; i < LAYOUT.queueSlots.length; i++) if (!used.has(i)) return i;
  return -1;
}

function spawnCustomer(world) {
  if (world.customers.filter(c => !c.left && !c.served).length >= NIGHT.maxQueue) return;
  const slot = firstFreeSlot(world);
  if (slot < 0) return;
  const menu = dishesAt(nightProgress(world));
  // bias toward the heating stations that are currently free, so the rush spreads across
  // the wok, grill and pan instead of piling onto one fire
  const freeBonus = (dishKey) => {
    const st = world.stations[DISHES[dishKey].station];
    return st && !st.item ? 2.2 : 1;
  };
  const weights = menu.map(d => freeBonus(d) * (d === menu[0] ? 1.25 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = world.rng.next() * total;
  let dishKey = menu[menu.length - 1];
  for (let i = 0; i < menu.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { dishKey = menu[i]; break; }
  }
  const patience = currentPatience(world) * world.rng.range(0.9, 1.12);
  world.customers.push(makeCustomer(world.rng, dishKey, slot, world.time, patience));
  world.spawnLog.push({ t: world.time, dishKey });
}

// ---------- demand / supply helpers ----------

/** waiting customers who ordered dishKey, oldest first */
export function waitingFor(world, dishKey) {
  return world.customers
    .filter(c => !c.left && !c.served && c.dishKey === dishKey)
    .sort((a, b) => a.arrivesAt - b.arrivesAt);
}

/** count of dishKey already in production: heating, plated, or in the cook's hands */
export function inProduction(world, dishKey) {
  let n = 0;
  for (const key of Object.keys(world.stations)) {
    const item = world.stations[key].item;
    if (item && item.dishKey === dishKey && !item.burned) n++;
  }
  n += world.plated.filter(p => p.dishKey === dishKey).length;
  if (world.cook.carrying && world.cook.carrying.dishKey === dishKey) n++;
  return n;
}

/** the oldest dish the stall should cook next at a heating station, or null */
export function nextDishForStation(world, stationKey) {
  const waiting = world.customers
    .filter(c => !c.left && !c.served)
    .sort((a, b) => a.arrivesAt - b.arrivesAt);
  for (const c of waiting) {
    const dish = DISHES[c.dishKey];
    if (dish.station !== stationKey) continue;
    const demand = waitingFor(world, c.dishKey).length;
    if (inProduction(world, c.dishKey) < demand) return c.dishKey;
  }
  return null;
}

// ---------- player commands ----------

/** steer the cook toward an x position (click / autopilot) */
export function commandMove(world, x) {
  world.cook.targetX = Math.max(80, Math.min(1200, x));
  world.cook.moveAxis = 0;
}

/** direct held-key steering, -1 left / 0 none / 1 right */
export function commandAxis(world, axis) {
  world.cook.moveAxis = axis;
  if (axis !== 0) world.cook.targetX = world.cook.x;
}

function nearestStationKey(world) {
  let best = null, bestDist = 1e9;
  for (const key of Object.keys(LAYOUT.stations)) {
    const cfg = LAYOUT.stations[key];
    const cx = cfg.x + cfg.w / 2;
    const d = Math.abs(world.cook.x - cx);
    if (d < bestDist) { bestDist = d; best = key; }
  }
  return bestDist <= 95 ? best : null;
}

/**
 * The one context-sensitive action. What it does depends on where the cook stands and
 * what is in their hands — the same verb the player's Space key and clicks issue.
 * Returns a short string describing what happened, or null when nothing applied.
 */
export function commandAction(world) {
  const cook = world.cook;
  if (cook.busy > 0 || world.nightOver) return null;

  // carrying a plate: serve it — anywhere behind the counter reaches across
  if (cook.carrying && cook.carrying.kind === 'plate') {
    const dishKey = cook.carrying.dishKey;
    const queue = waitingFor(world, dishKey);
    if (queue.length) {
      serveCustomer(world, queue[0]);
      cook.carrying = null;
      cook.busy = 0.35;
      cook.action = 'serve';
      return 'serve';
    }
    return null;
  }

  const key = nearestStationKey(world);
  if (!key) return null;
  const st = world.stations[key];

  if (key === 'plate') {
    if (cook.carrying && cook.carrying.kind === 'hot') {
      // set the hot dish down and plate it with its garnish
      world.plating = { dishKey: cook.carrying.dishKey, progress: 0 };
      cook.carrying = null;
      cook.busy = COOK.plateTime;
      cook.action = 'plate';
      return 'plate-start';
    }
    if (!cook.carrying && world.plated.length) {
      const plate = world.plated.shift();
      cook.carrying = { kind: 'plate', dishKey: plate.dishKey };
      cook.busy = 0.2;
      cook.action = 'carry';
      return 'plate-pickup';
    }
    return null;
  }

  // heating stations: rice pot is display/prep only for now — wok, grill, batter cook
  if (st.item) {
    if (st.item.burned) {
      // dump the burnt pan — a small penalty already paid when it burned
      st.item = null;
      cook.busy = 0.3;
      cook.action = 'prep';
      world.events.push({ type: EVENT_DISCARD, station: key, t: world.time });
      return 'discard';
    }
    if (st.item.done && !cook.carrying) {
      cook.carrying = { kind: 'hot', dishKey: st.item.dishKey };
      world.events.push({ type: EVENT_PICKUP, dishKey: st.item.dishKey, station: key, t: world.time });
      st.item = null;
      cook.busy = 0.2;
      cook.action = 'carry';
      return 'pickup';
    }
    return null;
  }

  // empty station and free hands: start the oldest waiting dish for this station
  if (!cook.carrying) {
    const dishKey = nextDishForStation(world, key);
    if (dishKey) {
      st.item = { dishKey, heat: 0, done: false, burn: 0, burned: false, stir: 1, sinceStir: 0 };
      cook.busy = 0.45;
      cook.action = 'prep';
      world.events.push({ type: EVENT_START, dishKey, station: key, t: world.time });
      return 'start';
    }
  }
  return null;
}

function serveCustomer(world, customer) {
  customer.served = true;
  customer.payFlash = 1;
  const ratio = customer.patienceLeft / customer.patienceMax;
  let tip = 0;
  if (ratio > 0.6) tip = SCORE.tipPerfect;
  else if (ratio > 0.25) tip = SCORE.tipFast;
  const dish = DISHES[customer.dishKey];
  const gain = dish.price + tip;
  world.coins += gain;
  world.score += SCORE.served + tip;
  world.combo += 1;
  world.comboBest = Math.max(world.comboBest, world.combo);
  world.servedCount += 1;
  world.events.push({ type: EVENT_SERVED, customer, gain, tip, t: world.time });
}

// ---------- the fixed step ----------

export function advance(world) {
  const dt = 1 / 60;
  world.time += dt;
  world.clockLeft = Math.max(0, world.clockLeft - dt);
  world.events = world.events.filter(e => world.time - e.t < 3);

  // spawning
  if (!world.nightOver) {
    world.nextSpawnIn -= dt;
    if (world.nextSpawnIn <= 0) {
      spawnCustomer(world);
      world.nextSpawnIn = currentSpawnGap(world) * world.rng.range(0.8, 1.2);
    }
  }

  // customers
  for (const c of world.customers) {
    if (c.left) continue;
    const targetX = LAYOUT.queueSlots[c.slot];
    c.x += (targetX - c.x) * Math.min(1, dt * 3.2);
    if (!c.served) {
      c.patienceLeft -= dt;
      if (c.patienceLeft <= 0) {
        c.left = true; c.angry = true;
        world.lostCount += 1;
        world.score = Math.max(0, world.score - SCORE.walkoutPenalty);
        world.combo = 0;
        world.events.push({ type: EVENT_WALKOUT, customer: c, t: world.time });
      }
    } else {
      c.payFlash = Math.max(0, c.payFlash - dt * 1.4);
      if (c.payFlash === 0) c.left = true;
    }
  }

  // stations heat their contents; done is a window, then it burns
  for (const key of Object.keys(world.stations)) {
    const st = world.stations[key];
    const item = st.item;
    if (!item) continue;
    if (!item.done) {
      const dish = DISHES[item.dishKey];
      item.heat += dt / COOK[dish.heatKey];
      if (item.heat >= 1) {
        item.done = true;
        world.events.push({ type: EVENT_DING, station: key, dishKey: item.dishKey, t: world.time });
      }
    } else if (!item.burned) {
      item.burn += dt / COOK.burnGrace;
      if (item.burn >= 1) {
        item.burned = true;
        world.burnedCount += 1;
        world.score = Math.max(0, world.score - SCORE.burnPenalty);
        world.combo = 0;
        world.events.push({ type: EVENT_BURNED, station: key, dishKey: item.dishKey, t: world.time });
      }
    }
  }

  // plating in progress
  if (world.plating) {
    world.plating.progress += dt / COOK.plateTime;
    if (world.plating.progress >= 1) {
      world.plated.push({ dishKey: world.plating.dishKey, at: world.time });
      world.events.push({ type: EVENT_PLATED, dishKey: world.plating.dishKey, t: world.time });
      world.plating = null;
    }
  }

  // the cook moves: held keys win, otherwise drift toward the click target
  const cook = world.cook;
  if (cook.moveAxis !== 0) {
    cook.x = Math.max(80, Math.min(1200, cook.x + cook.moveAxis * cook.speed * dt));
    cook.facing = cook.moveAxis;
    cook.targetX = cook.x;
  } else if (Math.abs(cook.targetX - cook.x) > 2) {
    const dir = Math.sign(cook.targetX - cook.x);
    cook.facing = dir;
    cook.x += dir * Math.min(Math.abs(cook.targetX - cook.x), cook.speed * dt);
  }
  if (cook.busy > 0) {
    cook.busy -= dt;
    cook.stirPhase += dt * 9;
  }

  if (!world.nightOver && world.clockLeft <= 0) {
    world.nightOver = true;
    world.events.push({ type: EVENT_NIGHT_END, t: world.time });
  }
}

export function moodOf(customer) {
  const r = customer.patienceLeft / customer.patienceMax;
  if (r > 0.6) return MOOD_PATIENT;
  if (r > 0.4) return MOOD_WAITING;
  if (r > 0.2) return MOOD_ANNOYED;
  return MOOD_ANGRY;
}
