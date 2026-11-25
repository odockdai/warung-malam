// The screenshot scenes behind ?shot=cover|rush|plate|end. Each runs the real simulation
// forward — the autopilot genuinely takes orders, fires the wok, plates and serves — so
// every frame is a true moment of the game, and the same seed always paints the same night.
//
// The timings below were chosen by scanning the simulation at fine granularity for the
// richest honest frame of each kind: the cover catches three fires lit with a full queue
// and a dish done and waiting; rush is peak chaos late in the night; plate is the moment a
// dish is mid-assembly at the plating counter; end is the tally. Because the seed is fixed
// and the sim deterministic, these frames are exactly reproducible.

import { STEP } from './config.js';
import { advance } from './world.js';
import { autopilotStep } from './autopilot.js';

function playForward(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    autopilotStep(world);
    advance(world);
  }
}

export function stageShot(world, which) {
  if (which === 'cover') playForward(world, 149.8);
  else if (which === 'rush') playForward(world, 149.8);
  else if (which === 'plate') playForward(world, 148.2);
  else if (which === 'end') playForward(world, 245);
  return world;
}
