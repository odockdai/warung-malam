// The autopilot: a fair stand-in for a decent human player. It watches the same state a
// player sees — patience bars, fires burning down, plates waiting — and issues the same
// commands (move, act). A player pressing keys overrides it for a few seconds.
//
// Priority, most urgent first:
//   1. serve a plate in hand to its customer
//   2. rescue food at the edge of burning
//   3. grab a finished plate from the counter and serve it
//   4. move a done dish to plating
//   5. drop a hot dish on the plating counter
//   6. dump burnt pans
//   7. start the oldest un-started order at a free station
// It walks to the station it means to use and only acts once it stands there, so the
// motion you see in the screenshots is a real service being run.

import { LAYOUT } from './config.js';
import { DISHES } from './recipes.js';
import { commandAction, commandMove, inProduction, nextDishForStation, waitingFor } from './world.js';

function stationCenter(key) {
  const cfg = LAYOUT.stations[key];
  return cfg.x + cfg.w / 2;
}

/** how close a burning item is to being lost, worst first */
function burningRisk(world) {
  const risks = [];
  for (const key of Object.keys(world.stations)) {
    const item = world.stations[key].item;
    if (item && item.done && !item.burned) risks.push({ key, item, burn: item.burn });
  }
  return risks.sort((a, b) => b.burn - a.burn);
}

export function autopilotStep(world) {
  const cook = world.cook;
  if (cook.busy > 0) return;

  // already moving somewhere with intent? keep walking unless something on fire intervenes
  const urgent = burningRisk(world)[0];

  // 1. serving with a plate in hand is always the job
  if (cook.carrying && cook.carrying.kind === 'plate') {
    const queue = waitingFor(world, cook.carrying.dishKey);
    if (queue.length) {
      commandMove(world, 640); // the counter's middle reaches every slot
      if (Math.abs(cook.x - 640) < 60) commandAction(world);
      return;
    }
    // no one left wants it — hold it; demand may arrive. meanwhile help the kitchen.
  }

  // 2. rescue: food about to burn, if hands are free
  if (!cook.carrying && urgent && urgent.burn > 0.25) {
    commandMove(world, stationCenter(urgent.key));
    if (Math.abs(cook.x - stationCenter(urgent.key)) < 80) commandAction(world);
    return;
  }

  // 3. a finished plate waits on the counter — grab it
  if (!cook.carrying && world.plated.length && !world.plating) {
    commandMove(world, stationCenter('plate'));
    if (Math.abs(cook.x - stationCenter('plate')) < 80) commandAction(world);
    return;
  }

  // 4. carrying something hot: get it to the plating counter
  if (cook.carrying && cook.carrying.kind === 'hot') {
    if (world.plating || world.plated.length >= 2) {
      // plating is backed up — wait near the counter rather than block it
      commandMove(world, stationCenter('plate'));
      if (Math.abs(cook.x - stationCenter('plate')) < 70 && !world.plating) commandAction(world);
      return;
    }
    commandMove(world, stationCenter('plate'));
    if (Math.abs(cook.x - stationCenter('plate')) < 80) commandAction(world);
    return;
  }

  // 5. pick up any done dish waiting at its station
  if (!cook.carrying) {
    for (const key of ['wok', 'grill', 'batter']) {
      const item = world.stations[key].item;
      if (item && item.done && !item.burned) {
        commandMove(world, stationCenter(key));
        if (Math.abs(cook.x - stationCenter(key)) < 80) commandAction(world);
        return;
      }
    }
  }

  // 6. dump burnt pans so the station can work again
  if (!cook.carrying) {
    for (const key of Object.keys(world.stations)) {
      const item = world.stations[key].item;
      if (item && item.burned) {
        commandMove(world, stationCenter(key));
        if (Math.abs(cook.x - stationCenter(key)) < 80) commandAction(world);
        return;
      }
    }
  }

  // 7. keep every fire lit: while hands are free and a station sits empty with unfilled
  // demand, start it — even if other stations are already cooking. Cooking in parallel is
  // the only way to keep up with the rush, and it's what a decent player does. Prefer the
  // station whose longest-waiting customer is closest to walking out.
  if (!cook.carrying) {
    const waiting = world.customers
      .filter(c => !c.left && !c.served)
      .sort((a, b) => (a.patienceLeft / a.patienceMax) - (b.patienceLeft / b.patienceMax)); // most impatient first
    let bestKey = null;
    for (const c of waiting) {
      const stKey = DISHES[c.dishKey].station;
      const st = world.stations[stKey];
      if (st && !st.item && inProduction(world, c.dishKey) < waitingFor(world, c.dishKey).length) {
        bestKey = stKey;
        break;
      }
    }
    if (bestKey && nextDishForStation(world, bestKey)) {
      commandMove(world, stationCenter(bestKey));
      if (Math.abs(cook.x - stationCenter(bestKey)) < 80) commandAction(world);
      return;
    }
    // nothing needs starting: hover center, ready to react
    commandMove(world, 640);
    return;
  }
}
