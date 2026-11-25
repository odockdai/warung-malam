// The screenshot scenes behind ?shot=cover|rush|plate|end. Each runs the real simulation
// forward — the autopilot genuinely takes orders, fires the wok, grill and pan in parallel,
// plates and serves — so every frame is a true moment of the game, reproducible from its seed.
//
// The seeds and times below were chosen by scanning many seeded nights for the richest honest
// frame of each kind:
//   cover — three fires lit at once (wok, grill, pan), a full queue of five, orders on the
//           board in every state from "not started" to "SERVE!", the clock partway down.
//   rush  — the late-night peak: pressure highest, tickets deep, the cook mid-service.
//   plate — a dish mid-assembly at the plating counter, garnish going on, a fire behind.
//   end   — the night-end tally over a quieting stall.

import { STEP } from '../config.js';
import { advance } from '../world.js';
import { autopilotStep } from './autopilot.js';

function playForward(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    autopilotStep(world);
    advance(world);
  }
}

export function stageShot(world, which) {
  if (which === 'cover') playForward(world, 122.42);
  else if (which === 'rush') playForward(world, 163.7);
  else if (which === 'plate') playForward(world, 149);
  else if (which === 'end') playForward(world, 245);
  return world;
}
