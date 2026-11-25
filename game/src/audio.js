// The sound of the stall, synthesized live with the Web Audio API — no audio files,
// so the game still runs offline from its own source. Every effect is an oscillator or
// shaped noise burst: the wok's sizzle, the ding when a dish is done, the low buzz of a
// burn, the coin-chime of a serve, and a soft night-market drone underneath it all.
// Audio starts on the player's first gesture (browser autoplay rules) and can be muted
// with M. Nothing here affects the simulation — it only answers what the world is doing.

export function createAudio() {
  let ctx = null;
  let master = null;
  let sizzleNoise = null;
  let sizzleGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (ctx || muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  }

  // the constant background: distant crowd murmur + the night hum, very quiet
  function startDrone() {
    if (!ctx || sizzleNoise) return;
    // a filtered noise bed for the sizzle — gain driven by whether the wok is frying
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    sizzleNoise = ctx.createBufferSource();
    sizzleNoise.buffer = buffer;
    sizzleNoise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.8;
    sizzleGain = ctx.createGain();
    sizzleGain.gain.value = 0;
    sizzleNoise.connect(filter).connect(sizzleGain).connect(master);
    sizzleNoise.start();

    // a low warm hum, the petromax and the night
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 92;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.012;
    hum.connect(humGain).connect(master);
    hum.start();
    const hum2 = ctx.createOscillator();
    hum2.type = 'sine';
    hum2.frequency.value = 138.5;
    const hum2Gain = ctx.createGain();
    hum2Gain.gain.value = 0.008;
    hum2.connect(hum2Gain).connect(master);
    hum2.start();
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noiseBurst(freq, dur, vol) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(master);
    src.start();
  }

  return {
    /** call on the first user gesture */
    unlock() {
      ensure();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!started) { startDrone(); started = true; }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() { return muted; },

    /** called every frame with the world: drives the continuous sizzle level */
    update(world) {
      if (!ctx || muted || !sizzleGain) return;
      const frying = Object.values(world.stations).some(st => st.item && !st.item.done);
      const target = frying ? 0.055 : 0.0;
      sizzleGain.gain.setTargetAtTime(target, ctx.currentTime, 0.18);
    },

    /** event sounds — the world calls these as things happen */
    ding()      { blip(880, 0.28, 'triangle', 0.16); blip(1320, 0.2, 'sine', 0.08, 0.04); },
    serve()     { blip(660, 0.14, 'triangle', 0.12); blip(880, 0.16, 'triangle', 0.12, 0.07); blip(1108, 0.2, 'sine', 0.1, 0.14); },
    burn()      { blip(140, 0.5, 'sawtooth', 0.16); blip(98, 0.6, 'sawtooth', 0.12, 0.05); noiseBurst(500, 0.35, 0.05); },
    walkout()   { blip(220, 0.3, 'sawtooth', 0.1); blip(165, 0.4, 'sawtooth', 0.09, 0.1); },
    pickup()    { blip(520, 0.1, 'triangle', 0.08); },
    startCook() { noiseBurst(3000, 0.16, 0.06); blip(392, 0.08, 'triangle', 0.06); },
    plate()     { blip(740, 0.12, 'sine', 0.1); },
    toss()      { noiseBurst(4200, 0.1, 0.03); },
    nightEnd()  { blip(523, 0.3, 'triangle', 0.12); blip(659, 0.3, 'triangle', 0.1, 0.15); blip(784, 0.5, 'triangle', 0.12, 0.3); },
  };
}
