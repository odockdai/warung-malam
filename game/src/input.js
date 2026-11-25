// Input: keyboard and mouse. The player steers the cook directly:
//   A/D or arrow keys  — walk (held)
//   Space or E         — act: start a fire, grab food, plate it, serve it
//   click a station    — walk there; click again when arrived (or double-click) to act
//   click a customer   — with a plate in hand, serve them
//   P                  — pause
//   Enter              — start / restart the night
// Manual input suspends the demo autopilot for a few seconds, so a human always wins.

export const STATION_KEYS = { Digit1: 'wok', Digit2: 'grill', Digit3: 'batter', Digit4: 'plate' };

export function createInput(canvas) {
  const state = {
    confirm: false,       // start / restart
    act: false,           // one-shot action press
    pause: false,
    axis: 0,              // -1, 0, 1 from held keys
    left: false,
    right: false,
    clickX: null,         // in canvas fraction 0..1
    clickY: null,
    clicked: false,
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') { state.confirm = true; e.preventDefault(); }
    if (e.code === 'Space' || e.code === 'KeyE') { state.act = true; state.confirm = true; e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') state.pause = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') state.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') state.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') state.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') state.right = false;
  });
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.clickX = (e.clientX - rect.left) / rect.width;
    state.clickY = (e.clientY - rect.top) / rect.height;
    state.clicked = true;
    state.confirm = true;
  });

  return {
    take() {
      const out = {
        confirm: state.confirm,
        act: state.act,
        pause: state.pause,
        axis: state.left && !state.right ? -1 : state.right && !state.left ? 1 : 0,
        clickX: state.clickX,
        clickY: state.clickY,
        clicked: state.clicked,
      };
      state.confirm = false;
      state.act = false;
      state.pause = false;
      state.clickX = null;
      state.clickY = null;
      state.clicked = false;
      return out;
    },
    /** live axis every frame, not just on take() — for smooth held-key walking */
    heldAxis() {
      return state.left && !state.right ? -1 : state.right && !state.left ? 1 : 0;
    },
  };
}
