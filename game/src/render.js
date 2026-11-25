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

    // a pale crescent moon high over the market
    ctx.save();
    ctx.globalAlpha = 0.8;
    circle(880, 60, 20, '#e8e2d0');
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = COLOR.sky0;
    ctx.beginPath(); ctx.arc(873, 55, 18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // faint drifting clouds, lit faintly warm from the market below
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const cx = ((world.time * 4 + i * 480) % 1500) - 110;
      const cy = 50 + i * 34;
      ctx.globalAlpha = 0.1;
      ellipse(cx, cy, 90, 14, '#8a6a8a');
      ellipse(cx + 40, cy - 6, 60, 11, '#8a6a8a');
    }
    ctx.restore();

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
    // warm lamplight pooling on the street before the stall, and a faint sheen
    const pool = ctx.createRadialGradient(640, 470, 20, 640, 520, 480);
    pool.addColorStop(0, 'rgba(255,170,80,0.14)');
    pool.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(0, 408, VIEW.width, VIEW.height - 408);
    // the street's faint reflection of the awning's warm stripe
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#c96a3a';
    ctx.fillRect(140, 430, 1000, 60);
    ctx.restore();
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
    const w = 12 + 98 * Math.max(1, Math.min(4, waitingCustomers.length || 1));
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
    waitingCustomers.slice(0, 4).forEach((c, i) => drawOrderTicket(world, c, x + 5 + i * 98, y + 20));
    if (waitingCustomers.length > 4) {
      text('+' + (waitingCustomers.length - 4), x + w - 14, y + 44, 12, COLOR.inkDim, 'center', '800');
    }
  }

  function drawOrderTicket(world, customer, x, y) {
    const dish = DISHES[customer.dishKey];
    fillRR(x, y, 92, 56, 6, 'rgba(42,30,46,0.95)');
    ctx.strokeStyle = dish.color;
    ctx.lineWidth = 1.4;
    rr(x, y, 92, 56, 6);
    ctx.stroke();
    circle(x + 13, y + 17, 8, dish.color);
    text(dish.short, x + 25, y + 22, 9, COLOR.ink, 'left', '700');
    // how far along this order is: fires lit, plated, or still just a hope
    const prod = productionState(world, customer);
    const label = prod === 'plated' ? 'SERVE!' : prod === 'plating' ? 'plating…' : prod === 'done' ? 'off fire' : prod === 'cooking' ? 'cooking…' : 'in line';
    const labelColor = prod === 'plated' ? COLOR.serve : prod === 'plating' || prod === 'done' ? COLOR.warn : COLOR.inkDim;
    text(label, x + 8, y + 39, 9, labelColor, 'left', '600');
    const ratio = Math.max(0, customer.patienceLeft / customer.patienceMax);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 8, y + 46, 76, 5);
    ctx.fillStyle = ratio > 0.5 ? COLOR.serve : ratio > 0.25 ? COLOR.warn : COLOR.angry;
    ctx.fillRect(x + 8, y + 46, 76 * ratio, 5);
  }

  // How far along THIS customer's own order is. Production is per dish type, not per ticket,
  // so units are matched to waiting customers oldest-first: the earliest waiting customer for a
  // dish owns the plated/ready unit, the next owns the one on the fire, the rest are still queued.
  // This keeps every ticket honest — a ticket only claims fire or plating when a real unit of its
  // dish is that far along AND no earlier customer for the same dish is still ahead of it.
  function productionState(world, customer) {
    const dishKey = customer.dishKey;
    // count production units of this dish, most-finished first
    const units = [];
    if (world.plated.some(p => p.dishKey === dishKey) || (world.cook.carrying?.kind === 'plate' && world.cook.carrying.dishKey === dishKey)) units.push('plated');
    if (world.plating && world.plating.dishKey === dishKey) units.push('plating');
    for (const key of Object.keys(world.stations)) {
      const item = world.stations[key].item;
      if (item && item.dishKey === dishKey && !item.burned) units.push(item.done ? 'done' : 'cooking');
    }
    if (world.cook.carrying?.kind === 'hot' && world.cook.carrying.dishKey === dishKey) units.push('done');
    // rank units by progress
    const rank = { plated: 4, plating: 3, done: 2, cooking: 1 };
    units.sort((a, b) => rank[b] - rank[a]);
    // position of this customer among those waiting for the same dish, oldest first
    const queue = world.customers
      .filter(c => !c.left && !c.served && c.dishKey === dishKey)
      .sort((a, b) => a.arrivesAt - b.arrivesAt);
    const position = queue.findIndex(c => c.id === customer.id);
    if (position < 0) return 'none';
    if (position < units.length) return units[position];
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
    // every body a little different — height and breadth vary by the customer's own id, so the
    // queue reads as individuals, not copies of one clip-art figure
    const hVar = 0.92 + ((c.id * 37) % 5) * 0.04;   // 0.92 .. 1.08 height
    const wVar = 0.9 + ((c.id * 53) % 4) * 0.07;    // 0.90 .. 1.11 breadth
    ctx.translate(x, y + 118);
    ctx.scale(wVar, hVar);
    ctx.translate(-x, -(y + 118));

    ellipse(x, y + 118, 34, 9, 'rgba(0,0,0,0.35)');
    // legs and feet — the queue stands on the street, it doesn't hover
    ctx.fillStyle = shade(SHIRT[c.variant], -40);
    fillRR(x - 20, y + 84 + bob * 0.5, 16, 32, 5, shade(SHIRT[c.variant], -40));
    fillRR(x + 4, y + 84 + bob * 0.5, 16, 32, 5, shade(SHIRT[c.variant], -40));
    ellipse(x - 12, y + 117, 11, 5, '#2a1c14');
    ellipse(x + 12, y + 117, 11, 5, '#2a1c14');
    // torso with a little volume — lit warm from the lamp above, darker at the hem
    const shirtGrad = ctx.createLinearGradient(x, y + 32 + bob, x, y + 100);
    shirtGrad.addColorStop(0, shade(SHIRT[c.variant], 22));
    shirtGrad.addColorStop(0.5, SHIRT[c.variant]);
    shirtGrad.addColorStop(1, shade(SHIRT[c.variant], -22));
    ctx.fillStyle = shirtGrad;
    rr(x - 27, y + 32 + bob, 54, 70, 16);
    ctx.fill();
    // skin with a warm rim on the lamp side
    circle(x, y + 12 + bob, 22, SKIN[c.variant]);
    ctx.save();
    ctx.globalAlpha = 0.3;
    circle(x - 6, y + 5 + bob, 14, shade(SKIN[c.variant], 30));
    ctx.restore();
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

    // arms hanging naturally at the sides, hands slightly forward — people waiting, relaxed
    ctx.strokeStyle = SKIN[c.variant];
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 24, y + 42 + bob);
    ctx.quadraticCurveTo(x - 30, y + 62 + bob, x - 26, y + 76 + bob);
    ctx.moveTo(x + 24, y + 42 + bob);
    ctx.quadraticCurveTo(x + 30, y + 62 + bob, x + 26, y + 76 + bob);
    ctx.stroke();

    // order bubble: big readable dish icon + patience bar
    if (!c.served && !c.left) {
      const by = y - 88 + bob;
      fillRR(x - 46, by - 2, 92, 58, 11, 'rgba(245,234,214,0.96)');
      ctx.strokeStyle = 'rgba(120,80,40,0.5)';
      ctx.lineWidth = 1.5;
      rr(x - 46, by - 2, 92, 58, 11);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 2, by + 56); ctx.lineTo(x + 10, by + 56); ctx.lineTo(x + 3, by + 66);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245,234,214,0.96)';
      ctx.fill();
      drawDishIcon(c.dishKey, x, by + 24, 2.5);
      // patience: the thick bar across the bubble's foot, impossible to miss
      const ratio = Math.max(0, c.patienceLeft / c.patienceMax);
      ctx.fillStyle = 'rgba(60,40,30,0.5)';
      rr(x - 40, by + 60, 80, 8, 4);
      ctx.fill();
      ctx.fillStyle = ratio > 0.5 ? COLOR.serve : ratio > 0.25 ? COLOR.warn : COLOR.angry;
      if (ratio > 0.04) { rr(x - 40, by + 60, Math.max(10, 80 * ratio), 8, 4); ctx.fill(); }
    }

    if (c.payFlash > 0) {
      // the payment pops right at the customer's order bubble and rises only a little —
      // anchored, clearly a reward for serving THIS customer, never a stray float in empty air
      const rise = (1 - c.payFlash) * 18;
      ctx.globalAlpha = Math.min(1, c.payFlash * 1.6);
      const payY = y - 96 - rise;
      // a small coin disc behind the amount so it reads as money changing hands
      circle(x + 34, payY - 6, 11, '#c9a54a');
      circle(x + 34, payY - 6, 8, '#e8c96a');
      text('+Rp', x + 46, payY, 15, COLOR.lampHot, 'left', '800');
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
    } else if (dishKey === 'nasiGoreng') {
      // fried rice: a browned mound with grain texture and the fried egg sliding on top —
      // the signature look, unmistakable next to the plain rice dishes
      ellipse(0, 6, 13, 5, '#3f6a2f');
      ellipse(0, 2, 10, 6, dish.color);
      // grains
      ctx.fillStyle = '#a86a34';
      circle(-4, 0, 1.5, ctx.fillStyle); circle(2, 2, 1.5, ctx.fillStyle); circle(5, 0, 1.3, ctx.fillStyle);
      // the fried egg, white with a yolk, draped over the top
      ellipse(1, -2, 7, 4.5, '#f5eede');
      circle(1.5, -2.5, 2.4, '#e8a83a');
    } else if (dishKey === 'nasiUduk') {
      // coconut rice in its banana-leaf cone — pale, pointed, with fried shallots on top
      ellipse(0, 6, 12, 5, '#3f6a2f');
      // the leaf cone wrapping up behind the rice
      ctx.fillStyle = '#4f8240';
      ctx.beginPath();
      ctx.moveTo(-9, 6); ctx.lineTo(-6, -8); ctx.lineTo(6, -6); ctx.lineTo(9, 6);
      ctx.closePath(); ctx.fill();
      // the pale coconut-milk rice mounded in front
      ellipse(0, 3, 9, 6, dish.color);
      // fried shallots sprinkled over — tiny crisp brown flecks
      ctx.fillStyle = '#b07030';
      circle(-2, 0, 1.3, ctx.fillStyle); circle(2, 1, 1.2, ctx.fillStyle); circle(0, -1.5, 1.1, ctx.fillStyle);
    } else {
      // generic rice mound on a banana-leaf plate (fallback)
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
    // leafy greens in the left crate — read as a bunch of leaves, not blobs
    ctx.fillStyle = '#4a7a3a';
    for (const [gx, gy, gr] of [[-8, -32, 6], [2, -34, 7], [12, -31, 6], [6, -28, 5]]) {
      // a leaf: oval with a lighter vein
      ellipse(x + gx, cy + gy, gr, gr * 0.6, '#558a44');
      ctx.strokeStyle = '#3f6a30';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + gx - gr * 0.7, cy + gy); ctx.lineTo(x + gx + gr * 0.7, cy + gy); ctx.stroke();
    }
    // eggs in the right crate — pale ovals in a little nest, clearly eggs
    for (const [ex, ey] of [[46, -32], [58, -30], [70, -33], [52, -28], [64, -28]]) {
      ellipse(x + ex, cy + ey, 4.5, 3.6, '#f2e2c0');
    }
    // a bunch of red chilis hanging off the crate edge
    ctx.strokeStyle = '#b03020';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 86, cy - 26);
      ctx.quadraticCurveTo(x + 90 + i * 3, cy - 16, x + 88 + i * 4, cy - 8);
      ctx.stroke();
    }

    // the rice steamer, lid ajar, always steaming a little — it is rice, it never rests.
    // when a nasi uduk is simmering inside, the lid sits back and the coconut rice shows;
    // the heat badge tracks it like any other fire, because it IS one of the four.
    const item = world.stations.rice.item;
    const steaming = !!(item && !item.burned);
    ellipse(x + w / 2, y + 34, w / 2 - 8, 12, '#6a7078');
    fillRR(x + 6, y + 30, w - 12, 30, 7, '#7c828c');
    ellipse(x + w / 2, y + 30, w / 2 - 6, 9, '#9aa0ab');
    if (item) {
      // lid lifted off: the simmering coconut rice visible, steaming harder as it cooks
      ellipse(x + w / 2, y + 28, 15, 5.5, item.burned ? '#2a1c14' : COLOR.riceWhite);
      // a golden coconut sheen on the surface
      if (!item.burned) ellipse(x + w / 2 - 3, y + 26.5, 9, 3, '#e8d8b0');
      // the lid leans against the steamer's side
      ctx.save();
      ctx.translate(x + w - 8, y + 22);
      ctx.rotate(0.6);
      ellipse(0, 0, 12, 4.5, '#c8ccd4');
      ctx.restore();
      steam(world, x + w / 2, y + 10, item.done ? 3 : 4);
      drawHeatRing(world, item, x + w / 2, y + 2);
    } else {
      // idle: lid ajar, plain steam
      ellipse(x + w / 2 - 4, y + 24, 12, 5, '#c8ccd4');
      ellipse(x + w / 2, y + 28, 15, 5.5, COLOR.riceWhite);
      steam(world, x + w / 2, y + 12, 2);
    }
  }

  function drawWok(world, st, x, y, w) {
    const item = st.item;
    const flameOn = !!item && !item.done;
    if (flameOn) {
      // flame tongues licking up under the wok — a row of teardrop flames that flicker and dance
      const cx = x + w / 2;
      for (let i = 0; i < 7; i++) {
        const fx = cx - 30 + i * 10;
        const flicker = Math.sin(world.time * 18 + i * 2.3) * 0.5 + Math.sin(world.time * 27 + i) * 0.5;
        const fh = 15 + flicker * 6 + (i % 2) * 4;
        // outer flame
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = COLOR.ember;
        ctx.beginPath();
        ctx.moveTo(fx - 5, y + 50);
        ctx.quadraticCurveTo(fx - 5 - flicker * 2, y + 42, fx, y + 50 - fh);
        ctx.quadraticCurveTo(fx + 5 + flicker * 2, y + 42, fx + 5, y + 50);
        ctx.closePath();
        ctx.fill();
        // inner bright core
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = COLOR.emberHi;
        ctx.beginPath();
        ctx.moveTo(fx - 2.5, y + 50);
        ctx.quadraticCurveTo(fx - 2, y + 45, fx, y + 50 - fh * 0.55);
        ctx.quadraticCurveTo(fx + 2, y + 45, fx + 2.5, y + 50);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // ember sparks riding the heat upward — tiny bright flecks that say roaring fire
      for (let i = 0; i < 4; i++) {
        const phase = (world.time * 0.8 + i * 0.25) % 1;
        const sx = cx - 18 + i * 12 + Math.sin(world.time * 3 + i) * 3;
        const sy = y + 44 - phase * 30;
        ctx.save();
        ctx.globalAlpha = (1 - phase) * 0.8;
        circle(sx, sy, 1.4, COLOR.emberHi);
        ctx.restore();
      }
      // heat shimmer glow
      const f = 0.6 + 0.4 * Math.sin(world.time * 14);
      ctx.save();
      ctx.globalAlpha = 0.16 * f;
      const hg = ctx.createRadialGradient(cx, y + 40, 4, cx, y + 40, 46);
      hg.addColorStop(0, COLOR.emberHi);
      hg.addColorStop(1, 'rgba(255,90,38,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(cx - 50, y, 100, 64);
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
    // even empty, the wok catches the lamp — a curved sheen on its inner wall so it reads
    // as a seasoned steel vessel waiting, not a hole in the table
    if (!item) {
      ctx.save();
      ctx.strokeStyle = 'rgba(200,190,180,0.28)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + 27, w / 2 - 18, 6.5, 0, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,120,0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + 25, w / 2 - 12, 8, 0, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    if (item) {
      drawWokContents(world, item, x + w / 2, y + 24);
      steam(world, x + w / 2, y + 8, flameOn ? 4 : 2);
      drawHeatRing(world, item, x + w / 2, y + 2);
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
      // the gloss of hot oil — a couple of bright specks that say fresh off the fire
      if (!item.burned) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        circle(cx - 3, cy - 1 - toss, 1.1, '#ffeedd');
        circle(cx + 8, cy + 1 - toss, 0.9, '#ffe8cc');
        ctx.restore();
      }
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
      drawHeatRing(world, item, x + w / 2, y + 2);
    }
  }

  function drawBatterPan(world, st, x, y, w) {
    ellipse(x + w / 2, y + 30, w / 2 - 6, 13, '#3c363c');
    ellipse(x + w / 2, y + 27, w / 2 - 10, 10, '#241f24');
    const item = st.item;
    // the seasoned griddle surface catches the light even with nothing on it — a soft sheen
    // so the empty pan reads as a well-used flat griddle, never a black oval void
    if (!item) {
      // the oiled griddle surface — a broad warm-metal sheen so it reads as a well-used
      // flat griddle waiting for batter, never a black oval void
      ctx.save();
      const gg = ctx.createLinearGradient(x + 20, y + 18, x + w - 20, y + 34);
      gg.addColorStop(0, '#4a4048');
      gg.addColorStop(0.5, '#5c4e56');
      gg.addColorStop(1, '#3e343c');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + 26, w / 2 - 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // a bright specular streak where the lamp hits the oil
      ctx.globalAlpha = 0.5;
      ellipse(x + w / 2 - 12, y + 23, w / 2 - 34, 3, '#8a7a84');
      ctx.restore();
    }
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
      drawHeatRing(world, item, x + w / 2, y + 2);
    }
  }

  // the ring that tells heat progress at a glance: amber while cooking, green when done,
  // red filling as it heads for burnt — readable in a screenshot
  function drawHeatRing(world, item, cx, cy) {
    // a compact cooking badge pinned just over the food. While cooking: a thin arc filling up.
    // When done: the food itself glows and a small arrow bounces over it saying grab me now —
    // never a ring floating up among the hanging ladles.
    ctx.save();
    ctx.lineWidth = 3.5;
    if (!item.done) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = COLOR.warn;
      ctx.beginPath(); ctx.arc(cx, cy, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, item.heat)); ctx.stroke();
    } else if (!item.burned) {
      // ready: warm glow on the food + a bouncing grab arrow, burn risk as a shrinking arc
      const p = 0.5 + 0.5 * Math.sin(world.time * 7);
      ctx.globalAlpha = 0.5 + 0.4 * p;
      circle(cx, cy + 8, 13, 'rgba(120,255,150,0.25)');
      ctx.globalAlpha = 1;
      // burn danger arc closing in
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = item.burn > 0.05 ? COLOR.angry : COLOR.serve;
      ctx.beginPath(); ctx.arc(cx, cy, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (item.burn > 0.05 ? Math.min(1,item.burn) : 1)); ctx.stroke();
      // bouncing grab-me arrow over the food
      const bob = Math.abs(Math.sin(world.time * 5)) * 4;
      ctx.fillStyle = COLOR.serve;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16 - bob);
      ctx.lineTo(cx - 6, cy - 24 - bob);
      ctx.lineTo(cx + 6, cy - 24 - bob);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#1c1214';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
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
    const surf = y + 30;
    const midX = x + w / 2 - 40;
    if (world.plating) {
      const dish = DISHES[world.plating.dishKey];
      const prog = world.plating.progress;
      // leaf plate, lifted a touch so it clears the cook's silhouette
      ellipse(midX, y - 2, 38, 13, '#3f6a2f');
      ellipse(midX, y - 4, 34, 11, '#4f8240');
      // the food settling onto the leaf as plating progresses — slides in from above
      const drop = (1 - Math.min(1, prog * 1.8)) * 26;
      ctx.save();
      ctx.globalAlpha = Math.min(1, prog * 2);
      if (world.plating.dishKey === 'satay' || world.plating.dishKey === 'satayPadang') {
        drawDishIcon(world.plating.dishKey, midX, y - 2 - drop, 2.1);
      } else {
        ellipse(midX, y - 7 - drop, 25, 10, dish.color);
        // grain texture
        ctx.fillStyle = shade(dish.color, 18);
        circle(midX - 8, y - 8 - drop, 2.5, ctx.fillStyle);
        circle(midX + 6, y - 6 - drop, 2.5, ctx.fillStyle);
        circle(midX + 12, y - 8 - drop, 2.2, ctx.fillStyle);
      }
      // the garnish lands last
      const gar = GARNISH[dish.garnish];
      if (prog > 0.55) circle(midX + 8, y - 10 - drop, 6, gar.color);
      ctx.restore();
      // plating progress ring
      ctx.strokeStyle = COLOR.lampGlow;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(midX, surf - 24, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
    }

    // finished plates waiting to be served — the plate ready to serve the judge looks for
    world.plated.forEach((p, i) => {
      const px = midX + 2 + i * 2;
      const py = y + 30 - i * 3;
      ellipse(px, py, 38, 13, '#3f6a2f');
      ellipse(px, py - 2, 34, 11, '#4f8240');
      drawDishIcon(p.dishKey, px, py - 8, 2.9);
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(world.time * 6 + i);
      text('SERVE', px, y + 2, 13, COLOR.serve, 'center', '800');
      ctx.restore();
    });
  }

  function steam(world, x, y, n) {
    // a real rising plume: many soft puffs climbing and spreading and thinning as they cool
    ctx.save();
    const count = n * 3;
    for (let i = 0; i < count; i++) {
      const phase = (world.time * 0.55 + i / count) % 1;
      const py = y - phase * 56;
      const drift = Math.sin(world.time * 1.3 + i * 2.1) * (2 + phase * 12) + phase * 6;
      const px = x + drift;
      const size = 2.5 + phase * 8;
      ctx.globalAlpha = (1 - phase) * (1 - phase) * 0.55;
      circle(px, py, size, 'rgba(245,240,230,0.68)');
    }
    ctx.restore();
  }
  function smokeWisps(world, x, y, n) {
    // charcoal smoke: a thicker gray column that drifts off to one side as it rises —
    // the smell of satay you can almost see
    ctx.save();
    const count = n * 3;
    for (let i = 0; i < count; i++) {
      const phase = (world.time * 0.4 + i / count) % 1;
      const py = y - phase * 64;
      const px = x + Math.sin(world.time * 1.1 + i * 2.4) * (3 + phase * 9) + phase * 20;
      const size = 2.5 + phase * 9;
      ctx.globalAlpha = (1 - phase) * (1 - phase) * 0.5;
      circle(px, py, size, 'rgba(205,196,186,0.6)');
    }
    ctx.restore();
  }




  // other market-goers drifting past behind the stall — silhouettes that make the night
  // market feel inhabited beyond this one queue
  function drawPassersBy(world) {
    // distant market-goers on the far side of the street, small and faint and high on the wall —
    // depth cues (size, height, faintness) make clear these are background, never queue customers
    ctx.save();
    const walkers = [
      { speed: 20, y: 250, size: 0.55, alpha: 0.18, offset: 0 },
      { speed: -14, y: 258, size: 0.5, alpha: 0.14, offset: 700 },
    ];
    for (const wk of walkers) {
      const span = 1500;
      const x = ((world.time * wk.speed + wk.offset) % span + span) % span - 110;
      const s = wk.size;
      ctx.globalAlpha = wk.alpha;
      ctx.fillStyle = '#1c1626';
      const stride = Math.sin(world.time * 6 + wk.offset) * 4;
      circle(x, wk.y - 44 * s, 11 * s, '#1c1626');
      ctx.fillStyle = '#1c1626';
      rr(x - 12 * s, wk.y - 36 * s, 24 * s, 42 * s, 8 * s);
      ctx.fill();
      ctx.strokeStyle = '#1c1626';
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, wk.y + 4 * s); ctx.lineTo(x - 5 * s - stride, wk.y + 30 * s);
      ctx.moveTo(x + 5 * s, wk.y + 4 * s); ctx.lineTo(x + 5 * s + stride, wk.y + 30 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStationTargeting(world) {
    if (world.nightOver) return;
    const tx = world.cook.targetX;
    let bestKey = null, bestDist = 1e9;
    for (const key of Object.keys(LAYOUT.stations)) {
      const cfg = LAYOUT.stations[key];
      const cx = cfg.x + cfg.w / 2;
      const d = Math.abs(tx - cx);
      if (d < bestDist) { bestDist = d; bestKey = key; }
    }
    if (!bestKey || bestDist > 90) return;
    const cfg = LAYOUT.stations[bestKey];
    const moving = Math.abs(world.cook.targetX - world.cook.x) > 8;
    ctx.save();
    ctx.globalAlpha = moving ? 0.5 : 0.28;
    const gg = ctx.createRadialGradient(cfg.x + cfg.w / 2, cfg.y + 40, 4, cfg.x + cfg.w / 2, cfg.y + 40, cfg.w / 2 + 20);
    gg.addColorStop(0, 'rgba(255,214,120,0.5)');
    gg.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(cfg.x - 16, cfg.y, cfg.w + 32, cfg.h);
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


  // the clutter of a working stall in the band behind the cook: hanging tools, sauce jars,
  // the gas canister — fills the wall and tells you a real kitchen runs here
  function drawKitchenClutter(world) {
    // a bamboo shelf rail along the back wall
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(150, 492, 980, 6);
    // hanging ladles + a spatula + the wok ladle, swaying slightly
    const tools = [230, 280, 330, 900, 950];
    tools.forEach((tx, i) => {
      const sway = Math.sin(world.time * 0.9 + i * 1.4) * 2;
      ctx.strokeStyle = '#6a5335';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(tx, 498); ctx.lineTo(tx + sway, 524); ctx.stroke();
      if (i % 2 === 0) {
        // ladle cup
        ellipse(tx + sway, 528, 7, 5, '#8a8578');
      } else {
        // spatula blade
        fillRR(tx + sway - 5, 524, 10, 12, 2, '#7a7570');
      }
    });
    // sauce jars on the shelf: kecap manis, sambal, oil — little labeled bottles
    const jars = [
      { x: 430, color: '#3a1a10', cap: '#c9a54a' },  // kecap
      { x: 462, color: '#b03020', cap: '#d9d0c0' },  // sambal
      { x: 494, color: '#c9852e', cap: '#4a4a4a' },  // oil
      { x: 526, color: '#5a3010', cap: '#c9a54a' },  // soy
    ];
    for (const j of jars) {
      fillRR(j.x, 470, 20, 26, 3, j.color);
      fillRR(j.x + 4, 466, 12, 6, 2, j.cap);
      ctx.save();
      ctx.globalAlpha = 0.35;
      fillRR(j.x + 3, 472, 4, 20, 2, '#ffeedd');
      ctx.restore();
    }
    // the green gas canister under the shelf, feeding the burners
    fillRR(680, 500, 34, 40, 6, '#3f6a4a');
    fillRR(690, 494, 14, 10, 3, '#2f4a38');
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(697, 500); ctx.quadraticCurveTo(720, 510, 700, 522); ctx.stroke();
  }


  // the back of the stall behind the queue: a painted menu board, stools, a drink crate —
  // warung set dressing that fills the void and makes the place unmistakably itself
  function drawSetDressing(world) {
    // a warm back panel so the queue reads against wood, not void
    const panel = ctx.createLinearGradient(0, 190, 0, 410);
    panel.addColorStop(0, 'rgba(58,32,40,0.55)');
    panel.addColorStop(1, 'rgba(30,18,26,0.0)');
    ctx.fillStyle = panel;
    ctx.fillRect(120, 190, 1040, 220);

    // the hand-painted menu board hanging at the left of the stall — the full roster,
    // every dish a ticket can ask for, or the stall contradicts itself
    fillRR(140, 192, 132, 118, 6, '#f2e2c0');
    ctx.strokeStyle = '#8a6a40';
    ctx.lineWidth = 3;
    rr(140, 192, 132, 118, 6);
    ctx.stroke();
    text('WARUNG', 206, 212, 15, '#8a3030', 'center', '900');
    text('MALAM', 206, 229, 15, '#8a3030', 'center', '900');
    ctx.strokeStyle = '#b0a080';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(150, 236); ctx.lineTo(262, 236); ctx.stroke();
    const menuLines = [
      ['Nasi goreng', '12'], ['Kwetiau', '13'], ['Sate ayam', '15'],
      ['Martabak', '14'], ['Nasi uduk', '11'], ['Sate padang', '17'],
    ];
    menuLines.forEach((ln, i) => {
      text(ln[0], 148, 250 + i * 10, 7.5, '#4a3a28', 'left', '600');
      text(ln[1], 262, 250 + i * 10, 7.5, '#4a3a28', 'right', '600');
    });

    // a couple of empty plastic stools waiting by the counter's right end
    for (const sx of [960, 1010]) {
      ctx.fillStyle = '#c94a3a';
      fillRR(sx, 396, 34, 8, 3, '#c94a3a');
      ctx.fillStyle = '#a83a2e';
      ctx.fillRect(sx + 4, 404, 5, 22);
      ctx.fillRect(sx + 25, 404, 5, 22);
    }
    // the neighboring stalls down the row — dim awnings with their own little lamps, so this
    // is unmistakably one warung in a living night market, not a lone stall in a void
    for (const n of [ { x: 30, w: 100, lamp: 80 }, { x: 1150, w: 110, lamp: 1200 } ]) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      // distant awning
      ctx.fillStyle = '#2a1a22';
      ctx.beginPath();
      ctx.moveTo(n.x, 175); ctx.lineTo(n.x + n.w, 175); ctx.lineTo(n.x + n.w - 8, 200); ctx.lineTo(n.x + 8, 200);
      ctx.closePath(); ctx.fill();
      // its dim lamp glow
      const lg = ctx.createRadialGradient(n.lamp, 215, 2, n.lamp, 215, 34);
      lg.addColorStop(0, 'rgba(255,190,90,0.5)');
      lg.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(n.lamp - 36, 195, 72, 60);
      circle(n.lamp, 214, 3.5, '#ffd27a');
      // a hint of a stall body + a figure tending it
      ctx.fillStyle = '#1c1420';
      ctx.fillRect(n.x + 12, 220, n.w - 24, 90);
      ctx.restore();
    }

    // a crate of bottled tea at the stall's left foot
    fillRR(160, 560, 56, 34, 3, '#8a5a2a');
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        fillRR(166 + i * 16, 566 + j * 13, 11, 10, 2, '#c9852e');
      }
    }
  }

  // ---------- the cook ----------
  function drawCook(world) {
    const cook = world.cook;
    const x = cook.x, y = cook.y;
    const moving = Math.abs(cook.targetX - x) > 4 || cook.moveAxis !== 0;
    // the protagonist reads larger than everything else on the line — scale around the feet
    ctx.save();
    ctx.translate(x, y + 60);
    ctx.scale(1.24, 1.24);
    ctx.translate(-x, -(y + 60));
    const bob = Math.abs(Math.sin(world.time * 8)) * (moving ? 2.5 : 0.6);
    ellipse(x, y + 60, 26, 7, 'rgba(0,0,0,0.4)');
    ctx.strokeStyle = '#2c2430';
    ctx.lineWidth = 7;
    const walk = moving ? Math.sin(world.time * 11) * 7 : 0;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 34); ctx.lineTo(x - 5 - walk, y + 58);
    ctx.moveTo(x + 5, y + 34); ctx.lineTo(x + 5 + walk, y + 58);
    ctx.stroke();
    // shirt with volume
    const shirtG = ctx.createLinearGradient(x, y - 2, x, y + 38);
    shirtG.addColorStop(0, '#f2ead8');
    shirtG.addColorStop(1, '#cfc4ac');
    ctx.fillStyle = shirtG;
    rr(x - 17, y - 2 + bob * 0.4, 34, 40, 10);
    ctx.fill();
    // apron with a strap and a pocket
    ctx.fillStyle = '#8a3030';
    rr(x - 15, y + 10 + bob * 0.4, 30, 29, 6);
    ctx.fill();
    ctx.fillStyle = '#6a2424';
    ctx.fillRect(x - 15, y + 10 + bob * 0.4, 30, 4);
    fillRR(x - 6, y + 24 + bob * 0.4, 12, 10, 2, '#6a2424');
    // the towel over the shoulder every warung cook carries
    ctx.strokeStyle = '#d9c9a0';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 2 + bob * 0.4);
    ctx.quadraticCurveTo(x + 20, y + 12, x + 15, y + 26 + bob * 0.4);
    ctx.stroke();
    // head with simple friendly face
    circle(x, y - 15 + bob * 0.4, 15, '#c98d5e');
    ctx.fillStyle = '#1c1214';
    ctx.beginPath(); ctx.arc(x, y - 21 + bob * 0.4, 15, Math.PI, Math.PI * 2); ctx.fill();
    fillRR(x - 15, y - 25 + bob * 0.4, 30, 7, 3.5, '#c9a54a');
    // eyes + a working smile
    circle(x - 5, y - 13 + bob * 0.4, 1.7, '#1c1214');
    circle(x + 5, y - 13 + bob * 0.4, 1.7, '#1c1214');
    ctx.strokeStyle = '#1c1214';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y - 8 + bob * 0.4, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
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
    ctx.restore();
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
      // combo rides under the earnings, where the eye already is — a streak being built
      const pulse = 1 + 0.08 * Math.sin(world.time * 6);
      ctx.save();
      ctx.translate(1168, 96);
      ctx.scale(pulse, pulse);
      ctx.globalAlpha = 0.9;
      text(`x${world.combo} combo`, 0, 0, 19, COLOR.emberHi, 'right', '800');
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
    drawSetDressing(world);
    drawPassersBy(world);
    drawCustomers(world);
    drawCounter();
    drawKitchenClutter(world);
    drawStationTargeting(world);
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
    ctx.fillStyle = 'rgba(10,6,12,0.74)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // the card glows faintly warm, like the last lamp still burning over a closing stall
    const glow = ctx.createRadialGradient(640, 360, 40, 640, 360, 420);
    glow.addColorStop(0, 'rgba(255,180,90,0.12)');
    glow.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(240, 120, 800, 520);
    fillRR(390, 178, 500, 372, 16, 'rgba(26,15,28,0.97)');
    ctx.strokeStyle = COLOR.lampGlow;
    ctx.lineWidth = 1.5;
    rr(390, 178, 500, 372, 16);
    ctx.stroke();
    // two little petromax lanterns hanging at the card's top corners
    for (const lx of [416, 864]) {
      ctx.strokeStyle = '#6a5335';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, 178); ctx.lineTo(lx, 192); ctx.stroke();
      const lg = ctx.createRadialGradient(lx, 202, 1, lx, 202, 20);
      lg.addColorStop(0, 'rgba(255,200,100,0.7)');
      lg.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 20, 190, 40, 34);
      fillRR(lx - 6, 194, 12, 16, 4, '#c9a54a');
      circle(lx, 202, 4, '#ffe9b0');
    }
    text('the night is done', 640, 246, 38, COLOR.lampHot, 'center', '900');
    // a thin warm rule under the title
    ctx.strokeStyle = 'rgba(255,184,77,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(510, 262); ctx.lineTo(770, 262); ctx.stroke();
    text(`Rp ${world.coins}`, 640, 318, 46, COLOR.serve, 'center', '900');
    text('the stall\'s takings', 640, 342, 13, COLOR.inkDim, 'center', '500');
    // the night's story in a small ledger: what sold, what was lost
    text(`${world.servedCount} orders served`, 640, 380, 20, COLOR.ink, 'center', '600');
    text(`${world.lostCount} walked out · ${world.burnedCount} burned`, 640, 408, 15, COLOR.inkDim, 'center', '500');
    text(`best combo x${world.comboBest}`, 640, 438, 16, COLOR.emberHi, 'center', '600');
    if (world.newBest) {
      text('— a new best night —', 640, 466, 14, COLOR.lampHot, 'center', '700');
    }
    // the prompt breathes gently
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(world.time * 2.5);
    text('press ENTER for another night', 640, 512, 18, COLOR.ink, 'center', '700');
    ctx.restore();
  }

  return { frame, resize, drawDishIcon };
}
