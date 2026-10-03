// Chapter 1: the parts of a commode, cut in half along its length.
import { THREE, exploder, approach } from '../kit.js';
import { makePan, makeCistern, panModel, TANK, slim, fitNarrow } from '../commode.js';

const FLOOR = 1.2;       // the bathroom floor sits this far above the stage so the pipe below shows

export default {
  id: 'anatomy',
  short: 'Inside a commode',
  title: 'Inside a commode',
  subtitle: 'A bowl, a bent pipe that stays full of water, and a tank that empties in one go.',
  view: { pos: [-6.4, 8.6, 13.0], target: [-0.6, 5.3, 0] },
  learn: `<p>A commode has no motor and no pump. It works with <b>water, gravity and the shape of the pottery</b>.</p>
    <p>The <b>bowl</b> and everything under it is one piece of glazed ceramic. Behind the bowl the passage dips down, climbs over a hump and then drops away. That bend is the <b>trap</b>. Water always sits in it, level with the top of the hump, the <b>weir</b>. This plug of water, the <b>water seal</b>, is what keeps the smell of the drain out of your bathroom.</p>
    <p>On the back sits the <b>cistern</b>: a tank holding a measured amount of water. Inside are two valves. The <b>fill valve</b> lets water in and its <b>float</b> shuts it at the right level. The <b>flush valve</b> is the big plug in the floor of the tank. Press the button and it lifts, and the water rushes down, round the <b>rim channel</b> and into the bowl. The <b>overflow tube</b> is the safety: if the fill valve ever sticks, water runs down it into the bowl, not onto your floor.</p>
    <p>The outlet joins the <b>soil pipe</b>. A <b>P-trap</b> goes out through the wall, which is common in Indian flats. An <b>S-trap</b> goes down through the floor.</p>
    <p class="tip"><b>Try it:</b> slide the cut-away to slice the commode open, then take it apart. Switch between the P-trap and the S-trap and follow the pipe.</p>`,
  terms: [
    { t: 'Trap', d: 'The bend in the outlet passage that always holds water.' },
    { t: 'Water seal', d: 'The water standing in the trap. It blocks gas from the drain.' },
    { t: 'Weir', d: 'The lip at the top of the trap’s hump. It sets the water level in the bowl.' },
    { t: 'Cistern', d: 'The tank that stores water for one flush.' },
    { t: 'Soil pipe', d: 'The wide pipe that carries the flush away to the sewer, septic tank or pit.' },
  ],
  defaults: { cut: 1, explode: 0, trap: 'wdP' },
  controls: [
    { key: 'cut', type: 'range', label: 'Cut-away', min: 0, max: 1, step: 0.01, ends: ['whole', 'cut in half'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'trap', type: 'seg', label: 'Outlet', options: [{ v: 'wdP', label: 'P-trap (wall)' }, { v: 'wdS', label: 'S-trap (floor)' }] },
  ],
  quiz: [
    { q: 'What keeps drain smells from coming up through a commode?', options: ['The seat lid', 'Water standing in the trap', 'A fan in the cistern', 'A rubber flap in the bowl'], answer: 1, why: 'The bend of the trap always holds water. Gas from the drain cannot pass through it.' },
    { q: 'What sets the level of the water you see in the bowl?', options: ['How much the cistern holds', 'The height of the weir, the lip of the trap', 'How hard you press the button', 'The size of the seat'], answer: 1, why: 'Any extra water just spills over the weir and away, so the bowl always settles level with it.' },
    { q: 'What is the overflow tube in the cistern for?', options: ['It makes the flush stronger', 'It lets air into the tank', 'If the tank overfills, it sends the water into the bowl', 'It holds the float up'], answer: 2, why: 'If the fill valve fails to shut, the extra water goes down the overflow tube to the bowl and the drain.' },
  ],
  reel: [
    { ms: 5600, caption: 'A commode has no motor: just water, gravity and cleverly shaped pottery.', set: { explode: 0, trap: 'wdP' }, anim: { cut: [0, 1] }, view: { pos: [-6.0, 7.6, 12.2], target: [0.5, 4.6, 0] }, spin: 0.25 },
    { ms: 5200, caption: 'Behind the bowl the outlet bends into a trap that always stays full of water.', set: { cut: 1, trap: 'wdP' }, anim: { explode: [0, 0.9] }, view: { pos: [-1.5, 6.4, 13.4], target: [0.8, 5.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = FLOOR; stage.root.add(root);
    const pans = { wdP: makePan('wdP'), wdS: makePan('wdS') };
    Object.values(pans).forEach((p) => root.add(p.group));
    const c = makeCistern();
    c.group.rotation.y = -Math.PI / 2; c.group.position.set(2.45, 4.1, 0); root.add(c.group);
    c.set({ level: TANK.SET });

    const parts = [{ obj: c.group, off: [0, 1.5, 0] }, { obj: c.lid, off: [0, 2.3, 0] }, { obj: c.fill, off: [0, 1.9, 0] }, { obj: c.fv, off: [0, 1.6, 0] }, { obj: c.btn, off: [0, 2.9, 0] }];
    Object.values(pans).forEach((p) => parts.push({ obj: p.seatFar, off: [0, 1.0, 0] }, { obj: p.seatNear, off: [0, 1.0, 2.2] }, { obj: p.lid, off: [0, 1.0, 0] }, { obj: p.near, off: [0, 0, 2.6] }));
    const setExplode = exploder(parts);

    const L = (t, pos, parent = root, cls = '') => stage.label(t, pos, parent, cls);
    const m = panModel('wdP');
    L('Cistern', [2.3, 3.3, 0], c.group);
    const minor = [L('Flush button', [0, 0.9, 0], c.btn)];
    const inner = [
      L('Fill valve and float', [0, 3.45, 0], c.fill),
      L('Flush valve', [0, 0.8, 1.0], c.fv),
      L('Overflow tube', [0.75, 2.2, -1.1], c.fv),
      L('Rim channel', [-3.3, 4.25, 0.2]),
      L('Water seal', [-1.6, m.yW + 0.25, 0.3], root, 'hot'),
      L('Trap', [1.5, 1.0, 0.4], root, 'hot'),
      L('Weir', [2.9, 3.25, 0.3]),
    ];
    L('Bowl', [-2.9, 2.6, 1.4]);
    minor.push(L('Seat', [-1.2, 0.45, -1.2], pans.wdP.seatFar));
    const outP = L('To the soil pipe, through the wall', [4.4, 1.55, 0.4]);
    const outS = L('To the soil pipe, through the floor', [3.0, -0.95, 0.5]);
    minor.push(L('Stop valve', [3.6, 2.2, -1.3]));

    let cut = 1, ex = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        cut = approach(cut, s.cut, 8, dt); ex = approach(ex, s.explode, 8, dt);
        for (const [k, p] of Object.entries(pans)) { p.group.visible = k === s.trap; p.setCut(cut); p.setWater({ h1: p.m.yW }); }
        c.setGlass(cut); c.set({ level: TANK.SET, dt });
        setExplode(ex);
        const narrow = fitNarrow(stage, minor);
        inner.forEach((l, i) => { l.visible = cut > 0.6 && (!narrow || i === 4 || i === 5); });
        outP.visible = s.trap === 'wdP' && !narrow; outS.visible = s.trap === 'wdS' && !narrow;
      },
      readout: (s) => {
        const pm = panModel(s.trap);
        return slim(`<div class="big">${s.trap === 'wdP' ? 'P-trap: out through the wall' : 'S-trap: down through the floor'}</div>
          <div class="row"><span>Water seal depth</span><b>${Math.round(pm.seal * 100)} mm</b></div>
          <div class="row"><span>Water standing in bowl and trap</span><b>${pm.volAll(pm.yW).toFixed(1)} L</b></div>
          <div class="row"><span>Trap bore</span><b>${Math.round(pm.D * 100)} mm</b></div>
          <div class="row"><span>Cistern holds</span><b>${(TANK.SET * TANK.A).toFixed(1)} L, flushes ${TANK.FULL} or ${TANK.HALF} L</b></div>`, 3);
      },
    };
  },
};
