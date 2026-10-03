// Chapter 2: the water seal. The trap is a U-tube: the bowl is one arm, the trapway's up leg the
// other. Pressure in the drain shifts the two levels by Δh = p / (ρ g): 98 Pa for every 10 mm.
// A 50 mm seal (the minimum for a WC trap in IS 2556 Part 2, UK Approved Document H and, as 2 inches,
// the US plumbing codes) is beaten by about 490 Pa of suction, or a little more of back-pressure.
// Evaporation: guides for Indian conditions give two to four weeks for a 50 mm seal in summer
// (about 2 to 3.5 mm a day); the slider lets you set the rate.
import { THREE, M, canvasTexture, swarm, clamp } from '../kit.js';
import { makePan, TrapSim, PA_PER_DM, C, slim, fitNarrow } from '../commode.js';

const FLOOR = 1.2, DAYS_PER_S = 4, NG = 90;

export default {
  id: 'trap',
  short: 'The water seal',
  title: 'The trap: a plug made of water',
  subtitle: 'Fifty millimetres of water stand between your bathroom and the drain.',
  view: { pos: [-0.4, 5.2, 13.6], target: [-0.6, 4.5, 0] },
  learn: `<p>The soil pipe behind a commode leads to a sewer, a septic tank or a pit. The air in there smells, and it carries gases such as hydrogen sulphide and methane. Something has to stop it coming back up the pipe.</p>
    <p>That something is a little water. The <b>trap</b> is a U-shaped bend. Water fills it up to the <b>weir</b>, and the wall between bowl and trapway, the <b>dip</b>, reaches down into the water. Gas cannot get past without pushing the water out of the way. The height of water above the dip is the <b>seal depth</b>: at least <b>50 mm</b> for a commode in Indian, British and American rules.</p>
    <p>How strong is it? The two water surfaces behave like a <b>U-tube</b>. Push on one side and the levels shift until the difference in height balances the push: <b>about 98 pascals for every 10 mm</b>. So a 50 mm seal gives way at around 490 Pa, which is less than one two-hundredth of the air pressure around you. It is a gentle barrier, and it only has to stop gentle pushes. (<a href="https://glassbox.how/pressureclear/" target="_blank" rel="noopener">PressureClear</a> shows why depth sets pressure.)</p>
    <p>Two things beat it. <b>Suction</b> in the drain pulls water over the weir and away. And <b>evaporation</b>: a toilet left unused in a hot, dry month slowly loses its seal, and the bathroom starts to smell. The cure is one flush. The floor drain under a shower has the same kind of seal (see <a href="https://glassbox.how/showerclear/" target="_blank" rel="noopener">ShowerClear</a>).</p>
    <p class="tip"><b>Try it:</b> slide the drain pressure both ways and watch the two levels move apart. Then leave the toilet unused and count the days until the seal breaks.</p>`,
  terms: [
    { t: 'Trap', d: 'A bend in a drain pipe that stays full of water.' },
    { t: 'Seal depth', d: 'The height of water above the dip: how much must be lost before gas can pass.' },
    { t: 'Dip', d: 'The lowest edge of the wall between the bowl and the trapway.' },
    { t: 'Pascal (Pa)', d: 'The unit of pressure. 10 mm of water presses with about 98 Pa.' },
    { t: 'Sewer gas', d: 'The mix of gases from decaying waste in drains, including hydrogen sulphide and methane.' },
  ],
  defaults: { p: 0, away: false, evap: 2.5 },
  controls: [
    { key: 'p', type: 'range', label: 'Pressure in the drain', min: -700, max: 700, step: 10, ends: ['suction', 'back-pressure'], fmt: (v) => (v > 0 ? '+' : '') + Math.round(v) + ' Pa' },
    { key: 'away', type: 'toggle', label: 'Leave it unused (time-lapse)', hint: 'Four days pass each second.' },
    { key: 'evap', type: 'range', label: 'Evaporation', min: 0.5, max: 4, step: 0.1, ends: ['cool, damp', 'hot, dry'], fmt: (v) => v.toFixed(1) + ' mm a day' },
    { type: 'buttons', label: 'Put it right', items: [{ label: 'Flush to refill the seal', act: (s, inst) => { s.p = 0; s.away = false; inst.refill(); } }] },
  ],
  quiz: [
    { q: 'What stops drain gas coming up through a commode?', options: ['A one-way flap', 'Water held in the bend of the trap', 'The weight of the seat lid', 'A filter in the soil pipe'], answer: 1, why: 'The trap holds water, and the dip reaches down into it, so gas would have to push the water aside to pass.' },
    { q: 'About how much pressure does it take to beat a 50 mm water seal?', options: ['5 Pa', '490 Pa', '49,000 Pa', '101,000 Pa'], answer: 1, why: 'Pressure = ρ g h = 1,000 × 9.81 × 0.05 ≈ 490 Pa. Normal air pressure is about 200 times bigger.' },
    { q: 'A guest bathroom nobody has used for a month smells of drains. What is the likely cause, and the cure?', options: ['The seat is loose: tighten it', 'The trap water has evaporated: flush to refill it', 'The cistern is too full: lower the float', 'The pipe is blocked: call a plumber'], answer: 1, why: 'With no flushes to top it up, the seal slowly evaporates. One flush puts the water back.' },
  ],
  reel: [
    { ms: 5600, caption: 'The bend behind the bowl stays full of water, and that water blocks the gas from the drain.', set: { away: false, p: 0 }, act: (s, inst) => inst.refill(), anim: { p: [0, 430] }, view: { pos: [1.4, 4.3, 9.6], target: [1.2, 3.7, 0] }, spin: 0 },
    { ms: 5600, caption: 'Leave a toilet unused for weeks and the seal evaporates: one flush brings it back.', set: { p: 0, away: true, evap: 3.5 }, act: (s, inst) => inst.refill(), view: { pos: [0.6, 4.4, 10.4], target: [0.9, 3.8, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = FLOOR; stage.root.add(root);
    const pan = makePan('wdP', { seat: false }), m = pan.m;
    root.add(pan.group);
    const sim = new TrapSim('wdP');
    let days = 0, hist = [];

    // The soil stack behind the wall, cut open.
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 9.6, 24, 1, true, Math.PI / 2, Math.PI), M.plastic(C.pipe, { side: THREE.DoubleSide, roughness: 0.5 }));
    stack.position.set(5.5, 3.6, 0); root.add(stack);

    // Drain gas: dots that wander along the trapway from the stack, stopped by the water surface.
    const gas = swarm(NG, new THREE.SphereGeometry(0.05, 6, 5), M.glow(C.gas)); gas.castShadow = false; gas.frustumCulled = false; root.add(gas);
    let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const sEnd = m.L + 0.4;
    const Gp = Array.from({ length: NG }, () => ({ mode: 0, s: m.L - rnd() * 1.5, lat: rnd() * 0.8 - 0.4, z: -rnd() * 0.3, x: 0, y: 0 }));
    const v = new THREE.Vector3();

    // A chart of seal depth against days unused.
    const chart = canvasTexture(560, 300, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      const x0 = 74, y0 = h - 46, cw = w - 104, ch = h - 104;
      g.fillStyle = '#e8eef8'; g.font = 'bold 24px sans-serif'; g.fillText('Seal depth while unused', 20, 34);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '18px sans-serif';
      for (const mm of [0, 25, 50]) { const y = y0 - (ch * mm) / 50; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + cw, y); g.stroke(); g.fillText(mm + ' mm', 8, y + 6); }
      for (const d of [0, 20, 40, 60]) g.fillText(d + (d === 60 ? ' days' : ''), x0 + (cw * d) / 60 - 8, y0 + 28);
      if (hist.length > 1) { g.strokeStyle = '#8ef0ff'; g.lineWidth = 5; g.beginPath(); hist.forEach(([d, mm], i) => { const x = x0 + (cw * Math.min(d, 60)) / 60, y = y0 - (ch * mm) / 50; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
      const last = hist.at(-1);
      if (last) { g.fillStyle = last[1] > 0.5 ? '#8ef0ff' : '#ff7a59'; g.beginPath(); g.arc(x0 + (cw * Math.min(last[0], 60)) / 60, y0 - (ch * last[1]) / 50, 9, 0, 7); g.fill(); }
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.3), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(2.2, 7.3, -0.4); root.add(board);

    stage.label('Weir', [3.0, m.yW + 0.95, 0.3], root);
    stage.label('Dip', [0.75, m.yD - 0.42, 0.3], root);
    const lSeal = stage.label('Water seal', [-1.9, m.yW + 0.35, 0.3], root, 'hot');
    const minor = [stage.label('Drain gas', [4.3, 3.35, 0.3], root), stage.label('Soil stack', [5.6, 7.6, 0.3], root)];
    const lOpen = stage.label('Gas gets through', [0.2, 4.5, 0.3], root, 'hot');

    let drawn = -1;
    const api = {
      refill() { sim.refill(); days = 0; drawn = -1; hist = [[0, sim.sealDepth * 100]]; chart.redraw(); },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05));
        fitNarrow(stage, minor);
        let evap = 0;
        if (s.away && days < 60) { const dd = DAYS_PER_S * dt; days += dd; evap = (s.evap / 100) * dd; }
        sim.step(dt, s.p, evap);
        pan.setWater({ h1: sim.h1, h2: sim.h2 });
        if (s.away && Math.floor(days * 2) !== drawn) { drawn = Math.floor(days * 2); hist.push([days, sim.sealDepth * 100]); if (hist.length > 400) hist.shift(); chart.redraw(); }
        const gasIn = sim.open > 0 || (sim.sealDepth <= 0.002 && s.p >= 0);
        lOpen.visible = gasIn; lSeal.visible = sim.sealDepth > 0.03;
        // Where the up-leg water surface blocks the gas.
        let iS = m.iDip; for (let i = m.iCrown; i > m.iDip; i--) if (m.P[i].y - m.D * 0.3 <= sim.h2) { iS = i; break; }
        const sBlock = iS * m.ds + 0.15;
        Gp.forEach((p, i) => {
          if (p.mode === 0) {
            p.s += ((rnd() - 0.5) * 5 + (gasIn ? -2.2 : s.p < -20 ? 1.5 : -0.25)) * dt;
            if (p.s < sBlock && !gasIn) p.s = sBlock + rnd() * 0.2;
            if (p.s > sEnd) p.s = sEnd - rnd() * 0.3;
            if (p.s < 0) { p.mode = 1; p.x = m.P[0].x - 0.2; p.y = m.P[0].y; }
            else m.point(p.s, p.lat, v).setZ(p.z);
          }
          if (p.mode === 1) {
            p.y += (1.6 + rnd()) * dt; p.x += (rnd() - 0.55) * 3 * dt;
            const r = m.at(Math.min(p.y, m.yRim)); p.x = clamp(p.x, r[1] + 0.1, r[2] - 0.1);
            if (p.y > m.yRim + 1.6 || (!gasIn && p.y < sim.h1)) { p.mode = 0; p.s = sEnd - rnd(); }
            v.set(p.x, p.y, p.z);
          }
          gas.place(i, [v.x, v.y, v.z], null, 1);
        });
        gas.done();
      },
      readout: (s) => {
        const seal = sim.sealDepth * 100, A1 = m.area(sim.h1), holds = sim.sealDepth * PA_PER_DM * (1 + (m.At * 1.3) / A1);
        const gasIn = sim.open > 0 || (seal <= 0.2 && s.p >= 0), pulled = sim.open < 0;
        const head = gasIn ? '<span class="no">Seal broken: drain gas gets in</span>' : pulled ? '<span class="no">Seal pulled out: air is sucked through</span>' : seal < 15 ? 'Seal nearly gone' : 'Seal holding';
        return slim(`<div class="big">${head}</div>
          <div class="row"><span>Seal depth</span><b>${seal.toFixed(0)} mm</b></div>
          <div class="row"><span>Holds back up to</span><b>${Math.round(holds)} Pa</b></div>
          <div class="row"><span>Pressure in the drain</span><b>${s.p > 0 ? '+' : ''}${Math.round(s.p)} Pa = ${Math.abs(s.p / 9.81).toFixed(0)} mm of water</b></div>
          <div class="row"><span>Bowl level against the weir</span><b>${((sim.h1 - m.yW) * 100).toFixed(0)} mm</b></div>
          <div class="row"><span>Days unused</span><b>${days.toFixed(0)}</b></div>`, 3);
      },
    };
    api.refill();
    return api;
  },
};
