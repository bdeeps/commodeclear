// Chapter 5: the Indian (squat) pan and the pour-flush, and how much water a flush takes.
// The pan here is the rural pour-flush design promoted by Sulabh: a steep floor (25 to 28 degrees),
// a shallow 20 mm water seal and 1.5 to 2 litres a flush (sulabhinternational.org, twin-pit page).
// Cistern volumes: IS 774:2022 lists 10 L single flush and 6/3 L dual flush.
// The pour and the trap are simulated by FlushSim; the test balls by makeBalls (commode.js).
import { THREE, canvasTexture } from '../kit.js';
import { makePan, makePanFlow, makeBalls, makeBucket, FlushSim, slim, fitNarrow, inReel } from '../commode.js';

const FLOOR = 5.0;
const RATE = { fast: 3, slow: 0.15 };            // L/s: a mug thrown in at once (2 L in under a second), or dribbled
const USES = 5;                                  // flushes a person a day: an assumption for the sum, not a measurement
const KINDS = [['Older cistern', 10], ['Full flush', 6], ['Half flush', 3]];

export default {
  id: 'pans',
  short: 'Indian and Western pans',
  title: 'Indian pan, Western pan, same trap',
  subtitle: 'Two postures, one idea. And a mug of water can do the work of a cistern.',
  view: { pos: [-1.6, 6.4, 15.5], target: [-1.6, 4.8, 0] },
  learn: `<p>The <b>Indian pan</b> is set in the floor and used squatting. The <b>Western commode</b> is a seat. Underneath, they are the same machine: a smooth ceramic bowl leading to a <b>trap</b> that holds a water seal. The <b>Anglo-Indian</b> pan is a commode with a wide flat rim, so it can be used either way.</p>
    <p>Many Indian pans are flushed by hand, with a mug or a small bucket. This is the <b>pour-flush</b>. The pan is made for it: the floor is <b>steep</b> (about 25 to 28 degrees) and glazed, and the water seal is shallow, about <b>20 mm</b>. So <b>1.5 to 2 litres</b>, tipped in quickly, is enough. A cistern flush uses 3 to 6 litres, and older cisterns used 10 or more.</p>
    <p>That difference adds up. In a home with a flush toilet, flushing is often the biggest single use of water indoors: nearly <b>30%</b> in the average American home, says the US Environmental Protection Agency.</p>
    <p>Both pans are <b>vitreous china</b>: clay fired at about 1,200 to 1,300 °C until it is glassy right through, then glazed. It soaks up almost no water, so it does not stain or hold smells.</p>
    <p>For washing, many bathrooms in South Asia, Southeast Asia and the Middle East have a <b>health faucet</b>: a small trigger spray on a hose beside the pan. Its valve works like the ones in <a href="https://glassbox.how/tapclear/" target="_blank" rel="noopener">TapClear</a>. Others use a mug of water, a bidet or toilet paper. These are habits, and each does the job.</p>
    <p class="tip"><b>Try it:</b> pour 2 litres in fast and watch the test balls go. Then dribble the same 2 litres in slowly. Find the smallest pour that still clears the pan.</p>`,
  terms: [
    { t: 'Indian pan', d: 'A squatting pan set level with the floor, with footrests on either side.' },
    { t: 'Pour-flush', d: 'Flushing by tipping in water from a mug or bucket. No cistern needed.' },
    { t: 'Vitreous china', d: 'Clay fired until glassy, so it absorbs almost no water, then glazed.' },
    { t: 'Health faucet', d: 'A hand-held trigger spray on a hose beside the pan, used for washing.' },
    { t: 'Anglo-Indian pan', d: 'A commode with a wide rim that can be sat on or squatted on.' },
  ],
  defaults: { litres: 2, how: 'fast', people: 5 },
  controls: [
    { key: 'litres', type: 'range', label: 'Water in the mug', min: 0.5, max: 4, step: 0.1, fmt: (v) => v.toFixed(1) + ' L' },
    { key: 'how', type: 'seg', label: 'How you pour', options: [{ v: 'fast', label: 'All at once' }, { v: 'slow', label: 'A slow dribble' }] },
    { type: 'buttons', label: 'Pour-flush', items: [{ label: 'Pour', act: (s, inst) => inst.pour(s) }, { label: 'Put the test balls back', act: (s, inst) => inst.resetBalls() }] },
    { key: 'people', type: 'range', label: 'People in the home', min: 1, max: 8, step: 1, fmt: (v) => String(v) },
  ],
  quiz: [
    { q: 'What do an Indian pan and a Western commode have in common?', options: ['Both need a cistern', 'Both lead to a trap that holds a water seal', 'Both have a seat', 'Both use a siphon'], answer: 1, why: 'The posture differs, but both drain through a bend that stays full of water to block drain gas.' },
    { q: 'Why can a pour-flush pan work with only 1.5 to 2 litres?', options: ['It has a pump underneath', 'Its floor is steep and smooth and its water seal is shallow', 'The water is poured in hot', 'It has no trap at all'], answer: 1, why: 'A steep glazed slope and a 20 mm seal need much less water to carry things through than a deep bowl with a 50 mm seal.' },
    { q: 'A family of five flushes five times each a day. About how much water do they save in a day by using a 3 litre half flush instead of a 10 litre cistern?', options: ['7 litres', '35 litres', '175 litres', '1,750 litres'], answer: 2, why: '25 flushes × (10 − 3) litres = 175 litres every day.' },
  ],
  reel: [
    { ms: 5800, caption: 'An Indian pan has the same water-seal trap, and a quick mug of water flushes it.', set: { litres: 2, how: 'fast' }, act: (s, inst) => { inst.reset(); inst.pour(s, 0.7); }, view: { pos: [0.6, 4.6, 11.6], target: [0.6, 3.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = FLOOR; stage.root.add(root);
    const pan = makePan('indian', { seat: false }), m = pan.m; root.add(pan.group);
    const sim = new FlushSim('indian'), flow = makePanFlow(pan, 220), balls = makeBalls(pan, 5);
    const mk = new THREE.Group(), mug = makeBucket(0.6, 1.25, 0xd9534f); mk.scale.x = -1; mk.add(mug); mk.position.set(-1.7, 1.7, 0.15); root.add(mk);

    let poured = 2, cur = { litres: 2, people: 5 };
    const chart = canvasTexture(640, 400, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 26px sans-serif'; g.fillText('Litres for one flush', 22, 38);
      const rows = [...KINDS, ['Your pour', cur.litres]], x0 = 196, bw = w - x0 - 96;
      rows.forEach(([name, L], i) => {
        const y = 70 + i * 62, mine = i === rows.length - 1;
        g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '22px sans-serif'; g.fillText(name, 22, y + 28);
        g.fillStyle = mine ? '#ff7a59' : '#3f8cff'; g.fillRect(x0, y, (bw * L) / 10, 38);
        g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.fillText((mine ? L.toFixed(1) : L) + ' L', x0 + (bw * L) / 10 + 10, y + 28);
      });
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
      g.fillText(`${cur.people} people × ${USES} flushes a day:`, 22, h - 52);
      g.fillStyle = '#8ef0ff'; g.font = 'bold 21px sans-serif';
      g.fillText(rows.map(([n, L]) => Math.round(L * cur.people * USES) + ' L').join('   ·   '), 22, h - 22);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.0), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(-3.6, -3.0, -0.6); root.add(board);
    if (inReel()) { board.position.set(0.6, 4.6, -0.6); board.scale.setScalar(1.6); }

    const minor = [stage.label('Footrest', [-0.6, 0.55, -1.85], root)];
    stage.label('Steep, glazed pan', [-1.3, -0.55, 0.4], root);
    stage.label('Water seal, 20 mm', [0.2, m.yW - 0.55, 0.4], root, 'hot');
    stage.label('Trap', [2.0, -3.75, 0.4], root);
    minor.push(stage.label('To the pit, septic tank or sewer', [3.8, -4.65, 0.4], root), stage.label('Floor', [4.4, 0.35, 0], root));

    let left = 0, pouring = false, tilt = 0, rate = RATE.fast, hold = 0;
    const api = {
      reset() { sim.reset(); balls.reset(); left = 0; pouring = false; },
      resetBalls() { balls.reset(); },
      pour(s, wait = 0) { if (pouring) return; left = s.litres; poured = s.litres; rate = RATE[s.how]; pouring = true; hold = wait; },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05));
        fitNarrow(stage, minor);
        let qp = 0;
        if (pouring && hold > 0) hold -= dt;
        else if (pouring) { qp = Math.min(rate, left / dt); left -= qp * dt; if (left <= 1e-4) pouring = false; }
        tilt += ((pouring ? 1.2 : 0) - tilt) * Math.min(1, dt * 7);
        mug.rotation.z = tilt; mk.position.set(-3.7 + 2.0 * Math.min(1, tilt / 0.6), 1.27 + 0.45 * Math.min(1, tilt / 0.6), 0.15); mug.setFill(pouring ? left / Math.max(0.1, poured) : 1);
        sim.step(dt, qp);
        pan.setWater({ h1: sim.h, h2: sim.h2, primed: sim.primed, stream: Math.max(sim.fd, Math.min(1, sim.qout / (m.At * 12))) });
        flow.update(dt, { rim: 0, out: sim.qout, primed: sim.primed, h: sim.h, pour: qp > 0 && tilt > 0.6 ? { from: [mk.position.x + 0.1, mk.position.y - 0.05, mk.position.z], q: qp, vx: 1.5 + qp } : null });
        balls.update(dt, sim, qp, 20);
        if (cur.litres !== s.litres || cur.people !== s.people) { cur = { litres: s.litres, people: s.people }; chart.redraw(); }
      },
      readout: (s) => {
        const day = (L) => Math.round(L * s.people * USES);
        return slim(`<div class="big">${pouring ? 'Pouring' : sim.qout > 0.05 ? 'Running through the trap' : 'Ready'}</div>
          <div class="row"><span>Pour</span><b>${s.litres.toFixed(1)} L at ${RATE[s.how]} L/s</b></div>
          <div class="row"><span>Out through the trap</span><b>${sim.qout.toFixed(2)} L/s</b></div>
          <div class="row"><span>Test balls cleared</span><b>${balls.cleared} of ${balls.B.length}</b></div>
          <div class="row"><span>Water seal</span><b>${(sim.sealDepth * 100).toFixed(0)} mm</b></div>
          <div class="row"><span>A day, pouring ${s.litres.toFixed(1)} L</span><b>${day(s.litres)} L</b></div>
          <div class="row"><span>A day, with a 6 L cistern</span><b>${day(6)} L</b></div>`, 3);
      },
    };
    return api;
  },
};
