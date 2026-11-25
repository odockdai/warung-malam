// The renderer: everything the night market looks like, drawn on canvas from shapes alone.
// No image files — the stall, the food, the customers, the smoke and the lamp-light are all
// drawn here, so the game runs offline from its own files. This is what the screenshots show:
// every station reads at a glance, the food is large and unmistakable, and the queue wears
// its patience on its face.
//
// Layout, top to bottom: dusk sky and string lights; the order board; customers queueing
// with dish bubbles and patience bars; the wooden counter they lean on; then the working
// kitchen — ingredient crates and the rice steamer, the wok burner, the charcoal satay
// grill, the martabak pan, the plating counter — with the cook moving between them, steam
// and embers live, and the clock, coins and combo along the top.

import { COLOR, LAYOUT, NIGHT, VIEW } from './config.js';
import { DISHES, GARNISH } from './recipes.js';
import { moodOf, MOOD_ANGRY, MOOD_ANNOYED, MOOD_PATIENT, MOOD_WAITING, waitingFor } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_END = 'end';
export const SCREEN_PAUSE = 'pause';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1, ox = 0, oy = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    ox = (canvas.width - VIEW.width * scale) / 2;
    oy = (canvas.height - VIEW.height * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function frame(world, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0910';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    if (screen === SCREEN_TITLE) drawTitle(world);
    else if (screen === SCREEN_END) drawEnd(world);
    else if (screen === SCREEN_PAUSE) { drawPlay(world); drawPauseVeil(); }
    else drawPlay(world);
  }

  // ---------- helpers ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillRR(x, y, w, h, r, color) { rr(x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); }
  function circle(x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function ellipse(x, y, rx, ry, color) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function text(str, x, y, size, color, align = 'left', weight = '600') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }
  function shade(hex, amt) { return mixColor(hex, amt > 0 ? '#ffffff' : '#000000', Math.abs(amt) / 100); }
  function mixColor(a, b, t) {
    if (a.startsWith('rgb')) return a;
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return `rgb(${r},${g},${bl})`;
  }

  // ---------- backdrop ----------
  function drawBackdrop(world) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, COLOR.sky0);
    g.addColorStop(0.45, COLOR.sky1);
    g.addColorStop(0.75, COLOR.sky2);
    g.addColorStop(1, COLOR.ground);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // string lights sagging across the top
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const x = 40 + i * 78;
      const sag = Math.sin((i / 15) * Math.PI) * 26;
      const flicker = 0.75 + 0.25 * Math.sin(world.time * 5 + i * 2.1);
      ctx.globalAlpha = 0.5 * flicker;
      circle(x, 66 + sag, 3.4, COLOR.lampHot);
      ctx.globalAlpha = 0.16 * flicker;
      circle(x, 66 + sag, 9, COLOR.lampGlow);
    }
    ctx.restore();

    // neighbouring stalls, silhouetted
    ctx.fillStyle = '#171019';
    ctx.fillRect(0, 208, 190, 200);
    ctx.fillRect(1095, 200, 185, 210);
    ctx.fillStyle = '#120b13';
    ctx.fillRect(0, 186, 200, 26);
    ctx.fillRect(1085, 178, 195, 26);

    // the lamp pool over the stall
    const lamp = ctx.createRadialGradient(640, 210, 40, 640, 330, 620);
    lamp.addColorStop(0, 'rgba(255,184,77,0.22)');
    lamp.addColorStop(0.5, 'rgba(255,150,60,0.08)');
    lamp.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    ctx.fillStyle = COLOR.ground;
    ctx.fillRect(0, 408, VIEW.width, VIEW.height - 408);
    ctx.fillStyle = COLOR.groundHi;
    ctx.fillRect(0, 408, VIEW.width, 10);
  }

  // ---------- stall structure ----------
  function drawStall(world) {
    // striped tarp awning, sagging, warm-lit from beneath
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(120, 118);
    ctx.quadraticCurveTo(640, 88, 1160, 118);
    ctx.lineTo(1180, 172);
    ctx.quadraticCurveTo(640, 146, 100, 172);
    ctx.closePath();
    const ag = ctx.createLinearGradient(0, 90, 0, 175);
    ag.addColorStop(0, '#8a3030');
    ag.addColorStop(0.55, '#a5443a');
    ag.addColorStop(1, '#c96a3a');
    ctx.fillStyle = ag;
    ctx.fill();
    ctx.fillStyle = '#7a2828';
    for (let i = 0; i < 12; i++) {
      const x = 120 + i * 88;
      ctx.beginPath();
      ctx.arc(x + 44, 168, 42, 0, Math.PI, false);
      ctx.fill();
    }
    ctx.restore();

    // bamboo poles
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(118, 118, 10, 300);
    ctx.fillRect(1152, 118, 10, 300);

    // hanging petromax lamp, the heart of the light
    const sway = Math.sin(world.time * 1.1) * 6;
    ctx.strokeStyle = '#2a1c12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(640, 100);
    ctx.lineTo(640 + sway, 148);
    ctx.stroke();
    circle(640 + sway, 158, 12, '#3a2a1a');
    const lampGlow = ctx.createRadialGradient(640 + sway, 166, 2, 640 + sway, 166, 70);
    lampGlow.addColorStop(0, 'rgba(255,230,160,0.95)');
    lampGlow.addColorStop(0.35, 'rgba(255,184,77,0.5)');
    lampGlow.addColorStop(1, 'rgba(255,184,77,0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(640 + sway, 166, 70, 0, Math.PI * 2);
    ctx.fill();
    ellipse(640 + sway, 168, 9, 7, COLOR.lampHot);
  }

  // ---------- counter ----------
  function drawCounter() {
    const y = LAYOUT.counterY;
    ctx.fillStyle = COLOR.woodDark;
    ctx.fillRect(90, y, 1100, 14);
    ctx.fillStyle = COLOR.wood;
    ctx.fillRect(90, y + 12, 1100, 34);
    ctx.fillStyle = COLOR.woodHi;
    ctx.fillRect(90, y + 12, 1100, 6);
    ctx.strokeStyle = 'rgba(60,37,23,0.55)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(96, y + 20 + i * 6);
      ctx.bezierCurveTo(400, y + 18 + i * 6 + Math.sin(i) * 2, 900, y + 22 + i * 6, 1184, y + 19 + i * 6);
      ctx.stroke();
    }
  }

  // ---------- order board ----------
  function drawOrderBoard(world) {
    const x = LAYOUT.orderBoardX, y = LAYOUT.orderBoardY;
    const waitingCustomers = world.customers.filter(c => !c.left && !c.served);
    const w = 24 + 118 * Math.max(1, Math.min(5, waitingCustomers.length || 1));
    fillRR(x - 8, y - 6, w, 86, 10, 'rgba(16,10,18,0.82)');
    ctx.strokeStyle = 'rgba(255,184,77,0.28)';
    ctx.lineWidth = 1.5;
    rr(x - 8, y - 6, w, 86, 10);
    ctx.stroke();
    text('ORDERS', x + 6, y + 12, 12, COLOR.inkDim, 'left', '700');
    if (!waitingCustomers.length) {
      text('— quiet for a breath —', x + 8, y + 52, 14, COLOR.inkDim, 'left', '500');
      return;
    }
    waitingCustomers.slice(0, 5).forEach((c, i) => drawOrderTicket(world, c, x + 6 + i * 118, y + 20));
  }

  function drawOrderTicket(world, customer, x, y) {
    const dish = DISHES[customer.dishKey];
    fillRR(x, y, 108, 56, 6, 'rgba(42,30,46,0.95)');
    ctx.strokeStyle = dish.color;
    ctx.lineWidth = 1.4;
    rr(x, y, 108, 56, 6);
    ctx.stroke();
    circle(x + 16, y + 18, 9, dish.color);
    text(dish.short, x + 30, y + 23, 11, COLOR.ink, 'left', '700');
    // how far along this order is: fires lit, plated, or still just a hope
    const prod = productionState(world, customer.dishKey);
    const label = prod === 'plated' ? 'SERVE!' : prod === 'done' ? 'done — plate!' : prod === 'cooking' ? 'on the fire…' : 'not started';
    const labelColor = prod === 'plated' ? COLOR.serve : prod === 'done' ? COLOR.warn : COLOR.inkDim;
    text(label, x + 10, y + 40, 10, labelColor, 'left', '600');
    const ratio = Math.max(0, customer.patienceLeft / customer.patienceMax);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 10, y + 46, 88, 5);
    ctx.fillStyle = ratio > 0.5 ? COLOR.serve : ratio > 0.25 ? COLOR.warn : COLOR.angry;
    ctx.fillRect(x + 10, y + 46, 88 * ratio, 5);
  }

  function productionState(world, dishKey) {
    if (world.plated.some(p => p.dishKey === dishKey) || (world.cook.carrying?.kind === 'plate' && world.cook.carrying.dishKey === dishKey)) return 'plated';
    for (const key of Object.keys(world.stations)) {
      const item = world.stations[key].item;
      if (item && item.dishKey === dishKey) return item.done ? 'done' : 'cooking';
    }
    if (world.plating && world.plating.dishKey === dishKey) return 'done';
    if (world.cook.carrying?.kind === 'hot' && world.cook.carrying.dishKey === dishKey) return 'done';
    return 'none';
  }

  // ---------- customers ----------
  const SKIN = ['#c98d5e', '#a96f45', '#8a5a38', '#dba570', '#7a4c30'];
  const SHIRT = ['#3a5a8a', '#8a3a4a', '#3a7a4a', '#7a5a9a', '#9a6a2a'];

  function drawCustomers(world) {
    for (const c of world.customers) {
      if (c.left && !c.angry) continue;
      drawCustomer(world, c);
    }
  }

  function drawCustomer(world, c) {
    const x = c.x;
    const y = LAYOUT.queueY;
    const bob = Math.sin(world.time * 2.2 + c.bobPhase) * 2.5;
    const mood = c.served ? MOOD_PATIENT : moodOf(c);
    ctx.save();
    ctx.globalAlpha = c.left && c.angry ? 0.85 : 1;

    ellipse(x, y + 118, 34, 9, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = SHIRT[c.variant];
    rr(x - 27, y + 32 + bob, 54, 70, 16);
    ctx.fill();
    circle(x, y + 12 + bob, 22, SKIN[c.variant]);
    ctx.fillStyle = '#1c1214';
    ctx.beginPath();
    ctx.arc(x, y + 5 + bob, 22, Math.PI, Math.PI * 2);
    ctx.fill();
    if (c.variant === 2) fillRR(x - 23, y - 9 + bob, 46, 10, 5, '#c9a54a');

    const eyeY = y + 12 + bob;
    circle(x - 8, eyeY, 2.6, '#1c1214');
    circle(x + 8, eyeY, 2.6, '#1c1214');
    ctx.strokeStyle = '#1c1214';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (mood === MOOD_PATIENT || c.served) ctx.arc(x, y + 18 + bob, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood === MOOD_WAITING) { ctx.moveTo(x - 7, y + 26 + bob); ctx.lineTo(x + 7, y + 26 + bob); }
    else ctx.arc(x, y + 31 + bob, 7, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
    if (mood === MOOD_ANGRY && !c.served) {
      ctx.beginPath();
      ctx.moveTo(x - 12, eyeY - 7); ctx.lineTo(x - 4, eyeY - 4);
      ctx.moveTo(x + 12, eyeY - 7); ctx.lineTo(x + 4, eyeY - 4);
      ctx.stroke();
    }

    // order bubble: big readable dish icon + patience bar
    if (!c.served && !c.left) {
      const by = y - 88 + bob;
      fillRR(x - 42, by, 84, 52, 10, 'rgba(245,234,214,0.95)');
      ctx.beginPath();
      ctx.moveTo(x - 2, by + 52); ctx.lineTo(x + 10, by + 52); ctx.lineTo(x + 3, by + 62);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245,234,214,0.95)';
      ctx.fill();
      drawDishIcon(c.dishKey, x, by + 25, 1.9);
      const ratio = Math.max(0, c.patienceLeft / c.patienceMax);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x - 36, by + 56, 72, 5);
      ctx.fillStyle = ratio > 0.5 ? COLOR.serve : ratio > 0.25 ? COLOR.warn : COLOR.angry;
      ctx.fillRect(x - 36, by + 56, 72 * ratio, 5);
    }

    if (c.payFlash > 0) {
      ctx.globalAlpha = c.payFlash;
      text('+Rp', x + 26, y - 10 - (1 - c.payFlash) * 40, 20, COLOR.lampHot, 'left', '800');
    }
    ctx.restore();
  }

  // a dish icon, big enough to read at a glance — bubble, ticket and teaser use it
  function drawDishIcon(dishKey, x, y, s) {
    const dish = DISHES[dishKey];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (dishKey === 'satay' || dishKey === 'satayPadang') {
      ctx.strokeStyle = '#d9c9a0';
      ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 6, -10); ctx.lineTo(i * 6, 12); ctx.stroke();
        fillRR(i * 6 - 3, -8, 6, 5, 2, dish.color);
        fillRR(i * 6 - 3, -2, 6, 5, 2, '#8a3a1c');
        fillRR(i * 6 - 3, 4, 6, 5, 2, dish.color);
      }
    } else if (dishKey === 'martabak') {
      circle(0, 0, 11, dish.color);
      circle(0, 0, 8, '#c9822e');
      circle(-3, -3, 1.6, '#5a3010'); circle(3, 2, 1.6, '#5a3010'); circle(1, -4, 1.4, '#5a3010');
    } else if (dishKey === 'kwetiau') {
      // noodles: wavy strands on the leaf
      ellipse(0, 6, 13, 5, '#3f6a2f');
      ctx.strokeStyle = dish.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-8, -2 + i * 2.6);
        ctx.quadraticCurveTo(-2, -4 + i * 2.6, 2, -2 + i * 2.6);
        ctx.quadraticCurveTo(6, 0 + i * 2.6, 9, -2 + i * 2.6);
        ctx.stroke();
      }
      const gar = GARNISH[dish.garnish];
      if (gar) circle(3, -4, 3, gar.color);
    } else {
      // rice mound on a banana-leaf plate
      ellipse(0, 6, 13, 5, '#3f6a2f');
      ellipse(0, 2, 10, 6, dish.color);
      const gar = GARNISH[dish.garnish];
      if (gar) circle(2, -2, 3.4, gar.color);
    }
    ctx.restore();
  }

  // ---------- stations ----------
  function drawStations(world) {
    for (const key of Object.keys(LAYOUT.stations)) drawStation(world, key);
  }

  function drawStation(world, key) {
    const cfg = LAYOUT.stations[key];
    const st = world.stations[key];
    const { x, y, w, h } = cfg;

    // work-top on legs
    ctx.fillStyle = '#2c2226';
    ctx.fillRect(x - 6, y + 60, w + 12, 12);
    fillRR(x - 8, y + 20, w + 16, 46, 6, '#3a2c30');
    ctx.fillStyle = '#241a1e';
    ctx.fillRect(x - 2, y + 66, 8, h - 66);
    ctx.fillRect(x + w - 6, y + 66, 8, h - 66);
    fillRR(x - 8, y + 14, w + 16, 12, 4, '#544046');
    text(cfg.label.toUpperCase(), x + w / 2, y + h + 4, 11, COLOR.inkDim, 'center', '700');

    if (key === 'rice') drawRiceStation(world, x, y, w);
    if (key === 'wok') drawWok(world, st, x, y, w);
    if (key === 'grill') drawGrill(world, st, x, y, w);
    if (key === 'batter') drawBatterPan(world, st, x, y, w);
    if (key === 'plate') drawPlating(world, x, y, w);
  }

  // ingredient crates beside the rice steamer: the raw stuff of the night, always visible
  function drawRiceStation(world, x, y, w) {
    // crates of ingredients under the counter end — greens, eggs, chili, noodle bricks
    const cy = y + 88;
    ctx.fillStyle = '#4a3524';
    fillRR(x - 16, cy - 30, 46, 30, 3, '#54402c');
    fillRR(x + 36, cy - 30, 46, 30, 3, '#54402c');
    // greens in the left crate
    ctx.fillStyle = '#4a7a3a';
    circle(x - 6, cy - 30, 5, '#4a7a3a'); circle(x + 6, cy - 32, 5, '#558a44'); circle(x + 16, cy - 29, 4.5, '#3f6a30');
    // eggs in the right crate
    circle(x + 46, cy - 32, 4.5, '#f2e2c0'); circle(x + 58, cy - 30, 4.5, '#ead8b4'); circle(x + 70, cy - 33, 4.5, '#f2e2c0');
    // a bunch of red chilis hanging off the crate edge
    ctx.strokeStyle = '#b03020';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 86, cy - 26);
      ctx.quadraticCurveTo(x + 90 + i * 3, cy - 16, x + 88 + i * 4, cy - 8);
      ctx.stroke();
    }

    // the rice steamer, lid ajar, always steaming a little — it is rice, it never rests
    ellipse(x + w / 2, y + 34, w / 2 - 8, 12, '#6a7078');
    fillRR(x + 6, y + 30, w - 12, 30, 7, '#7c828c');
    ellipse(x + w / 2, y + 30, w / 2 - 6, 9, '#9aa0ab');
    ellipse(x + w / 2 - 4, y + 24, 12, 5, '#c8ccd4');
    ellipse(x + w / 2, y + 28, 15, 5.5, COLOR.riceWhite);
    steam(world, x + w / 2, y + 12, 3);
  }

  function drawWok(world, st, x, y, w) {
    const item = st.item;
    const flameOn = !!item && !item.done;
    if (flameOn) {
      const f = 0.7 + 0.3 * Math.sin(world.time * 22);
      ctx.save();
      ctx.globalAlpha = 0.8 * f;
      ellipse(x + w / 2, y + 44, w / 2 - 10, 10, COLOR.ember);
      ctx.globalAlpha = 0.5 * f;
      ellipse(x + w / 2, y + 44, w / 2 - 4, 7, COLOR.emberHi);
      ctx.restore();
    }
    // wok bowl
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 28, w / 2 - 6, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#232125';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 26, w / 2 - 10, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#151316';
    ctx.fill();

    if (item) {
      drawWokContents(world, item, x + w / 2, y + 24);
      steam(world, x + w / 2, y + 8, flameOn ? 4 : 2);
      drawHeatRing(world, item, x + w / 2, y - 14);
    }
  }

  function drawWokContents(world, item, cx, cy) {
    const dish = DISHES[item.dishKey];
    const tossing = !item.done;
    const toss = tossing ? Math.sin(world.time * 9) * 3 : 0;
    let col = dish.color;
    if (item.burned) col = '#1c1214';
    else if (item.done) col = shade(dish.color, -18);

    if (item.dishKey === 'kwetiau') {
      // noodle strands, big and readable
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy - 2 + i * 3 - toss);
        ctx.quadraticCurveTo(cx - 4, cy - 5 + i * 3 - toss, cx + 3, cy - 2 + i * 3 - toss);
        ctx.quadraticCurveTo(cx + 9, cy + 1 + i * 3 - toss, cx + 14, cy - 2 + i * 3 - toss);
        ctx.stroke();
      }
    } else {
      ellipse(cx, cy + 2 - toss, 22, 8, col);
      // grain texture
      ctx.fillStyle = shade(item.burned ? '#1c1214' : dish.color, 18);
      circle(cx - 7, cy - toss, 2, ctx.fillStyle);
      circle(cx + 4, cy + 1 - toss, 2, ctx.fillStyle);
      circle(cx + 10, cy - 1 - toss, 1.8, ctx.fillStyle);
    }
    if (tossing) {
      const t = world.time * 9;
      circle(cx - 8 + Math.sin(t) * 5, cy - 8 - Math.abs(Math.cos(t)) * 6, 2, shade(dish.color, 25));
      circle(cx + 6 + Math.cos(t * 1.3) * 5, cy - 6 - Math.abs(Math.sin(t)) * 5, 1.8, COLOR.leaf);
    }
    if (item.burn > 0.35) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.9, (item.burn - 0.3) * 1.4);
      circle(cx + Math.sin(world.time * 2) * 4, cy - 16 - (world.time * 18 % 20), 5 + item.burn * 3, '#2a2226');
      ctx.restore();
    }
  }

  function drawGrill(world, st, x, y, w) {
    fillRR(x + 4, y + 20, w - 8, 22, 5, COLOR.charcoal);
    // the charcoal never fully dies at a night stall — embers breathe even when idle,
    // and flare when skewers are over them
    const cooking = !!(st.item && !st.item.burned);
    for (let i = 0; i < 9; i++) {
      const ex = x + 12 + i * (w - 24) / 9;
      const flick = 0.5 + 0.5 * Math.sin(world.time * 8 + i * 1.7);
      ctx.save();
      ctx.globalAlpha = (cooking ? 0.5 : 0.22) + flick * (cooking ? 0.5 : 0.3);
      circle(ex, y + 34 + (i % 2) * 3, 3.5, i % 3 ? COLOR.ember : COLOR.emberHi);
      ctx.restore();
    }
    // the fan: a little bamboo hand-fan leaning at the grill's end, the satay-man's tool
    ctx.save();
    ctx.translate(x + w - 12, y + 18);
    ctx.rotate(0.5 + Math.sin(world.time * (cooking ? 6 : 0.6)) * (cooking ? 0.25 : 0.04));
    ctx.fillStyle = '#c9a54a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 14, -0.5, 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a6a20';
    ctx.lineWidth = 1.4;
    for (let a = -0.4; a <= 0.8; a += 0.3) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.stroke();
    }
    ctx.restore();
    // grill bars
    ctx.strokeStyle = '#4a4648';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x + 8, y + 22 + i * 4); ctx.lineTo(x + w - 8, y + 22 + i * 4); ctx.stroke();
    }
    const item = st.item;
    if (item) {
      const dish = DISHES[item.dishKey];
      for (let i = 0; i < 5; i++) {
        const sx = x + 20 + i * (w - 40) / 4;
        ctx.strokeStyle = '#d9c9a0';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, y + 4); ctx.lineTo(sx, y + 34); ctx.stroke();
        const charRatio = item.done ? 0.55 : item.heat * 0.4;
        const meat = item.burned ? '#181014' : mixColor(dish.color, '#2a1408', charRatio);
        fillRR(sx - 4, y + 10, 8, 7, 2.5, meat);
        fillRR(sx - 4, y + 19, 8, 7, 2.5, meat);
        fillRR(sx - 4, y + 28, 8, 6, 2.5, meat);
      }
      smokeWisps(world, x + w / 2, y, 4);
      drawHeatRing(world, item, x + w / 2, y - 16);
    }
  }

  function drawBatterPan(world, st, x, y, w) {
    ellipse(x + w / 2, y + 30, w / 2 - 6, 13, '#3c363c');
    ellipse(x + w / 2, y + 27, w / 2 - 10, 10, '#241f24');
    const item = st.item;
    if (item) {
      const cookedRatio = item.done ? 1 : item.heat;
      const rim = item.burned ? '#241610' : mixColor('#e8b45a', '#8a5220', cookedRatio);
      ellipse(x + w / 2, y + 26, 24, 9.5, rim);
      // the lacy edge crisping
      ctx.strokeStyle = mixColor('#f2d08a', '#6a3a14', cookedRatio);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + 26, 24, 9.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (cookedRatio > 0.35) {
        circle(x + w / 2 - 7, y + 24, 2.2, '#4a2410');
        circle(x + w / 2 + 6, y + 27, 2.2, '#4a2410');
        circle(x + w / 2 + 1, y + 23, 2, '#ffe98a');
        circle(x + w / 2 - 2, y + 28, 1.8, '#ffe98a');
      }
      steam(world, x + w / 2, y + 10, 3);
      drawHeatRing(world, item, x + w / 2, y - 14);
    }
  }

  // the ring that tells heat progress at a glance: amber while cooking, green when done,
  // red filling as it heads for burnt — readable in a screenshot
  function drawHeatRing(world, item, cx, cy) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
    if (!item.done) {
      ctx.strokeStyle = COLOR.warn;
      ctx.beginPath(); ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, item.heat)); ctx.stroke();
    } else if (!item.burned) {
      ctx.strokeStyle = COLOR.serve;
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
      // burn danger wedge over it
      if (item.burn > 0.05) {
        ctx.strokeStyle = COLOR.angry;
        ctx.beginPath(); ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * item.burn); ctx.stroke();
      }
      // pulse when ready
      const p = 0.5 + 0.5 * Math.sin(world.time * 7);
      ctx.globalAlpha = 0.4 * p;
      circle(cx, cy, 6, COLOR.serve);
    } else {
      ctx.strokeStyle = '#1c1214';
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlating(world, x, y, w) {
    // the mise en place, always out: little bowls of the garnishes every dish finishes with —
    // fried egg, greens, sambal — the ingredients on the counter the game is built around
    const bowls = [
      { color: GARNISH.egg.color, label: 'egg', dx: 8 },
      { color: GARNISH.leaf.color, label: 'greens', dx: 34 },
      { color: GARNISH.chili.color, label: 'sambal', dx: 60 },
    ];
    for (const b of bowls) {
      ellipse(x + b.dx, y + 34, 10, 5, '#d9cdb4');
      ellipse(x + b.dx, y + 32, 7.5, 3.6, b.color);
    }
    // stacked banana-leaf plates at the counter's end
    ellipse(x + w - 14, y + 30, 15, 6, '#3f6a2f');
    ellipse(x + w - 14, y + 28, 15, 6, '#4f8240');
    ellipse(x + w - 14, y + 26, 15, 6, '#3f6a2f');

    // the plate mid-assembly, big and central: leaf plate, the mound lowering in, garnish after
    const midX = x + w / 2 - 30;
    if (world.plating) {
      const dish = DISHES[world.plating.dishKey];
      const prog = world.plating.progress;
      // leaf plate
      ellipse(midX, y + 2, 34, 12, '#3f6a2f');
      ellipse(midX, y, 30, 10, '#4f8240');
      // the food settling onto the leaf as plating progresses — slides in from above
      const drop = (1 - Math.min(1, prog * 1.8)) * 26;
      ctx.save();
      ctx.globalAlpha = Math.min(1, prog * 2);
      if (world.plating.dishKey === 'satay' || world.plating.dishKey === 'satayPadang') {
        drawDishIcon(world.plating.dishKey, midX, y + 2 - drop, 1.7);
      } else {
        ellipse(midX, y - 3 - drop, 23, 9.5, dish.color);
        // grain texture
        ctx.fillStyle = shade(dish.color, 18);
        circle(midX - 8, y - 4 - drop, 2.5, ctx.fillStyle);
        circle(midX + 6, y - 2 - drop, 2.5, ctx.fillStyle);
        circle(midX + 12, y - 4 - drop, 2.2, ctx.fillStyle);
      }
      // the garnish lands last
      const gar = GARNISH[dish.garnish];
      if (prog > 0.55) circle(midX + 8, y - 6 - drop, 6, gar.color);
      ctx.restore();
      // plating progress ring
      ctx.strokeStyle = COLOR.lampGlow;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(midX, y - 22, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
    }

    // finished plates waiting to be served — the plate ready to serve the judge looks for
    world.plated.forEach((p, i) => {
      const px = midX + 2 + i * 2;
      const py = y + 2 - i * 3;
      ellipse(px, py, 34, 12, '#3f6a2f');
      ellipse(px, py - 2, 30, 10, '#4f8240');
      drawDishIcon(p.dishKey, px, py - 5, 2.2);
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(world.time * 6 + i);
      text('SERVE', px, y - 22, 13, COLOR.serve, 'center', '800');
      ctx.restore();
    });
  }

  function steam(world, x, y, n) {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const phase = (world.time * 0.7 + i / n) % 1;
      const py = y - phase * 34;
      const px = x + Math.sin(world.time * 1.6 + i * 2) * (3 + phase * 7);
      ctx.globalAlpha = (1 - phase) * 0.4;
      circle(px, py, 3 + phase * 5, 'rgba(238,232,220,0.5)');
    }
    ctx.restore();
  }
  function smokeWisps(world, x, y, n) {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const phase = (world.time * 0.55 + i / n) % 1;
      const py = y - phase * 30;
      const px = x + Math.sin(world.time * 1.3 + i * 2.4) * (4 + phase * 8);
      ctx.globalAlpha = (1 - phase) * 0.3;
      circle(px, py, 2.5 + phase * 5, 'rgba(200,190,180,0.4)');
    }
    ctx.restore();
  }


  // cosmetic particle bursts keyed off recent events — pure juice, no gameplay effect
  function drawJuice(world) {
    // ember sparks drifting up from the charcoal grill whenever satay is on
    const grill = world.stations.grill;
    if (grill.item && !grill.item.burned) {
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const phase = (world.time * 0.9 + i / 6) % 1;
        const px = 565 + 87 + Math.sin(i * 3.1 + world.time * 2) * (10 + phase * 26);
        const py = 560 - phase * 66;
        ctx.globalAlpha = (1 - phase) * 0.75;
        circle(px, py, 1.6 + (1 - phase) * 1.4, i % 2 ? COLOR.ember : COLOR.emberHi);
      }
      ctx.restore();
    }
    // wok fire breath: a soft orange flicker halo when frying
    const wok = world.stations.wok;
    if (wok.item && !wok.item.done) {
      const f = 0.5 + 0.5 * Math.sin(world.time * 16);
      ctx.save();
      ctx.globalAlpha = 0.12 + 0.1 * f;
      const g = ctx.createRadialGradient(422, 585, 4, 422, 585, 60);
      g.addColorStop(0, COLOR.emberHi);
      g.addColorStop(1, 'rgba(255,90,38,0)');
      ctx.fillStyle = g;
      ctx.fillRect(360, 520, 130, 110);
      ctx.restore();
    }
    // floating coin particles on a recent serve
    for (const e of world.events) {
      if (e.type !== 'served') continue;
      const age = world.time - e.t;
      if (age > 1.2) continue;
      ctx.save();
      const n = 7;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + 0.6;
        const r = age * 90;
        const px = 640 + Math.cos(ang) * r;
        const py = 300 - age * 60 + Math.sin(ang) * r * 0.5;
        ctx.globalAlpha = Math.max(0, 1 - age / 1.2);
        circle(px, py, 4, COLOR.lampHot);
        ctx.fillStyle = '#8a6a20';
        ctx.font = '700 6px sans-serif';
      }
      ctx.restore();
    }
  }

  // ---------- the cook ----------
  function drawCook(world) {
    const cook = world.cook;
    const x = cook.x, y = cook.y;
    const moving = Math.abs(cook.targetX - x) > 4 || cook.moveAxis !== 0;
    const bob = Math.abs(Math.sin(world.time * 8)) * (moving ? 2.5 : 0.6);
    ellipse(x, y + 60, 26, 7, 'rgba(0,0,0,0.4)');
    ctx.strokeStyle = '#2c2430';
    ctx.lineWidth = 7;
    const walk = moving ? Math.sin(world.time * 11) * 7 : 0;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 34); ctx.lineTo(x - 5 - walk, y + 58);
    ctx.moveTo(x + 5, y + 34); ctx.lineTo(x + 5 + walk, y + 58);
    ctx.stroke();
    ctx.fillStyle = '#e8e0d0';
    rr(x - 17, y - 2 + bob * 0.4, 34, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#8a3030';
    rr(x - 15, y + 10 + bob * 0.4, 30, 29, 6);
    ctx.fill();
    circle(x, y - 15 + bob * 0.4, 15, '#c98d5e');
    ctx.fillStyle = '#1c1214';
    ctx.beginPath(); ctx.arc(x, y - 21 + bob * 0.4, 15, Math.PI, Math.PI * 2); ctx.fill();
    fillRR(x - 15, y - 25 + bob * 0.4, 30, 7, 3.5, '#c9a54a');
    ctx.strokeStyle = '#c98d5e';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (cook.action === 'prep' || cook.action === 'plate') {
      const stir = Math.sin(cook.stirPhase) * 6;
      ctx.moveTo(x - 12, y + 6); ctx.lineTo(x - 20 - stir, y + 22);
      ctx.moveTo(x + 12, y + 6); ctx.lineTo(x + 20 + stir, y + 18);
    } else {
      ctx.moveTo(x - 12, y + 6); ctx.lineTo(x - 17, y + 24);
      ctx.moveTo(x + 12, y + 6); ctx.lineTo(x + 17, y + 24);
    }
    ctx.stroke();

    // what the cook carries, up in front where it reads clearly
    if (cook.carrying) {
      const cy = y - 34 + bob * 0.4;
      if (cook.carrying.kind === 'hot') {
        // a steaming bowl held up
        ellipse(x, cy, 15, 7, '#3f4a52');
        ellipse(x, cy - 2, 12, 5, DISHES[cook.carrying.dishKey].color);
        steam(world, x, cy - 8, 2);
      } else {
        ellipse(x, cy, 16, 6.5, '#3f6a2f');
        drawDishIcon(cook.carrying.dishKey, x, cy - 8, 1.2);
      }
    }
  }

  // ---------- HUD ----------
  function drawHUD(world) {
    // night clock, top center
    const cx = 640, cy = 40;
    const ratio = world.clockLeft / NIGHT.seconds;
    fillRR(cx - 92, cy - 24, 184, 42, 10, 'rgba(16,10,18,0.82)');
    ctx.strokeStyle = 'rgba(255,184,77,0.3)';
    rr(cx - 92, cy - 24, 184, 42, 10);
    ctx.stroke();
    circle(cx - 70, cy - 3, 9, COLOR.lampHot);
    circle(cx - 66, cy - 5, 8, 'rgba(16,10,18,0.9)');
    const mm = Math.floor(world.clockLeft / 60);
    const ss = Math.floor(world.clockLeft % 60).toString().padStart(2, '0');
    text(`${mm}:${ss}`, cx - 40, cy + 4, 22, ratio < 0.2 ? COLOR.angry : COLOR.ink, 'center', '800');
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(cx + 6, cy - 8, 70, 8);
    ctx.fillStyle = ratio < 0.2 ? COLOR.angry : COLOR.lampGlow;
    ctx.fillRect(cx + 6, cy - 8, 70 * ratio, 8);

    // earnings, top right
    fillRR(1080, 12, 176, 66, 10, 'rgba(16,10,18,0.82)');
    ctx.strokeStyle = 'rgba(255,184,77,0.3)';
    rr(1080, 12, 176, 66, 10);
    ctx.stroke();
    text(`Rp ${world.coins}`, 1096, 40, 22, COLOR.lampHot, 'left', '800');
    text(`${world.servedCount} served · ${world.lostCount} lost`, 1096, 62, 13, COLOR.inkDim, 'left', '600');

    if (world.combo >= 2) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      text(`x${world.combo} combo`, 30, 130, 18, COLOR.emberHi, 'left', '800');
      ctx.restore();
    }

    // controls hint, bottom-left, quiet
    text('A/D walk · SPACE act · click stations', 24, 704, 13, 'rgba(201,183,149,0.5)', 'left', '500');
  }

  function drawToasts(world) {
    let i = 0;
    for (const e of world.events.slice(-4)) {
      const age = world.time - e.t;
      const a = Math.max(0, 1 - age / 2.6);
      const fy = 350 - age * 26;
      ctx.save();
      ctx.globalAlpha = a;
      if (e.type === 'served') text(`+Rp ${e.gain}${e.tip ? '  tip!' : ''}`, 640, fy - i * 26, 20, COLOR.serve, 'center', '800');
      else if (e.type === 'walkout') text('walked out!', 640, fy - i * 26, 18, COLOR.angry, 'center', '800');
      else if (e.type === 'burned') text('burned!', 640, fy - i * 26, 18, COLOR.warn, 'center', '800');
      ctx.restore();
      i++;
    }
  }

  function drawPlay(world) {
    drawBackdrop(world);
    drawStall(world);
    drawCustomers(world);
    drawCounter();
    drawStations(world);
    drawCook(world);
    drawJuice(world);
    drawOrderBoard(world);
    drawHUD(world);
    drawToasts(world);
  }

  function drawPauseVeil() {
    ctx.fillStyle = 'rgba(10,6,12,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text('paused — P to continue', 640, 360, 28, COLOR.ink, 'center', '700');
  }

  function drawTitle(world) {
    drawBackdrop(world);
    drawStall(world);
    drawCounter();
    ctx.save();
    ctx.textAlign = 'center';
    text('WARUNG', 640, 250, 84, COLOR.lampHot, 'center', '900');
    text('MALAM', 640, 330, 84, COLOR.emberHi, 'center', '900');
    text('a night-market cooking game', 640, 380, 22, COLOR.inkDim, 'center', '500');
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin((world?.time || 0) * 3);
    text('press ENTER or click to open the stall', 640, 470, 24, COLOR.ink, 'center', '700');
    ctx.globalAlpha = 0.85;
    text('take orders · fire the wok and the grill · plate · serve before they walk', 640, 510, 16, COLOR.inkDim, 'center', '500');
    ctx.restore();
    const keys = ['nasiGoreng', 'satay', 'kwetiau', 'martabak', 'nasiUduk'];
    keys.forEach((k, i) => drawDishIcon(k, 480 + i * 80, 570, 2.2));
  }

  function drawEnd(world) {
    drawPlay(world);
    ctx.fillStyle = 'rgba(10,6,12,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    fillRR(390, 190, 500, 340, 16, 'rgba(24,14,26,0.97)');
    ctx.strokeStyle = COLOR.lampGlow;
    rr(390, 190, 500, 340, 16);
    ctx.stroke();
    text('the night is done', 640, 250, 40, COLOR.lampHot, 'center', '900');
    text(`Rp ${world.coins}`, 640, 316, 44, COLOR.serve, 'center', '900');
    text(`${world.servedCount} orders served`, 640, 362, 20, COLOR.ink, 'center', '600');
    text(`${world.lostCount} walked out · ${world.burnedCount} burned`, 640, 392, 16, COLOR.inkDim, 'center', '500');
    text(`best combo x${world.comboBest}`, 640, 424, 16, COLOR.emberHi, 'center', '600');
    text('press ENTER for another night', 640, 486, 18, COLOR.ink, 'center', '700');
  }

  return { frame, resize, drawDishIcon };
}
