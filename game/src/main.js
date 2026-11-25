// Boot and the one loop. The player steers the cook; the autopilot is a demo driver that
// covers idle hands — real input suspends it. ?seed fixes the night; ?shot=cover|rush|
// plate|end stages a reproducible frame for the screenshots; window.__shotReady signals it.

import { BEST_KEY, LAYOUT, STEP, VIEW } from './config.js';
import { createRandom } from './random.js';
import { advance, commandAction, commandAxis, commandMove, createWorld } from './world.js';
import { autopilotStep } from './autopilot.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_END, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 24;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { window.localStorage.setItem(BEST_KEY, String(v)); } catch { /* private windows */ }
}

if (shot) {
  // screenshot mode: the autopilot runs a real service forward, we paint the frame it reaches
  const world = createWorld(createRandom(seed));
  stageShot(world, shot);
  const screen = shot === 'end' ? SCREEN_END : SCREEN_PLAY;
  renderer.frame(world, screen);
  requestAnimationFrame(() => {
    renderer.frame(world, screen);
    requestAnimationFrame(() => {
      renderer.frame(world, screen);
      window.__shotReady = true;
      document.title = 'shot-ready';
    });
  });
} else {
  let world = createWorld(createRandom(seed));
  const input = createInput(canvas);
  const audio = createAudio();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let paused = false;
  let manualUntil = 0;   // real input suspends the autopilot until this clock time
  let last = performance.now();
  let acc = 0;

  function restart() {
    world = createWorld(createRandom(Math.floor(Math.random() * 4294967296)));
    screen = SCREEN_PLAY;
    paused = false;
  }

  function clickToWorldX(frac) {
    // canvas fraction -> logical x
    return frac * VIEW.width;
  }

  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += dt;

    const press = input.take();
    const humanActed = press.act || press.axis !== 0 || press.clicked;

    if (screen === SCREEN_TITLE) {
      if (press.confirm) { audio.unlock(); screen = SCREEN_PLAY; status.textContent = 'The stall is open. Walk with A and D, act with Space.'; }
    } else if (screen === SCREEN_PLAY) {
      if (press.pause) paused = !paused;
      if (!paused) {
        if (humanActed) manualUntil = world.time + 6;

        // direct movement
        if (press.axis !== 0) commandAxis(world, press.axis);
        else if (world.cook.moveAxis !== 0) commandAxis(world, 0);

        // clicks: near a station walks there; a second click once close acts.
        // with a plate in hand, a click anywhere along the counter serves.
        if (press.clicked && press.clickX != null) {
          const wx = clickToWorldX(press.clickX);
          commandMove(world, wx);
          const nearStation = Object.keys(LAYOUT.stations).some(key => {
            const cfg = LAYOUT.stations[key];
            return Math.abs(wx - (cfg.x + cfg.w / 2)) < cfg.w / 2 + 20;
          });
          if (!nearStation && world.cook.carrying?.kind === 'plate') commandAction(world);
          if (Math.abs(world.cook.x - wx) < 85) commandAction(world);
        }
        if (press.act) commandAction(world);

        while (acc >= STEP) {
          // held-key walking, continuous
          const held = input.heldAxis();
          if (held !== 0) commandAxis(world, held);
          if (world.time >= manualUntil) autopilotStep(world);
          advance(world);
          acc -= STEP;
        }
        // sound answers what just happened in the world
        for (const e of world.events) {
          if (e._heard) continue;
          e._heard = true;
          if (e.type === 'ding') audio.ding();
          else if (e.type === 'served') audio.serve();
          else if (e.type === 'burned') audio.burn();
          else if (e.type === 'walkout') audio.walkout();
          else if (e.type === 'pickup') audio.pickup();
          else if (e.type === 'start-cook') audio.startCook();
          else if (e.type === 'plated') audio.plate();
          else if (e.type === 'night-end') audio.nightEnd();
        }
        audio.update(world);
      }
      if (world.nightOver) {
        screen = SCREEN_END;
        if (world.coins > best) { best = world.coins; saveBest(best); }
        status.textContent = `Night over. ${world.servedCount} orders served, Rp ${world.coins} earned.`;
      }
    } else if (screen === SCREEN_END) {
      if (press.confirm) restart();
    }

    renderer.frame(world, paused && screen === SCREEN_PLAY ? SCREEN_PAUSE : screen);
    requestAnimationFrame(frame);
  }
  status.textContent = 'Warung Malam. Press enter to open the stall.';
  requestAnimationFrame(frame);
}
