// Chapter 6: where the flush goes. A soil stack with a vent, and three endings: a sewer, a septic
// tank, or the twin leach pits of a pour-flush toilet.
//
// The vent: water falling down the stack drags air with it. With the vent open, air follows from
// the roof and the pressure in the stack hardly changes. Model: air demand about 10 × the water
// flow (an order-of-magnitude assumption) through a 75 mm vent with a loss coefficient of 3, so
// Δp = (1 + K) · ½ ρ_air v² ≈ 12 Pa at 1 L/s, 28 Pa at 1.5 L/s. With the vent blocked the only way
// in for air is through a trap, so suction builds until a seal gives way (ρ g × seal depth, about
// 490 Pa). That is "induced siphonage". The downstairs seal is a TrapSim (commode.js).
//
// Septic tank: solids settle, anaerobic bacteria digest them; IS 2470 (Part 1) designs for about
// 24 to 48 hours' detention, with the effluent led to a soak pit.
// Twin pits: two pits used in turn, each sized for about 3 years; the full pit rests for about
// 2 years while its contents dry out and become safe to dig out (Sulabh International; Eawag
// compendium, "Twin pits for pour flush").
import { THREE, M, box, tube, swarm, clamp, lerp } from '../kit.js';
import { makePan, makeCistern, makePanFlow, FlushSim, TrapSim, CisternSim, TANK, C, waterMat, slim, fitNarrow } from '../commode.js';

const F1 = 0.6, F2 = 9.8, ROOF = 18.4, VTOP = 21.4, SX = 5.6, BASE = 8.2;
const FALL = 16;                          // dm/s shown for water falling in the stack
const K_VENT = 12.4, K_BLOCK = 600;       // Pa per (L/s)²: see the note above
const FILL_Y = 3, REST_Y = 2;             // years to fill a pit, years of rest

// What each pit is doing in a given year. Pit A is used first.
export function pitState(year) {
  const one = (start) => {
    const t = year - start;
    if (t < 0) return { mode: 'new', fill: 0, t: 0 };
    const c = t % (2 * FILL_Y);
    if (c < FILL_Y) return { mode: 'use', fill: c / FILL_Y, t: c };
    const r = c - FILL_Y;
    if (r < REST_Y) return { mode: 'rest', fill: 1 - 0.3 * (r / REST_Y), t: r };
    return { mode: 'empty', fill: 0, t: r };
  };
  return [one(0), one(FILL_Y)];
}
const PIT_TEXT = { new: 'not used yet', use: 'in use', rest: 'resting', empty: 'dug out, ready' };

