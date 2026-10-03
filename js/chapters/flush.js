// Chapter 3: the flush, simulated for two designs.
// Wash-down (India, Europe): a wide, short trapway. The flush raises the bowl and the water pours
// over the weir, about as fast as it arrives. The outlet never runs full.
// Siphonic (North America): a narrow trapway (about 54 mm) with a long down leg. Once the flow over
// the weir fills that leg, bowl and outlet are joined by solid water and the siphon pulls the bowl
// down below the weir until air gets under the dip.
// All levels and flows come from FlushSim and CisternSim in commode.js (weir, orifice and
// siphon formulas with typical coefficients). Nothing here is keyframed.
import { THREE, canvasTexture, clamp } from '../kit.js';
import { makePan, makeCistern, makePanFlow, makeBalls, makeBucket, FlushSim, CisternSim, TANK, slim, fitNarrow, inReel } from '../commode.js';

const FLOOR = 1.2;
const BUCKET_L = 7, TAIL_L = 1.5, TAIL_Q = 0.4;      // a 7 L bucket; the last 1.5 L dribbles out
const REFILL_Q = 0.05;                              // L/s down the refill tube to the bowl while the fill valve is open (siphonic pans)

export default {
  id: 'flush',
  short: 'The flush',
  title: 'The flush: a push or a pull',
  subtitle: 'Wash-down pans push the water over the weir. Siphonic pans pull the bowl empty.',
  view: { pos: [2.4, 6.0, 18.5], target: [2.4, 5.4, 0] },
  learn: `<p>At rest, the bowl is level with the <b>weir</b>. Add a cupful and a cupful spills over. So how does a flush clear the bowl? It depends on <b>how fast</b> the water arrives.</p>
    <p><b>Wash-down</b> pans are the usual kind in India and Europe. The trapway is wide and short. The cistern dumps its water in a few seconds, the bowl rises, and the rush <b>pushes</b> everything over the weir. The outlet never runs full, so nothing sucks.</p>
    <p><b>Siphonic</b> pans are the usual kind in North America. The trapway is narrower and has a long down leg. When enough water pours over the weir, that leg <b>fills completely</b>. Now a solid column of water joins the bowl to the outlet, and the falling column <b>pulls</b> the bowl down, well below the weir. That is a <b>siphon</b>. It stops only when the level reaches the dip and <b>air</b> gets in, with a gurgle. A thin refill tube from the cistern then tops the seal back up.</p>
    <p>The little yellow balls are <b>test balls</b>. Makers flush plastic balls like these to check a pan. They float, so slow water just leaves them bobbing.</p>
    <p>This is also why a <b>bucket</b> flushes a toilet when the cistern is empty, as long as you pour it <b>fast</b>. Trickle the same water in and it only creeps over the weir.</p>
    <p class="tip"><b>Try it:</b> flush both designs and watch the chart. Then set the bucket to a slow pour and try again. How slow can you go and still clear the balls?</p>`,
  terms: [
    { t: 'Wash-down', d: 'A pan cleared by the push of the flush water. Wide, short trapway.' },
    { t: 'Siphonic', d: 'A pan cleared by a siphon that forms in its narrow trapway and sucks the bowl down.' },
    { t: 'Siphon', d: 'A full pipe that goes up and over, then down further. The longer falling side pulls water through.' },
    { t: 'Priming', d: 'Filling the down leg with water so the siphon starts.' },
    { t: 'Trapway', d: 'The passage from the bowl, over the weir, to the outlet.' },
  ],
  defaults: { design: 'wdP', pour: 2.5, slow: false },
  controls: [
    { key: 'design', type: 'seg', label: 'Pan design', options: [{ v: 'wdP', label: 'Wash-down' }, { v: 'siph', label: 'Siphonic' }] },
    { type: 'buttons', label: 'Flush from the cistern', items: [{ label: 'Full flush', act: (s, inst) => inst.flush(TANK.FULL) }, { label: 'Half flush', act: (s, inst) => inst.flush(TANK.HALF) }] },
    { key: 'pour', type: 'range', label: 'Bucket pour speed', min: 0.1, max: 3, step: 0.05, ends: ['a trickle', 'all at once'], fmt: (v) => v.toFixed(2) + ' L/s' },
    { type: 'buttons', label: 'Flush with a bucket', items: [{ label: 'Pour a 7 L bucket', act: (s, inst) => inst.pour() }, { label: 'Put the test balls back', act: (s, inst) => inst.resetBalls() }] },
    { key: 'slow', type: 'toggle', label: 'Slow motion (¼ speed)' },
  ],
  quiz: [
    { q: 'What starts the siphon in a siphonic pan?', options: ['A pump in the base', 'The down leg of the trapway filling completely with water', 'Air blown in from the cistern', 'The seat lid closing'], answer: 1, why: 'Once the falling leg runs full, the column of water in it pulls the bowl water over the weir after it.' },
    { q: 'What stops the siphon?', options: ['The cistern runs out', 'A valve closes in the trap', 'The bowl level drops to the dip and air gets into the trapway', 'The water gets too cold'], answer: 2, why: 'Air breaks the solid column of water, and the pull is gone. That is the gurgle at the end.' },
    { q: 'Why does a bucket poured slowly not flush the pan?', options: ['The water is too warm', 'It only spills gently over the weir: no push, and the trapway never fills', 'Buckets hold too little', 'The trap closes when it senses a bucket'], answer: 1, why: 'Slow water just overflows the weir at the same slow rate. It takes a fast pour to make a strong push or to prime a siphon.' },
  ],
  reel: [
    { ms: 6200, caption: 'A wash-down pan dumps its water in seconds and pushes the bowl’s contents over the weir.', set: { design: 'wdP', slow: false }, act: (s, inst) => { inst.reset(); inst.flush(TANK.FULL, 0.9); }, view: { pos: [1.2, 5.4, 13.2], target: [1.2, 4.6, 0] }, spin: 0 },
    { ms: 6600, caption: 'A siphonic pan fills its narrow trapway, and the falling water sucks the bowl empty.', set: { design: 'siph', slow: false }, act: (s, inst) => { inst.reset(); inst.flush(TANK.FULL, 0.9); }, view: { pos: [1.2, 5.4, 13.2], target: [1.2, 4.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = FLOOR; stage.root.add(root);
    const U = {};
    for (const k of ['wdP', 'siph']) {
      const pan = makePan(k, { seat: false, wall: false });
      root.add(pan.group);
      U[k] = { pan, m: pan.m, sim: new FlushSim(k), flow: makePanFlow(pan), balls: makeBalls(pan, 8) };
    }
    const cist = makeCistern({ supply: false });
    cist.group.rotation.y = -Math.PI / 2; cist.group.position.set(2.45, 4.1, 0); root.add(cist.group);
    const cs = new CisternSim();
    const bk = new THREE.Group(), bucket = makeBucket(0.95, 1.9); bk.scale.x = -1; bk.add(bucket); root.add(bk);
    bk.position.set(-1.7, 5.5, 0.2);

    // Chart: flow in, flow out and bowl level over the last 14 seconds.
    const SPAN = 14; let hist = [], simT = 0;
    const chart = canvasTexture(640, 380, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      const x0 = 56, y0 = h - 44, cw = w - 80, ch = h - 118;
      g.font = 'bold 22px sans-serif';
      g.fillStyle = '#8ef0ff'; g.fillText('In', 20, 32); g.fillStyle = '#ff7a59'; g.fillText('Out through the trap', 70, 32); g.fillStyle = '#5ce1a9'; g.fillText('Bowl level', 330, 32);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '18px sans-serif';
      for (let q = 0; q <= 3; q++) { const y = y0 - (ch * q) / 3; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + cw, y); g.stroke(); g.fillText(q + (q === 3 ? ' L/s' : ''), 10, y + 6); }
      g.fillText(SPAN + ' seconds', x0 + cw - 96, y0 + 30);
      const t1 = Math.max(SPAN, simT), X = (t) => x0 + cw * (1 - (t1 - t) / SPAN);
      const line = (k, col, f) => { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); hist.forEach((p, i) => { const x = X(p[0]), y = y0 - ch * clamp(f(p[k]), 0, 1.12); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
      // Bowl level: weir at one third height, shown ±12 cm.
      g.setLineDash([6, 6]); g.strokeStyle = 'rgba(92,225,169,.5)'; g.beginPath(); g.moveTo(x0, y0 - ch * 0.5); g.lineTo(x0 + cw, y0 - ch * 0.5); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(92,225,169,.8)'; g.fillText('weir', x0 + 6, y0 - ch * 0.5 - 6);
      if (hist.length > 1) { line(3, '#5ce1a9', (v) => 0.5 + v / 2.4); line(1, '#8ef0ff', (v) => v / 3); line(2, '#ff7a59', (v) => v / 3); }
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.2), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(7.4, 5.0, -0.6); root.add(board);
    if (inReel()) { board.position.set(1.2, 12.0, -0.6); board.scale.setScalar(1.55); }

    const lab = {};
    for (const k of ['wdP', 'siph']) {
      const m = U[k].m, g = U[k].pan.group;
      lab[k] = [stage.label('Weir', [m.P[m.iCrown].x + 0.1, m.yW + 0.95, 0.3], g), stage.label('Dip', [0.72, m.yD - 0.45, 0.3], g)];
    }
    const lSiphon = stage.label('Siphon running', [4.0, 1.4, 0.4], U.siph.pan.group, 'hot');
    const lAir = stage.label('Air breaks the siphon', [-1.4, 1.0, 0.4], U.siph.pan.group, 'hot');
    const minor = [stage.label('Test balls', [-2.6, 3.3, 0.5], root)];

    let pourLeft = 0, pouring = false, tilt = 0, press = null, pressT = 0, cur = 'wdP', acc = 0, usedBucket = 0, wasPrimed = false, speedShown = 1, lastDraw = 0, qNow = 0, pend = null;
    const api = {
      reset() { for (const k in U) { U[k].sim.reset(); U[k].balls.reset(); } cs.level = cs.set; cs.lift = 0; cs.filling = false; pourLeft = 0; pouring = false; hist = []; simT = 0; lastDraw = 0; usedBucket = 0; pend = null; },
      resetBalls() { U[cur].balls.reset(); },
      flush(litres, hold = 0.35) { pend = { litres, hold }; },
      pour() { if (pouring) return; pourLeft = BUCKET_L; pouring = true; usedBucket = 0; },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05));
        fitNarrow(stage, minor);
        if (s.design !== cur) { cur = s.design; const keep = pend; api.reset(); pend = keep; }
        if (pend) { const { litres, hold } = pend; pend = null; if (cs.lift === 0 && cs.level >= cs.set - 0.3) { cs.flush(litres); press = litres > 4 ? 'full' : 'half'; pressT = hold; } }
        const u = U[cur], { sim, m } = u;
        for (const k in U) U[k].pan.group.visible = k === cur;
        lab.wdP.concat(lab.siph).forEach((l) => { l.visible = l.parent.visible; });
        // Quiet refill runs faster so you are not kept waiting.
        const busy = cs.lift > 0 || pouring || sim.qout > 0.02 || sim.primed;
        const k = s.slow ? 0.25 : busy ? 1 : cs.filling ? 6 : 1;
        speedShown = k;
        const h = dt * k; simT += h;
        // Bucket.
        let qp = 0;
        if (pouring) { qp = pourLeft > TAIL_L ? s.pour : Math.min(s.pour, TAIL_Q); qp = Math.min(qp, pourLeft / h); pourLeft -= qp * h; usedBucket += qp * h; if (pourLeft <= 1e-4) pouring = false; }
        tilt += ((pouring ? 1.15 : 0) - tilt) * Math.min(1, dt * 6);
        bucket.rotation.z = tilt; bucket.setFill(pourLeft / BUCKET_L); bk.visible = pouring || tilt > 0.03;
        // Cistern, then bowl.
        cs.step(h);
        const refill = cur === 'siph' && cs.qFill > 0 ? REFILL_Q : 0;
        const qin = cs.toBowl + refill + qp;
        sim.step(h, qin, (m.spec.jet || 0) * cs.qFlush);
        if (wasPrimed && !sim.primed) u.flow.bubbles(16);
        wasPrimed = sim.primed;
        // Draw.
        u.pan.setWater({ h1: sim.h, h2: sim.h2, primed: sim.primed, stream: Math.max(sim.fd, Math.min(1, sim.qout / (m.At * 12))) });
        u.flow.update(h, { rim: cs.toBowl + refill, out: sim.qout, primed: sim.primed, h: sim.h, pour: pouring && tilt > 0.6 ? { from: [bk.position.x + 0.1, bk.position.y - 0.05, bk.position.z], q: qp, vx: 2 + qp } : null });
        u.balls.update(h, sim, cs.toBowl + qp);
        pressT -= dt; if (pressT <= 0) press = null;
        cist.set({ level: cs.level, lift: cs.lift, press, dt });
        lSiphon.visible = cur === 'siph' && sim.primed; lAir.visible = cur === 'siph' && sim.broke > 0;
        acc += h;
        if (acc > 0.05) { acc = 0; hist.push([simT, qin, sim.qout, sim.h - m.yW]); while (hist.length && hist[0][0] < simT - SPAN) hist.shift(); }
        if (simT - lastDraw > 0.08 || simT < lastDraw) { lastDraw = simT; chart.redraw(); }
        qNow = qin;
      },
      readout: () => {
        const u = U[cur], { sim, m } = u, H = (sim.h - m.yW) * 100;
        const state = sim.primed ? 'Siphon running' : sim.broke > 0 ? 'Air breaks the siphon' : sim.qout > 0.05 ? (cur === 'siph' ? 'Filling the down leg' : 'Pushing over the weir') : cs.filling ? `Refilling${speedShown > 1 ? ' (6× faster)' : ''}` : sim.sealDepth < m.seal - 0.1 ? 'Seal is low: add water' : 'Ready';
        return slim(`<div class="big">${state}</div>
          <div class="row"><span>Into the bowl</span><b>${qNow.toFixed(2)} L/s</b></div>
          <div class="row"><span>Out through the trap</span><b>${sim.qout.toFixed(2)} L/s</b></div>
          <div class="row"><span>Test balls cleared</span><b>${u.balls.cleared} of ${u.balls.B.length}</b></div>
          <div class="row"><span>Bowl level against the weir</span><b>${H >= 0 ? '+' : ''}${H.toFixed(0)} mm</b></div>
          <div class="row"><span>Outlet leg filled</span><b>${Math.round((sim.primed ? 1 : sim.fd) * 100)}%</b></div>`, 3);
      },
    };
    return api;
  },
};
