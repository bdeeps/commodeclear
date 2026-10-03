// Chapter 4: the cistern. Two valves and a float, simulated by CisternSim in commode.js:
// the flush valve empties the tank by Torricelli's law, Q = Cd · A · √(2 g h); the fill valve
// refills it until the float shuts it at the set line; the overflow tube carries away anything
// above its rim. Faults you can switch on: a float set too high, and a worn flush-valve seal.
// Flush volumes: IS 774:2022 lists single flush of 5, 6 or 10 L and dual flush of 3/6 or 2/4 L.
// US EPA WaterSense (Fix a Leak Week): a worn flapper can silently leak thousands of gallons a year;
// the test is a few drops of food colouring in the tank, and colour in the bowl after 10 minutes means a leak.
import { THREE, M, canvasTexture, swarm, clamp } from '../kit.js';
import { makeCistern, CisternSim, TANK, PA_PER_DM, G, C, TAU, waterMat, slim, fitNarrow, inReel } from '../commode.js';

const Y0 = 2.6;                                  // height of the tank floor above the stage
const LEAK_MAX = 0.0006;                         // dm²: a 6 mm² gap under a badly worn seal
const SEAL_AREA = Math.PI * 0.037 * 0.037;       // m²: the 74 mm rubber seal
const CUP_AREA = Math.PI * 0.034 * 0.034;        // m²: the float cup