export default {
  id: 'drain',
  short: 'Where it goes',
  title: 'Where the flush goes',
  subtitle: 'Down the soil stack, past a vent that protects every trap, to a sewer, a tank or a pit.',
  view: { pos: [2.5, 17.5, 44], target: [2.5, 15.5, 0] },
  learn: `<p>Behind the wall, the outlet joins a wide upright pipe: the <b>soil stack</b>. Every toilet in the building empties into it. At the top it does not stop. It carries on above the roof as the <b>vent pipe</b>, open to the sky.</p>
    <p>The vent protects the water seals. Water falling down the stack drags air along with it. If air can follow from the roof, nothing much happens. If it cannot, the falling water <b>sucks</b> on every trap it passes and pulls their seals out. Plumbers call this <b>induced siphonage</b>. The vent also lets drain gas out high up, where it blows away.</p>
    <p>At the bottom there are three common endings. In a city, a <b>sewer</b> carries the flow to a treatment plant. Where there is no sewer, a <b>septic tank</b> holds it for a day or two: solids settle, bacteria that live without air digest them, and the clearer liquid drains into a soak pit. The tank needs emptying every year or two.</p>
    <p>The third is the <b>twin-pit pour-flush toilet</b>, widely used in rural India. Two lined pits share one pan. One pit is used for about <b>three years</b> while its liquid soaks away into the soil. Then the flow is switched to the second pit. The first <b>rests for about two years</b>, and its contents dry into a crumbly compost that can be dug out safely with a spade. The design was spread in India from 1970 by <b>Bindeshwar Pathak</b> and Sulabh International, to end the carrying away of raw waste by hand. That practice, called manual scavenging, was banned by Indian law in 1993 and again, more strictly, in 2013.</p>
    <p>A toilet with a safe ending still is not universal. The WHO and UNICEF count <b>3.4 billion</b> people without safely managed sanitation in 2024, including <b>354 million</b> with no toilet at all. India's Swachh Bharat Mission, begun on 2 October 2014, reports more than <b>100 million</b> household toilets built in rural India.</p>
    <p class="tip"><b>Try it:</b> flush upstairs and watch the seal downstairs. Then block the vent and flush again. Pick the twin pits and run the years forward.</p>`,
  terms: [
    { t: 'Soil stack', d: 'The upright pipe that carries flushes down through a building.' },
    { t: 'Vent pipe', d: 'The top of the stack, open above the roof. It lets air in and drain gas out.' },
    { t: 'Induced siphonage', d: 'Suction from water falling in the stack pulling the water out of a trap.' },
    { t: 'Septic tank', d: 'An underground tank where solids settle and are digested by bacteria without air.' },
    { t: 'Twin pit', d: 'Two leach pits used in turn, so one can rest and dry out while the other fills.' },
  ],
  defaults: { vent: true, dest: 'pit', year: 1.5 },
  controls: [
    { type: 'buttons', label: 'Upstairs', items: [{ label: 'Flush upstairs', act: (s, inst) => inst.flush() }, { label: 'Refill the seal downstairs', act: (s, inst) => inst.refill() }] },
    { key: 'vent', type: 'toggle', label: 'Vent pipe open', hint: 'Switch it off to block the vent.' },
    { key: 'dest', type: 'seg', label: 'At the bottom', options: [{ v: 'sewer', label: 'Sewer' }, { v: 'septic', label: 'Septic tank' }, { v: 'pit', label: 'Twin pits' }] },
    { key: 'year', type: 'range', label: 'Twin pits: years of use', min: 0, max: 9, step: 0.05, fmt: (v) => v.toFixed(1) + ' years' },
  ],
  quiz: [
    { q: 'What is the vent pipe at the top of a soil stack for?', options: ['To let rain into the drains', 'To let air in so falling water does not suck the traps dry, and to let drain gas out above the roof', 'To make the flush louder', 'To cool the pipes'], answer: 1, why: 'Air entering at the top keeps the pressure in the stack near normal, so the water seals stay put.' },
    { q: 'What happens in a septic tank?', options: ['The waste is burned', 'Solids settle and bacteria that need no air digest them', 'The water is boiled clean', 'Everything is pumped to the roof'], answer: 1, why: 'It is a settling tank. The liquid that leaves is clearer but not clean, so it goes to a soak pit or drain field.' },
    { q: 'Why does a twin-pit toilet have two pits?', options: ['One is a spare in case of floods', 'One is for water and one for solids', 'While one fills, the other rests until its contents dry out and are safe to remove', 'Two pits flush faster'], answer: 2, why: 'After about two years of rest the contents of the full pit have dried into compost, and the pits swap over.' },
  ],
  reel: [
    { ms: 6000, caption: 'A vent pipe lets air follow the falling water, so a flush upstairs cannot suck out the seal below.', set: { vent: true, dest: 'pit', year: 2 }, act: (s, inst) => { inst.refill(); inst.flush(0.8); }, view: { pos: [3.2, 15.5, 34], target: [3.2, 14.5, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = BASE; stage.root.add(root);
    const lower = makePan('wdP', { seat: false }), upper = makePan('wdP', { seat: false });
    lower.group.position.y = F1; upper.group.position.y = F2; root.add(lower.group, upper.group);
    const m = lower.m;
    const cu = makeCistern({ supply: false }), cl = makeCistern({ supply: false });
    for (const [c, y] of [[cu, F2], [cl, F1]]) { c.group.rotation.y = -Math.PI / 2; c.group.position.set(2.45, y + 4.1, 0); root.add(c.group); }
    const roof = box(11, 0.6, 3.4, M.matte(C.slab)); roof.position.set(-0.3, ROOF + 0.3, -1.7); roof.castShadow = false; root.add(roof);

    // Stack and vent, cut open.
    const pipeMat = M.plastic(C.pipe, { side: THREE.DoubleSide, roughness: 0.5 });
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, VTOP + 1.3, 24, 1, true, Math.PI / 2, Math.PI), pipeMat);
    stack.position.set(SX, (VTOP - 1.3) / 2, 0); root.add(stack);
    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 24, 1, true), pipeMat); cowl.position.set(SX, VTOP + 0.55, 0); root.add(cowl);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.3, 24), M.plastic(0xff5a4d)); cap.position.set(SX, VTOP - 0.1, 0); root.add(cap);
    for (const y of [F1, F2]) root.add(tube([[4.6, y + 2.31, 0], [5.0, y + 2.25, 0], [SX - 0.1, y + 1.95, 0]], 0.43, M.clear(0x9fb0c8, 0.3), false, 20));

    // Under the ground.
    const soil = new THREE.Mesh(new THREE.PlaneGeometry(24, 7.6), M.matte(0x3a3027)); soil.position.set(6.5, -3.8, -1.75); root.add(soil);
    const grass = box(12.5, 0.14, 1.7, M.matte(0x4f6b3e)); grass.position.set(11.2, -0.07, -0.9); grass.castShadow = false; root.add(grass);
    const glassPipe = M.clear(0xb9c6d8, 0.32);
    const D = { sewer: new THREE.Group(), septic: new THREE.Group(), pit: new THREE.Group() };
    Object.values(D).forEach((g) => root.add(g));
    const route = {
      sewer: [[SX, -1.3], [SX, -2.0], [6.3, -2.55], [13.2, -3.5]],
      septic: [[SX, -1.3], [SX, -1.9], [6.3, -2.2], [7.6, -2.3], [7.6, -2.9]],
    };
    const pipeOf = (pts, r = 0.42) => tube(pts.map(([x, y]) => [x, y, 0]), r, glassPipe, false, 40);
    // Sewer.
    D.sewer.add(pipeOf(route.sewer));
    const main = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.14, 10, 40), M.matte(0x8b95a5)); main.position.set(13.6, -4.4, -0.3); D.sewer.add(main);
    const mainW = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32, Math.PI, Math.PI), waterMat({ opacity: 0.55 })); mainW.position.set(13.6, -4.4, -0.3); D.sewer.add(mainW);
    const shaft = box(1.3, 2.9, 1.0, M.clear(0x9fb0c8, 0.16)); shaft.position.set(13.6, -1.55, -0.6); D.sewer.add(shaft);
    const lid = box(1.6, 0.14, 1.2, M.metal(0x6b7380)); lid.position.set(13.6, 0.02, -0.6); D.sewer.add(lid);
    // Septic tank: two chambers, a baffle, a soak pit.
    const conc = M.matte(0x7d8694);
    const T = { x0: 6.9, x1: 12.3, y0: -6.3, y1: -1.5, z: -1.5, wl: -2.5 };
    const wallB = (w, h, x, y, d = 1.5, z = T.z / 2) => { const b = box(w, h, d, conc); b.position.set(x, y, z); b.castShadow = false; D.septic.add(b); return b; };
    wallB(T.x1 - T.x0 + 0.4, 0.2, (T.x0 + T.x1) / 2, T.y0 - 0.1); wallB(0.2, T.y1 - T.y0, T.x0 - 0.1, (T.y0 + T.y1) / 2); wallB(0.2, T.y1 - T.y0, T.x1 + 0.1, (T.y0 + T.y1) / 2);
    wallB(T.x1 - T.x0 + 0.4, 0.2, (T.x0 + T.x1) / 2, T.y1 + 0.1); wallB(T.x1 - T.x0, T.y1 - T.y0, (T.x0 + T.x1) / 2, (T.y0 + T.y1) / 2, 0.1, T.z);
    wallB(0.16, 2.0, 10.4, -2.7); wallB(0.16, 1.1, 10.4, -5.75);
    const sw = box(T.x1 - T.x0, T.wl - T.y0, 1.4, waterMat({ opacity: 0.4 })); sw.position.set((T.x0 + T.x1) / 2, (T.wl + T.y0) / 2, T.z / 2); sw.castShadow = false; D.septic.add(sw);
    const sludge = box(10.4 - T.x0 - 0.1, 0.8, 1.38, M.matte(0x4b5563)); sludge.position.set((T.x0 + 10.4) / 2, T.y0 + 0.4, T.z / 2); D.septic.add(sludge);
    const sludge2 = box(T.x1 - 10.5, 0.3, 1.38, M.matte(0x4b5563)); sludge2.position.set((T.x1 + 10.5) / 2, T.y0 + 0.15, T.z / 2); D.septic.add(sludge2);
    const scum = box(10.3 - T.x0 - 0.9, 0.12, 1.38, M.matte(0x8f937c)); scum.position.set((T.x0 + 10.3) / 2 + 0.4, T.wl + 0.03, T.z / 2); D.septic.add(scum);
    D.septic.add(pipeOf(route.septic), pipeOf([[11.7, -3.1], [11.7, -2.6], [12.6, -2.7], [13.6, -2.9]], 0.3));
    const soak = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.2, 24, 1, true, Math.PI / 2, Math.PI), M.matte(0x8b7f6a, { side: THREE.DoubleSide })); soak.position.set(14.3, -4.0, 0); D.septic.add(soak);
    // Twin pits: a junction chamber and two honeycomb-lined pits.
    const brick = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#9a5b45'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#1c1612';
      for (let r = 0; r < 8; r++) for (let k = 0; k < 6; k++) g.fillRect(((k + (r % 2) * 0.5) * 256) / 6 - 6, r * 32 + 6, 12, 20);
      g.strokeStyle = '#6e3f2f'; g.lineWidth = 3; for (let r = 0; r <= 8; r++) { g.beginPath(); g.moveTo(0, r * 32); g.lineTo(256, r * 32); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1.6); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const PX = [9.2, 12.9], PR = 1.35, PY0 = -6.6, PY1 = -2.3;
    const fills = PX.map((x) => {
      const lining = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, PY1 - PY0, 28, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9, side: THREE.DoubleSide }));
      lining.position.set(x, (PY0 + PY1) / 2, 0); D.pit.add(lining);
      const cover = box(PR * 2 + 0.5, 0.18, 1.5, conc); cover.position.set(x, PY1 + 0.1, -0.75); cover.castShadow = false; D.pit.add(cover);
      const fm = M.matte(0x5b6472), f = new THREE.Mesh(new THREE.CylinderGeometry(PR - 0.06, PR - 0.06, 1, 28, 1, false, Math.PI / 2, Math.PI), fm); D.pit.add(f);
      return { f, fm, x };
    });
    const jx = 7.1, jy = -1.9;
    const jbox = box(1.0, 0.8, 0.9, M.clear(0x9fb0c8, 0.25)); jbox.position.set(jx, jy, -0.45); D.pit.add(jbox);
    route.pit = [[[SX, -1.3], [SX, -1.7], [6.2, -1.9], [jx, jy], [8.0, -2.15], [PX[0], -2.5], [PX[0], -3.2]], [[SX, -1.3], [SX, -1.7], [6.2, -1.9], [jx, jy], [9.0, -1.75], [11.8, -2.1], [PX[1], -2.5], [PX[1], -3.2]]];
    D.pit.add(pipeOf(route.pit[0].slice(0, 4)), pipeOf(route.pit[0].slice(3, 6), 0.3), pipeOf(route.pit[1].slice(3, 7), 0.3));
    const flap = box(0.7, 0.08, 0.5, M.plastic(0xffb547)); flap.position.set(jx + 0.2, jy, -0.3); D.pit.add(flap);

    // Simulations.
    const up = new FlushSim('wdP'), cs = new CisternSim(), trap = new TrapSim('wdP'), flow = makePanFlow(upper, 160);
    const N = 150, drops = swarm(N, new THREE.SphereGeometry(0.07, 6, 5), M.plastic(C.drop, { roughness: 0.15 })); drops.castShadow = false; drops.frustumCulled = false; root.add(drops);
    const NA = 40, air = swarm(NA, new THREE.SphereGeometry(0.05, 6, 5), M.glow(0xffffff, { transparent: true, opacity: 0.7 })); air.castShadow = false; air.frustumCulled = false; root.add(air);
    const NL = 26, leach = swarm(NL, new THREE.SphereGeometry(0.05, 6, 5), M.plastic(C.drop)); leach.castShadow = false; leach.frustumCulled = false; D.pit.add(leach);
    const Dp = Array.from({ length: N }, () => ({ k: 0 })), Ap = Array.from({ length: NA }, (_, i) => ({ y: VTOP - (i / NA) * (VTOP - F2 - 2), x: 0 }));
    const Lp = Array.from({ length: NL }, (_, i) => ({ a: (i * 2.399) % Math.PI, y: 0.15 + ((i * 0.618) % 1) * 0.8, r: (i * 0.37) % 1 }));
    let next = 0, acc = 0, seed = 3, time = 0, q = [], Qs = 0, p = 0, press = null, pressT = 0, wait = 0, pend = false;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const along = (pts, d, out) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= L) { out[0] = lerp(a[0], b[0], d / L); out[1] = lerp(a[1], b[1], d / L); return true; } d -= L; } return false; };

    const L = (t, pos, parent = root, cls = '') => stage.label(t, pos, parent, cls);
    L('Vent pipe, open above the roof', [SX + 0.2, VTOP + 1.5, 0]);
    const minor = [L('Soil stack', [SX + 2.0, 14.5, 0])];
    const lSeal = L('Water seal', [-2.4, F1 + m.yW + 0.5, 0.4], root, 'hot');
    const lBlock = L('Vent blocked', [SX + 2.2, VTOP - 0.3, 0], root, 'hot');
    L('Street sewer, to the treatment plant', [12.2, -6.3, 0], D.sewer); L('Septic tank', [9.6, -0.7, 0], D.septic);
    minor.push(L('Manhole', [13.6, 0.7, 0], D.sewer), L('Solids settle and are digested', [8.6, -6.9, 0], D.septic), L('Soak pit', [14.6, -1.6, 0], D.septic));
    const lA = L('Pit A', [PX[0] - 1.6, -7.3, 0], D.pit), lB = L('Pit B', [PX[1] + 1.8, -7.3, 0], D.pit);
    minor.push(L('Junction: sends the flow to one pit', [11.5, 1.0, 0], D.pit));

    const tmp = [0, 0];
    const api = {
      refill() { trap.refill(); },
      flush(hold = 0) { if (cs.lift > 0 || cs.level < cs.set - 0.3) return; wait = hold; pend = true; },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); time += dt;
        fitNarrow(stage, minor, -0.1);
        if (pend) { wait -= dt; if (wait <= 0) { pend = false; cs.flush(TANK.FULL); press = 'full'; pressT = 0.4; } }
        // Refill runs fast when nothing else is happening.
        const quiet = cs.lift === 0 && up.qout < 0.02 && Qs < 0.02;
        cs.step(dt * (quiet ? 6 : 1));
        up.step(dt, cs.toBowl);
        pressT -= dt; if (pressT <= 0) press = null;
        cu.set({ level: cs.level, lift: cs.lift, press, dt }); cl.set({ level: TANK.SET, dt });
        upper.setWater({ h1: up.h, h2: up.h2, stream: Math.max(up.fd, Math.min(1, up.qout / (m.At * 12))) });
        flow.update(dt, { rim: cs.toBowl, out: up.qout, h: up.h });
        // The flush reaches the lower branch a moment later.
        q.push([time, up.qout]); const delay = (F2 - F1) / FALL;
        while (q.length > 2 && q[1][0] <= time - delay) q.shift();
        Qs = q[0][0] <= time - delay ? q[0][1] : 0;
        p = s.vent ? -K_VENT * Qs * Qs : -Math.min(K_BLOCK * Qs * Qs, 560);
        trap.step(dt, p, 0);
        lower.setWater({ h1: trap.h1, h2: trap.h2 });
        cap.visible = lBlock.visible = !s.vent; lSeal.visible = trap.sealDepth > 0.03;
        // Water falling in the stack, then along to the ending.
        acc += up.qout * 45 * dt;
        while (acc >= 1) { acc -= 1; Object.assign(Dp[next], { k: 1, y: F2 + 1.9, side: rnd() < 0.5 ? -1 : 1, z: -rnd() * 0.3, d: 0 }); next = (next + 1) % N; }
        const st = pitState(s.year), active = st[0].mode === 'use' ? 0 : 1;
        const path = s.dest === 'pit' ? route.pit[active] : route[s.dest];
        Dp.forEach((d, i) => {
          if (d.k === 1) { d.y -= FALL * dt; if (d.y < -1.3) { d.k = 2; d.d = 0; } else drops.place(i, [SX + d.side * 0.36, d.y, d.z], null, 1); }
          if (d.k === 2) { d.d += 7 * dt; if (along(path, d.d, tmp)) drops.place(i, [tmp[0], tmp[1], d.z * 0.5], null, 1); else d.k = 0; }
          if (!d.k) drops.place(i, [0, -90, 0], null, 0.001);
        });
        drops.done();
        // Air drawn down the vent.
        const flowing = up.qout > 0.05 || Qs > 0.05;
        Ap.forEach((a, i) => {
          if (flowing && s.vent) { a.y -= 9 * dt; if (a.y < F2 + 2) a.y = VTOP + 0.2; }
          air.place(i, [SX + Math.sin(i * 2.1) * 0.25, a.y, -0.15], null, flowing && s.vent ? 1 : 0.001);
        });
        air.done();
        // Endings.
        for (const k in D) D[k].visible = k === s.dest;
        if (s.dest === 'pit') {
          fills.forEach((F, i) => {
            const k = st[i].fill; F.f.visible = k > 0.01; F.f.scale.y = Math.max(0.01, k * (PY1 - PY0 - 0.5)); F.f.position.set(F.x, PY0 + (k * (PY1 - PY0 - 0.5)) / 2, 0);
            F.fm.color.setHex(0x5b6472).lerp(new THREE.Color(0x9a7a45), st[i].mode === 'rest' ? clamp(st[i].t / REST_Y, 0, 1) : 0);
          });
          flap.rotation.z = active === 0 ? 0.5 : -0.5;
          const ax = PX[active], lvl = PY0 + st[active].fill * (PY1 - PY0 - 0.5);
          Lp.forEach((l, i) => {
            l.r = (l.r + dt * 0.25) % 1;
            const sgn = i % 2 ? 1 : -1, y = PY0 + l.y * Math.max(0.3, lvl - PY0);
            leach.place(i, [ax + sgn * (PR + 0.1 + l.r * 1.2), y - l.r * 0.5, -0.4 - 0.5 * ((i * 0.31) % 1)], null, st[active].fill > 0.03 ? 1 - l.r * 0.6 : 0.001);
          });
          leach.done();
          lA.element.textContent = `A: ${PIT_TEXT[st[0].mode]}`; lB.element.textContent = `B: ${PIT_TEXT[st[1].mode]}`;
        }
      },
      readout: (s) => {
        const seal = trap.sealDepth * 100, st = pitState(s.year);
        const pulled = trap.open < 0, low = seal < 45;
        const head = pulled ? '<span class="no">Seal pulled out downstairs</span>' : Qs > 0.05 || up.qout > 0.05 ? (s.vent ? 'Air follows the water down' : '<span class="no">No vent: suction builds</span>') : low ? '<span class="no">Downstairs seal is low</span>' : 'Quiet';
        const end = s.dest === 'sewer' ? '<div class="row"><span>Ending</span><b>sewer, then a treatment plant</b></div>'
          : s.dest === 'septic' ? '<div class="row"><span>Ending</span><b>septic tank: 1 to 2 days to settle</b></div>'
            : `<div class="row"><span>Pit A</span><b>${PIT_TEXT[st[0].mode]}${st[0].mode === 'use' ? ', ' + Math.round(st[0].fill * 100) + '% full' : st[0].mode === 'rest' ? ' ' + st[0].t.toFixed(1) + ' of 2 years' : ''}</b></div>
          <div class="row"><span>Pit B</span><b>${PIT_TEXT[st[1].mode]}${st[1].mode === 'use' ? ', ' + Math.round(st[1].fill * 100) + '% full' : st[1].mode === 'rest' ? ' ' + st[1].t.toFixed(1) + ' of 2 years' : ''}</b></div>`;
        return slim(`<div class="big">${head}</div>
          <div class="row"><span>Water falling in the stack</span><b>${Qs.toFixed(2)} L/s</b></div>
          <div class="row"><span>Pressure at the lower branch</span><b>${Math.round(p)} Pa</b></div>
          <div class="row"><span>Downstairs water seal</span><b>${seal.toFixed(0)} mm</b></div>
          ${end}`, 3);
      },
    };
    return api;
  },
};