export default {
  id: 'cistern',
  short: 'The cistern',
  title: 'The cistern: two valves and a float',
  subtitle: 'One valve lets the water out in a rush. The other lets it back in and knows when to stop.',
  view: { pos: [-1.7, 4.5, 12.2], target: [-1.7, 3.3, 0] },
  learn: `<p>The cistern's job is to save up water slowly and release it <b>quickly</b>. A tap could never give two litres a second. A tank with a wide hole in its floor can.</p>
    <p>The <b>flush valve</b> is that hole, closed by a rubber <b>seal</b>. The water's own weight presses the seal shut. Press the button and the valve lifts. Its little float keeps it up while the water pours out, then it drops back when the level reaches the cut-off. A <b>dual-flush</b> button has two cut-offs: about <b>6 litres</b> for a full flush and <b>3 litres</b> for a half.</p>
    <p>Now the tank must refill. As the level fell, the <b>float</b> on the <b>fill valve</b> fell with it and opened the valve. Water comes in until the float rises back to the set line and pushes the valve shut. The float is pushed up by <b>buoyancy</b>, the same force that floats a boat (see <a href="https://glassbox.how/buoyancyclear/" target="_blank" rel="noopener">BuoyancyClear</a>). Older cisterns use a <b>ball float</b> on a long arm. Newer ones use a compact <b>float cup</b> that slides on the valve.</p>
    <p>The <b>overflow tube</b> stands a little above the water line. If the fill valve fails, the extra water runs down it into the bowl.</p>
    <p>A cistern that <b>runs on</b> has one of two faults. Either the float is set so high that water keeps spilling into the overflow, or the rubber seal is worn and water leaks past it, so the tank keeps topping itself up. To find a quiet leak, put a few drops of <b>food colouring</b> in the tank and wait ten minutes without flushing. If the colour shows in the bowl, there is a leak.</p>
    <p class="tip"><b>Try it:</b> press both flush buttons and compare. Then raise the float above the overflow rim, or wear out the seal and run the dye test.</p>`,
  terms: [
    { t: 'Flush valve', d: 'The large valve in the floor of the cistern that releases the flush.' },
    { t: 'Fill valve', d: 'The valve that refills the cistern. A float opens and shuts it.' },
    { t: 'Float', d: 'A hollow ball or cup that rides on the water and works the fill valve.' },
    { t: 'Overflow tube', d: 'An open pipe standing above the water line that drains an overfilled tank into the bowl.' },
    { t: 'Dual flush', d: 'Two buttons: a full flush for solids and a half flush for liquids.' },
  ],
  defaults: { set: 1.7, leak: 0, dye: false, float: 'cup', quick: true },
  controls: [
    { type: 'buttons', label: 'Flush', items: [{ label: 'Full flush', act: (s, inst) => inst.flush(TANK.FULL) }, { label: 'Half flush', act: (s, inst) => inst.flush(TANK.HALF) }] },
    { key: 'set', type: 'range', label: 'Float set level', min: 1.3, max: 2.25, step: 0.01, ends: ['low', 'too high'], fmt: (v) => (v * 10).toFixed(1) + ' cm', hint: 'The overflow rim is at 20 cm.' },
    { key: 'leak', type: 'range', label: 'Wear on the flush-valve seal', min: 0, max: 1, step: 0.01, ends: ['new', 'badly worn'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'dye', type: 'toggle', label: 'Dye test: food colouring in the tank' },
    { key: 'float', type: 'seg', label: 'Fill valve', options: [{ v: 'cup', label: 'Float cup' }, { v: 'ball', label: 'Ball float' }] },
    { key: 'quick', type: 'toggle', label: 'Speed up the slow refill (6×)' },
  ],
  quiz: [
    { q: 'What shuts the fill valve when the cistern is full?', options: ['A timer', 'The float, lifted by the rising water', 'The weight of the lid', 'The flush button springing back'], answer: 1, why: 'The float rides on the water. At the set level it pushes the fill valve closed.' },
    { q: 'What holds the flush valve shut between flushes?', options: ['A strong spring', 'A magnet', 'The weight of the water pressing on its seal', 'The overflow tube'], answer: 2, why: 'Water pressure on the seal pushes it down onto its seat: about 7 N at a 17 cm depth in this cistern.' },
    { q: 'You put food colouring in the cistern and, without flushing, colour appears in the bowl. What does that show?', options: ['The water supply is dirty', 'The flush-valve seal is leaking', 'The float is set too low', 'The trap is blocked'], answer: 1, why: 'Tank water can reach the bowl without a flush only by leaking past the flush-valve seal, or over a too-high water line into the overflow.' },
  ],
  reel: [
    { ms: 6000, caption: 'Press the button and the flush valve lifts: six litres leave the cistern in about three seconds.', set: { set: 1.7, leak: 0, dye: false, float: 'cup', quick: true }, act: (s, inst) => { inst.reset(); inst.flush(TANK.FULL, 0.7); }, view: { pos: [0.3, 4.6, 9.6], target: [0.3, 3.4, 0] }, spin: 0 },
    { ms: 5600, caption: 'As the tank refills, the float rises with the water and shuts the fill valve at the set line.', set: { set: 1.7, leak: 0, dye: false, float: 'cup', quick: true }, act: (s, inst) => inst.drain(0.75), view: { pos: [-0.6, 5.0, 8.8], target: [-0.3, 4.0, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = Y0; stage.root.add(root);
    const c = makeCistern(); root.add(c.group);
    const cs = new CisternSim();
    // A glass bowl under the flush pipe to catch what comes down.
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.75, 0.9, 32, 1, true), M.clear(0xcfe8ff, 0.2)); dish.position.set(c.VX, -2.0, c.VZ); root.add(dish);
    const poolMat = waterMat({ opacity: 0.5 }), pool = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.78, 0.45, 32), poolMat); pool.position.set(c.VX, -2.2, c.VZ); root.add(pool);
    const blue = new THREE.Color(C.water), dyeC = new THREE.Color(0x2b3fd6);

    // Drops: 1 fill stream, 2 flush, 3 overflow, 4 leak.
    const N = 220, drops = swarm(N, new THREE.SphereGeometry(0.045, 6, 5), M.plastic(C.drop, { roughness: 0.15 })); drops.castShadow = false; drops.frustumCulled = false; root.add(drops);
    const Pt = Array.from({ length: N }, () => ({ k: 0, x: 0, y: 0, z: 0, vy: 0 }));
    let next = 0, seed = 5, a1 = 0, a2 = 0, a3 = 0, a4 = 0;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const spawn = (o) => { Object.assign(Pt[next], o); next = (next + 1) % N; };

    // Chart of the water level.
    const SPAN = 80; let hist = [], simT = 0, lastDraw = 0;
    const chart = canvasTexture(560, 320, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      const x0 = 70, y0 = h - 44, cw = w - 96, ch = h - 104, Y = (cm) => y0 - (ch * cm) / 25;
      g.fillStyle = '#e8eef8'; g.font = 'bold 24px sans-serif'; g.fillText('Water level in the cistern', 20, 34);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '18px sans-serif';
      for (const cm of [0, 10, 20]) { g.beginPath(); g.moveTo(x0, Y(cm)); g.lineTo(x0 + cw, Y(cm)); g.stroke(); g.fillText(cm + ' cm', 8, Y(cm) + 6); }
      g.fillText(SPAN + ' seconds', x0 + cw - 96, y0 + 30);
      g.setLineDash([6, 6]); g.strokeStyle = '#ffb547'; g.beginPath(); g.moveTo(x0, Y(TANK.OV * 10)); g.lineTo(x0 + cw, Y(TANK.OV * 10)); g.stroke();
      g.strokeStyle = '#5ce1a9'; g.beginPath(); g.moveTo(x0, Y(cs.set * 10)); g.lineTo(x0 + cw, Y(cs.set * 10)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffb547'; g.fillText('overflow', x0 + cw - 74, Y(TANK.OV * 10) - 6); g.fillStyle = '#5ce1a9'; g.fillText('set line', x0 + 6, Y(cs.set * 10) + 20);
      const t1 = Math.max(SPAN, simT);
      if (hist.length > 1) { g.strokeStyle = '#8ef0ff'; g.lineWidth = 5; g.beginPath(); hist.forEach(([t, L], i) => { const x = x0 + cw * (1 - (t1 - t) / SPAN), y = Y(L * 10); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.4), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(-4.9, -1.15, -0.3); root.add(board);
    if (inReel()) { board.position.set(0.2, 6.6, -0.3); board.scale.setScalar(1.7); }

    const L = (t, pos, parent = root, cls = '') => stage.label(t, pos, parent, cls);
    const lCup = L('Fill valve', [0, 3.05, 0.2], c.fill), lFloat = L('Float cup', [-0.75, 0.1, 0.4], c.cup, 'hot');
    const lBall = L('Ball float', [0, 0.65, 0], c.ballG.children[2].children[1], 'hot');
    L('Flush valve', [0.2, 1.0, 0.75], c.plug);
    const minor = [L('Rubber seal', [-0.75, 0.05, 0.6], c.plug)];
    L('Overflow tube', [1.5, TANK.OV + 0.3, 0.2], c.fv);
    minor.push(L('Dual-flush button', [0, 0.5, 0], c.btn), L('To the bowl', [1.35, -1.25, 0.3], c.fv), L('Water supply', [-1.9, -2.55, 0]));
    const lSet = L('Set line', [-2.5, 0, 0.9]), lDye = L('Colour in the bowl: tank water is getting through', [c.VX + 2.6, -2.2, 0.4], root, 'hot');

    let press = null, pressT = 0, dyeTank = 0, dyeBowl = 0, lastUsed = 0, speed = 1;
    const api = {
      reset() { cs.level = cs.set; cs.lift = 0; cs.filling = false; hist = []; simT = 0; lastDraw = 0; dyeBowl = 0; },
      drain(level) { cs.lift = 0; cs.level = level; cs.filling = true; },
      flush(litres, hold = 0.35) { if (cs.lift > 0) return; cs.flush(litres); press = litres > 4 ? 'full' : 'half'; pressT = hold; },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05));
        const narrow = fitNarrow(stage, minor);
        speed = s.quick && cs.lift === 0 && cs.filling ? 6 : 1;
        const h = dt * speed; simT += h;
        cs.step(h, { set: s.set, leak: s.leak * LEAK_MAX });
        if (cs.lift > 0) lastUsed = cs.used;
        pressT -= dt; if (pressT <= 0) press = null;
        // Dye mixes into the tank at once; fresh fill water dilutes it. It reaches the bowl with any tank water.
        dyeTank = s.dye ? Math.min(1, dyeTank + dt * 1.5) : Math.max(0, dyeTank - dt * 1.5);
        const down = cs.toBowl;
        if (cs.qFlush > 0.1) dyeBowl = dyeTank; else dyeBowl = clamp(dyeBowl + (dyeTank - dyeBowl) * Math.min(1, (down * h) / 0.4), 0, 1);
        if (!s.dye) dyeBowl = Math.max(0, dyeBowl - dt);
        poolMat.color.copy(blue).lerp(dyeC, dyeBowl); poolMat.opacity = 0.5 + 0.3 * dyeBowl;
        c.set({ level: cs.level, setLevel: s.set, lift: cs.lift, floatKind: s.float, press, dye: dyeTank, dt });
        lCup.visible = lFloat.visible = s.float === 'cup'; lBall.visible = s.float === 'ball';
        lSet.position.y = s.set; lSet.visible = !narrow; lDye.visible = s.dye && dyeBowl > 0.5 && cs.qFlush === 0;
        // Drops.
        a1 += cs.qFill * 160 * dt; a2 += cs.qFlush * 45 * dt; a3 += Math.min(cs.qOver, 0.3) * 200 * dt; a4 += Math.min(1.5, cs.qLeak * 400) * dt * 6;
        const fx = s.float === 'cup' ? c.FX + 0.42 : -1.45, fz = s.float === 'cup' ? c.FZ : 0.45, fy = 2.45;
        while (a1 >= 1) { a1 -= 1; spawn({ k: 1, x: fx + (rnd() - 0.5) * 0.06, y: fy, z: fz + (rnd() - 0.5) * 0.06, vy: 0 }); }
        while (a2 >= 1) { a2 -= 1; const a = rnd() * TAU, r = 0.24 * Math.sqrt(rnd()); spawn({ k: 2, x: c.VX + r * Math.cos(a), y: 0.05, z: c.VZ + r * Math.sin(a), vy: 6 + rnd() * 4 }); }
        while (a3 >= 1) { a3 -= 1; const a = rnd() * TAU; spawn({ k: 3, x: c.VX + 0.75 + 0.06 * Math.cos(a), y: TANK.OV, z: c.VZ + 0.06 * Math.sin(a), vy: 1 }); }
        while (a4 >= 1) { a4 -= 1; const a = rnd() * TAU; spawn({ k: 4, x: c.VX + 0.24 * Math.cos(a), y: -0.05, z: c.VZ + 0.24 * Math.sin(a), vy: 0.5 }); }
        Pt.forEach((p, i) => {
          if (!p.k) { drops.place(i, [0, -60, 0], null, 0.001); return; }
          p.vy += G * 0.6 * dt; p.y -= p.vy * dt;
          const floor = p.k === 1 ? cs.level : -2.0;
          if (p.y < floor) { p.k = 0; drops.place(i, [0, -60, 0], null, 0.001); return; }
          drops.place(i, [p.x, p.y, p.z], null, p.k === 4 ? 1.3 : 1);
        });
        drops.done();
        if (simT - lastDraw > 0.4) { lastDraw = simT; hist.push([simT, cs.level]); while (hist.length && hist[0][0] < simT - SPAN) hist.shift(); chart.redraw(); }
      },
      readout: (s) => {
        const wasted = (cs.qOver + cs.qLeak) * 86400;
        const depth = clamp(cs.level - (Math.min(cs.level, s.set) - 0.08 - 0.28), 0, 0.56) / 10;   // m of the float cup under water
        const lift = 1000 * 9.81 * CUP_AREA * depth, shut = cs.level * PA_PER_DM * SEAL_AREA;
        const state = cs.lift > 0 ? `Flushing: ${cs.used.toFixed(1)} L so far` : cs.qOver > 0.002 ? '<span class="no">Running into the overflow</span>' : cs.qLeak > 0.0005 && cs.filling ? '<span class="no">Leaking, and topping itself up</span>' : cs.filling ? `Refilling${speed > 1 ? ' (6× faster)' : ''}${lastUsed ? ', after a ' + lastUsed.toFixed(1) + ' L flush' : ''}` : cs.qLeak > 0.0005 ? '<span class="no">Leaking past the seal</span>' : 'Full and waiting';
        return slim(`<div class="big">${state}</div>
          <div class="row"><span>Water level</span><b>${(cs.level * 10).toFixed(1)} cm, ${cs.litres.toFixed(1)} L</b></div>
          <div class="row"><span>Out through the flush valve</span><b>${cs.qFlush.toFixed(2)} L/s</b></div>
          <div class="row"><span>Fill valve</span><b>${cs.filling ? 'open, ' + cs.qFill.toFixed(2) + ' L/s' : 'shut'}</b></div>
          <div class="row"><span>Water pressing the flush valve shut</span><b>${cs.lift > 0 ? 'lifted' : shut.toFixed(1) + ' N'}</b></div>
          <div class="row"><span>Buoyancy lifting the float</span><b>${lift.toFixed(1)} N</b></div>
          <div class="row"><span>Wasted if left like this</span><b>${wasted < 1 ? 'nothing' : Math.round(wasted / 10) * 10 + ' L a day'}</b></div>`, 3);
      },
    };
    return api;
  },
};
