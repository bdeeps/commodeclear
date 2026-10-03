// CommodeClear's shared models and physics: a commode (pan) cut in half with its bowl, trap and
// outlet, a flushing cistern with fill valve, float, flush valve and overflow, and the hydraulics
// the chapters simulate.
//
// Scale: 1 scene unit = 1 decimetre (10 cm). So 1 unit³ = 1 litre, and every simulation works in
// decimetres, litres and seconds. g = 98.1 dm/s². A head of 1 dm of water is 981 Pa (ρ g h).
//
// The pan is drawn as a section in the plane z = 0: x runs from the front of the bowl (negative)
// to the back wall (positive), y is up. The far half (z < 0) is always shown; the near half fades.
import { THREE, M, box, tube, beam, torus, sphere, swarm, clamp, lerp } from './kit.js';

export const TAU = Math.PI * 2;
export const G = 98.1;                 // dm/s²
export const PA_PER_DM = 981;          // Pa for each decimetre of water head
export const C = { ceramic: 0xf3f5f8, cut: 0xd2bfae, water: 0x3f8cff, drop: 0x9fd4ff, pipe: 0x8b95a5, rubber: 0x232833, valve: 0xe9edf2, float: 0x2f6fd6, brass: 0xc9a24a, gas: 0xc9d36a, slab: 0x4a5263 };

// ---------------------------------------------------------------- pan shapes
// bowl / outer rows: [y, xFront, xBack, halfWidth] in dm. path: the trapway centreline [x, y].
// D: trapway bore. seal: depth of the water seal (weir level minus the dip), 50 mm for a WC
// (IS 2556 and most plumbing codes; see the chapter text for sources).
// cdFree: how freely the outlet leg drains while air is still in it. K: loss coefficient of the
// full trapway (entry + bends + exit) once it runs as a siphon.
const WD_BOWL = [[0.85, 0.0, 1.0, 0.45], [1.7, -0.75, 1.0, 0.62], [2.2, -1.05, 1.05, 0.72], [3.0, -2.3, 1.1, 1.35], [3.7, -3.0, 1.15, 1.62], [4.0, -3.1, 1.15, 1.68]];
const OUTER = [[0, -1.7, 3.4, 1.05], [0.4, -1.6, 3.4, 1.0], [1.3, -1.5, 3.4, 1.0], [2.3, -2.3, 3.4, 1.4], [3.3, -3.25, 3.4, 1.8], [3.8, -3.45, 3.4, 1.92], [4.0, -3.5, 3.4, 1.95]];
export const PANS = {
  // Wash-down pan with a P-trap out through the wall: the common Western commode in India and Europe.
  wdP: { name: 'Wash-down, P-trap', D: 0.85, seal: 0.5, bowl: WD_BOWL, outer: OUTER, out: 'wall', cdFree: 0.8, K: 1.5,
    path: [[1.0, 1.275], [1.5, 1.35], [2.0, 1.95], [2.45, 2.52], [2.9, 2.62], [3.4, 2.5], [4.0, 2.38], [4.7, 2.3]] },
  // The same pan with an S-trap down through the floor.
  wdS: { name: 'Wash-down, S-trap', D: 0.85, seal: 0.5, bowl: WD_BOWL, outer: OUTER, out: 'floor', cdFree: 0.8, K: 1.5, zOut: 0,
    path: [[1.0, 1.275], [1.5, 1.35], [1.95, 1.95], [2.3, 2.52], [2.62, 2.62], [2.9, 2.2], [2.95, 1.2], [2.95, 0], [2.95, -1.1]] },
  // Siphonic pan (North America): a narrower, longer trapway with a down leg that can run full.
  // Bore 54 mm (2 1/8 in). Larger water surface. jet: the share of the cistern's flow sent through
  // the siphon jet, a passage that fires straight into the mouth of the trapway to start the siphon.
  siph: { name: 'Siphonic', D: 0.54, seal: 0.5, out: 'floor', cdFree: 0.22, K: 2.5, zOut: 0.3, jet: 0.6,
    bowl: [[1.25, -0.5, 1.0, 0.45], [1.8, -1.2, 1.0, 0.75], [2.3, -1.75, 1.05, 1.0], [3.0, -2.6, 1.1, 1.45], [3.8, -3.1, 1.15, 1.65], [4.0, -3.15, 1.15, 1.7]],
    outer: OUTER,
    path: [[1.0, 1.52], [1.5, 1.62], [1.95, 2.15], [2.4, 2.56], [2.8, 2.3], [2.95, 1.7], [2.8, 1.0], [2.55, 0.4], [2.5, 0], [2.5, -1.1]] },
  // Indian (squat) pour-flush pan set in the floor, with a separate trap below. Rows are relative to
  // floor level. Steep floor (about 25 to 28 degrees) and a shallow 20 mm seal, as in the Sulabh rural
  // design (sulabhinternational.org: 12 to 20 mm seal, 1.5 to 2 litres a flush).
  indian: { name: 'Indian pan', D: 0.75, seal: 0.2, out: 'floor', cdFree: 0.8, K: 1.5, shell: true, zOut: -3.4,
    bowl: [[-2.0, 0.975, 1.725, 0.42], [-1.5, 0.15, 1.8, 0.68], [-1.0, -1.0, 1.88, 0.95], [-0.5, -1.9, 1.95, 1.15], [0, -2.4, 2.0, 1.3]],
    path: [[1.35, -2.0], [1.35, -2.45], [1.65, -2.82], [2.2, -2.85], [2.6, -2.45], [2.85, -2.1], [3.15, -1.9], [3.55, -2.2], [3.8, -2.8], [3.8, -3.5], [3.8, -4.3]] },
};

function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
function fineRows(tab, sub = 8) {
  const out = [];
  for (let i = 0; i < tab.length - 1; i++) {
    const a = tab[Math.max(0, i - 1)], b = tab[i], c = tab[i + 1], d = tab[Math.min(tab.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) { const t = k / sub; out.push([lerp(b[0], c[0], t), cr(a[1], b[1], c[1], d[1], t), cr(a[2], b[2], c[2], d[2], t), Math.max(0.05, cr(a[3], b[3], c[3], d[3], t))]); }
  }
  out.push(tab.at(-1).slice());
  return out;
}
function rowAt(rows, y) {
  if (y <= rows[0][0]) return rows[0];
  if (y >= rows.at(-1)[0]) return rows.at(-1);
  let lo = 0, hi = rows.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rows[m][0] <= y) lo = m; else hi = m; }
  const a = rows[lo], b = rows[hi], t = (y - a[0]) / (b[0] - a[0]);
  return [y, lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
}
// First index whose value reaches v in a non-decreasing table.
function invert(tab, v) {
  let lo = 0, hi = tab.length - 1;
  if (v <= tab[0]) return 0;
  if (v >= tab[hi]) return hi;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] < v) lo = m; else hi = m; }
  const d = tab[hi] - tab[lo];
  return lo + (d > 1e-9 ? (v - tab[lo]) / d : 1);
}

const NS = 140;      // stations along the trapway
const DY = 0.01;     // level table step, dm (1 mm)

// Geometry and volume tables for one pan. Everything the simulations and the meshes need.
const cache = new Map();
export function panModel(key) {
  if (cache.has(key)) return cache.get(key);
  const spec = PANS[key], D = spec.D, At = (Math.PI * D * D) / 4;
  const rows = fineRows(spec.bowl), yS = rows[0][0], yRim = rows.at(-1)[0];
  const at = (y) => rowAt(rows, y);
  const area = (y) => { const r = at(y); return (Math.PI * (r[2] - r[1]) * r[3]) / 2; };   // ellipse: π a b
  // Fit the crown so the seal depth is exactly spec.seal.
  const pts = spec.path.map((p) => p.slice());
  let cIdx = 1; pts.forEach((p, i) => { if (i > 0 && p[1] > pts[cIdx][1]) cIdx = i; });
  let curve, P, iCrown, iDip;
  for (let it = 0; it < 8; it++) {
    curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
    P = curve.getSpacedPoints(NS);
    iCrown = Math.round(NS * 0.2); P.forEach((p, i) => { if (i > NS * 0.2 && p.y > P[iCrown].y) iCrown = i; });
    iDip = 0; for (let i = 0; i <= iCrown; i++) if (P[i].y < P[iDip].y) iDip = i;
    const err = spec.seal - (P[iCrown].y - P[iDip].y - D);
    if (Math.abs(err) < 0.001) break;
    pts[cIdx][1] += err;
  }
  const L = curve.getLength(), ds = L / NS;
  const Nn = P.map((_, i) => { const t = curve.getTangentAt(i / NS); return new THREE.Vector3(-t.y, t.x, 0); });   // points to the ceiling side
  const Tn = P.map((_, i) => curve.getTangentAt(i / NS));
  const yD = P[iDip].y + D / 2, yW = P[iCrown].y - D / 2;
  const zOut = spec.zOut ?? P[NS].y, Ld = Math.max(0.15, yW - zOut);
  const VdFull = At * ds * (NS - iCrown), VtFull = At * ds * iCrown;
  // Level tables: bowl volume, inlet-leg and up-leg trap volume below each level.
  const y0 = Math.min(yS, P[iDip].y - D / 2), n = Math.ceil((yRim + 0.6 - y0) / DY) + 1;
  const Vb = new Float64Array(n), V1 = new Float64Array(n), V2 = new Float64Array(n), Vall = new Float64Array(n);
  let vb = 0;
  for (let k = 0; k < n; k++) {
    const y = y0 + k * DY;
    if (k > 0 && y > yS) vb += area(Math.min(y, yRim)) * DY;
    let l1 = 0, l2 = 0;
    for (let i = 0; i < iCrown; i++) if (P[i].y <= y) { if (i < iDip) l1 += ds; else l2 += ds; }
    Vb[k] = vb; V1[k] = vb + At * l1; V2[k] = At * l2; Vall[k] = V1[k] + V2[k];
  }
  const yOf = (k) => y0 + k * DY, kOf = (y) => clamp((y - y0) / DY, 0, n - 1);
  const look = (tab, y) => { const k = kOf(y), i = Math.floor(k), f = k - i; return i >= n - 1 ? tab[n - 1] : tab[i] + (tab[i + 1] - tab[i]) * f; };
  const m = {
    key, spec, D, At, rows, at, area, yS, yRim, P, Nn, Tn, L, ds, iCrown, iDip, yD, yW, zOut, Ld, VdFull, VtFull,
    seal: yW - yD,
    volAll: (h) => look(Vall, h), levelAll: (V) => yOf(invert(Vall, V)),
    volBowl: (h) => look(Vb, h), levelBowl: (V) => yOf(invert(Vb, V)),
    vol1: (h) => look(V1, h), level1: (V) => yOf(invert(V1, V)),
    vol2: (h) => look(V2, h), level2: (V) => yOf(invert(V2, V)),
    V2full: look(V2, yW),
    // A point in the trapway: s is distance along it (dm), lat is −0.5 (floor side) to +0.5 (ceiling side).
    point(s, lat = 0, out = new THREE.Vector3()) {
      const k = s / ds;
      if (k >= NS) return out.copy(P[NS]).addScaledVector(Tn[NS], s - L).addScaledVector(Nn[NS], lat * D);
      const i = Math.max(0, Math.floor(k)), f = clamp(k - i, 0, 1);
      return out.copy(P[i]).lerp(P[i + 1], f).addScaledVector(Nn[i], lat * D);
    },
    slope(s) { return Tn[clamp(Math.round(s / ds), 0, NS)].y; },
  };
  cache.set(key, m);
  return m;
}

// ---------------------------------------------------------------- flush simulation
// Bowl and trapway as connected vessels. Water in the bowl stands level with the weir (the crown's
// lip). Extra water spills over the weir at Q = 0.4 · b · √(2g) · H^1.5 (a sharp-edged weir of
// width b = the bore, Cd 0.6 × 2/3), never faster than full-bore flow.
// The outlet leg drains at A · cdFree · √(2g · fill · Ld) while air is still in it. If more comes
// over the weir than that, the leg fills. Once full, bowl and outlet are joined by solid water:
// a siphon, driven by the whole drop from the bowl surface to the outlet,
// Q = A · √(2g · Δz / (1 + K)). It runs until the bowl falls to the dip and air gets in.
// These are lumped textbook formulas with typical coefficients, not a CFD model of one maker's pan.
export class FlushSim {
  constructor(key) { this.m = panModel(key); this.reset(); }
  reset() { const m = this.m; this.V = m.volAll(m.yW); this.Vd = 0; this.primed = false; this.qo = 0; this.qout = 0; this.spilt = 0; this.total = 0; this.broke = 0; this.sync(); }
  sync() {
    const m = this.m;
    if (this.primed) { this.h = m.levelBowl(this.V - m.VtFull); this.h2 = m.yW + m.D; }
    else { this.h = m.levelAll(this.V); this.h2 = Math.min(this.h, m.yW + m.D); }
    this.fd = clamp(this.Vd / m.VdFull, 0, 1);
  }
  get sealDepth() { return clamp(Math.min(this.h, this.m.yW) - this.m.yD, 0, this.m.seal); }
  // qin: all water entering the bowl, L/s. qjet: the part of it fired straight into the trapway.
  step(dt, qin = 0, qjet = 0) {
    if (!(dt > 0)) return;
    const m = this.m, n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    this.broke = Math.max(0, this.broke - dt);
    for (let k = 0; k < n; k++) {
      if (!this.primed) {
        const lev = m.levelAll(this.V), H = lev - m.yW;
        const qo = (H > 0 ? Math.min(0.4 * m.D * Math.sqrt(2 * G) * H ** 1.5, m.At * Math.sqrt(2 * G * H)) : 0) + qjet;
        const f = clamp(this.Vd / m.VdFull, 0, 1);
        const qd = Math.min(m.At * m.spec.cdFree * Math.sqrt(2 * G * f * m.Ld), this.Vd / h + qo);
        this.V += (qin - qo) * h; this.Vd += (qo - qd) * h; this.total += qd * h;
        this.qo = qo; this.qout = qd;
        if (this.Vd >= m.VdFull && (H > 0 || qjet > 0)) { this.primed = true; this.Vd = m.VdFull; }
      } else {
        const hb = m.levelBowl(this.V - m.VtFull);
        const qs = m.At * Math.sqrt((2 * G * Math.max(0, hb - m.zOut)) / (1 + m.spec.K));
        this.V += (qin - qs) * h; this.total += qs * h;
        this.qo = qs; this.qout = qs;
        if (hb <= m.yD + 0.03 || this.V - m.VtFull <= 0.001) { this.primed = false; this.broke = 1.2; }   // air under the dip
      }
      const Vmax = this.primed ? m.volBowl(m.yRim) + m.VtFull : m.volAll(m.yRim);
      if (this.V > Vmax) { this.spilt += this.V - Vmax; this.V = Vmax; }
      if (this.V < 0) this.V = 0;
    }
    this.sync();
  }
}

// ---------------------------------------------------------------- trap (water seal) simulation
// The seal as a U-tube manometer. Arm 1 is the bowl, arm 2 the trapway's up leg. Pressure p (Pa,
// gauge) in the drain pushes on arm 2. At rest the levels differ by p / (ρ g).
// Water moves between the arms through the passage under the dip at A · √(2g · |e|), where e is
// the head still out of balance. Arm 2 cannot stand above the weir: extra water spills down the drain.
// If either surface is pushed down to the dip, gas or air passes: the seal is broken.
export class TrapSim {
  constructor(key) { this.m = panModel(key); this.refill(); }
  refill() { const m = this.m; this.V1 = m.vol1(m.yW); this.V2 = m.V2full; this.lost = 0; this.sync(); }
  sync() {
    const m = this.m;
    this.h1 = m.level1(this.V1);
    this.h2 = this.V2 <= 1e-5 ? m.yD - m.D * 0.5 : Math.max(m.level2(this.V2), m.P[m.iDip].y - m.D / 2);
  }
  // Seal depth: how far the lower of the two surfaces stands above the dip.
  get sealDepth() { return Math.max(0, Math.min(this.h1, this.h2, this.m.yW) - this.m.yD); }
  step(dt, p = 0, evap = 0) {          // evap: dm of level lost in this step from each open surface
    if (!(dt > 0)) return;
    const m = this.m, n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n, ph = p / PA_PER_DM;
    this.open = 0; this.spill = 0;
    if (evap > 0) {
      this.V1 = Math.max(0, this.V1 - evap * m.area(Math.max(this.h1, m.yS + 0.02)));
      this.V2 = Math.max(0, this.V2 - evap * m.At * 1.3);
    }
    for (let k = 0; k < n; k++) {
      const h1 = m.level1(this.V1), h2 = this.V2 > 1e-5 ? m.level2(this.V2) : m.yD;
      const A1 = Math.max(0.2, m.area(Math.max(h1, m.yS + 0.02))), A2 = m.At * 1.3;
      // Positive e drives water from arm 2 into the bowl.
      let e = h2 - h1 + ph;
      const blocked1 = h1 <= m.yD && e < 0, blocked2 = this.V2 <= 1e-5 && e > 0;
      if (blocked1 || blocked2) { this.open = Math.sign(e); continue; }   // nothing left to push: gas passes instead
      let q = Math.sign(e) * m.At * Math.sqrt(2 * G * Math.abs(e));
      const cap = Math.abs(e) / (1 / A1 + 1 / A2) / h;                       // don't overshoot balance
      q = clamp(q, -cap, cap);
      if (q > 0) q = Math.min(q, this.V2 / h);
      if (q < 0) q = -Math.min(-q, Math.max(0, this.V1 - m.vol1(m.yD)) / h);
      this.V1 += q * h; this.V2 -= q * h;
      if (this.V2 > m.V2full) { const s = this.V2 - m.V2full; this.V2 = m.V2full; this.lost += s; this.spill += s / dt; }
      if (this.V1 > m.vol1(m.yRim)) this.V1 = m.vol1(m.yRim);
    }
    this.sync();
    // With no pressure, a seal that has dried below the dip is simply open.
    if (!this.open && Math.min(this.h1, this.h2) <= m.yD + 0.002) this.open = p >= 0 ? 1 : -1;
  }
}

// ---------------------------------------------------------------- cistern simulation
// A close-coupled dual-flush cistern. Inside plan 36 × 17 cm, so 1 cm of level is 0.61 litre.
// Flush valve: a 50 mm (2 in) opening, Q = Cd · A · √(2 g h) with Cd 0.6 (Torricelli).
// The valve's own float holds it up until the water falls to the cut-off level: about 1.0 dm of
// level for a full flush (6 L) and half that for a half flush (3 L), the dual-flush volumes of
// modern cisterns (see chapter text for the standards). At the 17 cm water line the tank holds 10.4 L.
// Fill valve: opens when the level is 8 mm under the set line and shuts at the line. It delivers
// about 0.1 L/s here; the real figure depends on supply pressure (see TapClear).
// Overflow: a 22 mm standpipe; water above its rim runs down it as a circular weir.
export const TANK = { W: 3.6, Dp: 1.7, H: 3.0, A: 3.6 * 1.7, SET: 1.7, OV: 2.0, AV: (Math.PI * 0.5 * 0.5) / 4, FULL: 6, HALF: 3, QFILL: 0.1, OVD: 0.22 };
export class CisternSim {
  constructor() { this.set = TANK.SET; this.level = TANK.SET; this.lift = 0; this.closeAt = 0; this.filling = false; this.qFlush = 0; this.qFill = 0; this.qOver = 0; this.qLeak = 0; this.used = 0; this.cut = 0; }
  flush(litres = TANK.FULL) {
    if (this.lift > 0.5) return;
    this.closeAt = Math.max(0.25, this.level - litres / TANK.A); this.lift = 1; this.used = 0;
  }
  // leak: area of the gap under a worn seal, dm². supply: 0..1 (the stop valve).
  step(dt, { set = this.set, leak = 0, supply = 1 } = {}) {
    this.set = set;
    if (!(dt > 0)) return;
    const n = Math.max(1, Math.ceil(dt / 0.005)), h = dt / n;
    for (let k = 0; k < n; k++) {
      const L = this.level;
      if (this.lift > 0 && L <= this.closeAt) this.lift = 0;                       // the valve's float lets go and it drops shut
      const qf = this.lift > 0 ? 0.6 * TANK.AV * Math.sqrt(2 * G * Math.max(0, L)) : 0;
      const ql = this.lift > 0 ? 0 : 0.6 * leak * Math.sqrt(2 * G * Math.max(0, L));
      if (L < set - 0.08) this.filling = true;
      if (L >= set) this.filling = false;
      const qi = this.filling ? TANK.QFILL * supply : 0;
      const Ho = L - TANK.OV;
      const qo = Ho > 0 ? 0.4 * Math.PI * TANK.OVD * Math.sqrt(2 * G) * Ho ** 1.5 : 0;
      this.level = clamp(L + ((qi - qf - ql - qo) * h) / TANK.A, 0, TANK.H);
      this.qFlush = qf; this.qFill = qi; this.qOver = qo; this.qLeak = ql; this.used += qf * h;
    }
    this.cut = this.closeAt;
  }
  get litres() { return this.level * TANK.A; }
  get toBowl() { return this.qFlush + this.qOver + this.qLeak; }
}

// ---------------------------------------------------------------- stage helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowScreen = () => window.innerWidth < 560 && !inReel();
// A phone keeps only the headline and the first few rows of a readout.
export function slim(html, keep = 3) {
  if (!narrowScreen()) return html;
  const parts = html.split('<div class="row">');
  return parts.slice(0, keep + 1).join('<div class="row">');
}
// On a phone-width stage, hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y = -0.16) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const sy = narrow ? y : 0;
  if (!stage.shift || stage.shift[1] !== sy) stage.setShift(0, sy);
  return narrow;
}

// ---------------------------------------------------------------- small mesh helpers
const ceramic = (o = {}) => new THREE.MeshPhysicalMaterial({ color: C.ceramic, roughness: 0.18, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide, ...o });
const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, side: THREE.DoubleSide, ...o });
export const waterMat = (o = {}) => new THREE.MeshStandardMaterial({ color: C.water, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0, depthWrite: false, side: THREE.DoubleSide, ...o });

function geom(pos, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// Half of a lofted shell: each row is an ellipse-like ring (superellipse power n). far: z ≤ 0.
function loft(rows, far, n = 2, seg = 28) {
  const pos = [], idx = [], e = 2 / n;
  rows.forEach(([y, xf, xb, b]) => {
    const cx = (xf + xb) / 2, a = (xb - xf) / 2;
    for (let j = 0; j <= seg; j++) {
      const th = (far ? Math.PI : 0) + (Math.PI * j) / seg, c = Math.cos(th), s = Math.sin(th);
      pos.push(cx + a * Math.sign(c) * Math.abs(c) ** e, y, b * Math.sign(s) * Math.abs(s) ** e);
    }
  });
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < seg; j++) { const p = i * (seg + 1) + j, q = p + seg + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  return geom(pos, idx);
}
// A flat band between two half-rings at the same height (the rim top).
function band(rowIn, rowOut, y, far, nOut = 2, seg = 28) {
  const pos = [], idx = [], ring = ([, xf, xb, b], n) => { const cx = (xf + xb) / 2, a = (xb - xf) / 2, e = 2 / n; for (let j = 0; j <= seg; j++) { const th = (far ? Math.PI : 0) + (Math.PI * j) / seg, c = Math.cos(th), s = Math.sin(th); pos.push(cx + a * Math.sign(c) * Math.abs(c) ** e, y, b * Math.sign(s) * Math.abs(s) ** e); } };
  ring(rowIn, 2); ring(rowOut, nOut);
  for (let j = 0; j < seg; j++) { const p = j, q = j + seg + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  return geom(pos, idx);
}
// A strip in the plane z between two polylines of [x, y] points.
function strip(a, b, z = 0) {
  const pos = [], idx = [];
  a.forEach((p, i) => { pos.push(p[0], p[1], z, b[i][0], b[i][1], z); });
  for (let i = 0; i < a.length - 1; i++) { const p = i * 2; idx.push(p, p + 1, p + 2, p + 2, p + 1, p + 3); }
  return geom(pos, idx);
}
// Half a pipe (z ≤ 0 when far) swept along stations P with normals Nn.
function halfPipe(P, Nn, r, far, i0 = 0, i1 = P.length - 1, seg = 12) {
  const pos = [], idx = [];
  for (let i = i0; i <= i1; i++) for (let j = 0; j <= seg; j++) {
    const ph = (far ? Math.PI : 0) + (Math.PI * j) / seg, c = Math.cos(ph) * r, s = Math.sin(ph) * r;
    pos.push(P[i].x + Nn[i].x * c, P[i].y + Nn[i].y * c, s);
  }
  const n = i1 - i0;
  for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) { const p = i * (seg + 1) + j, q = p + seg + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  return geom(pos, idx);
}
export function vcyl(r0, r1, y0, y1, mat, seg = 28, open = false) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, open), mat); m.position.y = (y0 + y1) / 2; m.castShadow = true; return m; }

// ---------------------------------------------------------------- the pan
// Returns the meshes for one pan, cut along its length, with live water.
export function makePan(key, { seat = true, slab = true, wall = true } = {}) {
  const m = panModel(key), spec = m.spec, { P, Nn, D, rows } = m;
  const g = new THREE.Group(), far = new THREE.Group(), near = new THREE.Group();
  g.add(far, near);
  const cer = ceramic(), nearMat = ceramic({ transparent: true }), cutMat = flat(C.cut);
  const T = 0.12;                                                     // wall thickness of the casting
  const outerRows = spec.shell ? rows.map(([y, a, b, w]) => [y, a - T, b + T, w + T]) : fineRows(spec.outer);
  const nOut = spec.shell ? 2 : 2.7;
  const add = (grp, geo, mat) => { const me = new THREE.Mesh(geo, mat); me.castShadow = me.receiveShadow = true; grp.add(me); return me; };
  const yRim = m.yRim, rimIn = rows.at(-1), rimOut = outerRows.at(-1);

  // Far half: outer skin, bowl, rim, trapway.
  add(far, loft(outerRows, true, nOut), cer); add(far, loft(rows, true), cer); add(far, band(rimIn, rimOut, yRim, true, nOut), cer);
  const iEnd = spec.shell ? NS : P.findIndex((p, i) => i > m.iCrown && (spec.out === 'wall' ? p.x > 3.4 : p.y < 0));
  const iBody = iEnd < 0 ? NS : iEnd;
  add(far, halfPipe(P, Nn, D / 2 + 0.06, true, 0, iBody), ceramic({ color: 0xe6ebf1 }));
  // Near half: fades away for the cut-away.
  const nearParts = [add(near, loft(outerRows, false, nOut), nearMat), add(near, loft(rows, false), nearMat), add(near, band(rimIn, rimOut, yRim, false, nOut), nearMat)];
  nearParts.forEach((p) => { p.renderOrder = 3; });

  // Cut faces at z = 0: thin walls of the casting.
  const cuts = new THREE.Group(); far.add(cuts);
  const cutStrip = (a, b) => add(cuts, strip(a, b, 0.002), cutMat);
  const yBack = P[0].y + Nn[0].y * D / 2;                               // where the back wall meets the trapway's ceiling
  const front = rows.map(([y, xf]) => [xf, y]), back = rows.filter(([y]) => y >= yBack - 0.02).map(([y, , xb]) => [xb, y]);
  cutStrip(front, front.map(([x, y]) => [x - T, y]));
  if (back.length > 1) cutStrip(back, back.map(([x, y]) => [x + T, y]));
  const right0 = [P[0].x - Nn[0].x * D / 2, P[0].y - Nn[0].y * D / 2];
  if (Math.abs(right0[0] - rows[0][1]) > 0.05) cutStrip([[rows[0][1], m.yS], right0], [[rows[0][1], m.yS - T], [right0[0], right0[1] - T]]);   // sump floor
  const side = (sgn, t) => P.slice(0, iBody + 1).map((p, i) => [p.x + Nn[i].x * sgn * (D / 2 + t), p.y + Nn[i].y * sgn * (D / 2 + t)]);
  cutStrip(side(1, 0), side(1, 0.09)); cutStrip(side(-1, 0), side(-1, 0.09));
  if (!spec.shell) {
    const of = outerRows.map(([y, xf]) => [xf, y]), ob = outerRows.map(([y, , xb]) => [xb, y]);
    cutStrip(of, of.map(([x, y]) => [x + T, y])); cutStrip(ob, ob.map(([x, y]) => [x - T, y]));
    cutStrip([[rimOut[1], yRim], [rimIn[1], yRim]], [[rimOut[1], yRim - T], [rimIn[1], yRim - T]]);
    cutStrip([[rimIn[2], yRim], [rimOut[2], yRim]], [[rimIn[2], yRim - T], [rimOut[2], yRim - T]]);
    cutStrip([[outerRows[0][1], 0], [outerRows[0][2], 0]], [[outerRows[0][1], T * 0.7], [outerRows[0][2], T * 0.7]]);
  } else {
    cutStrip([[rimIn[1] - 0.9, yRim], [rimIn[1], yRim]], [[rimIn[1] - 0.9, yRim - T], [rimIn[1], yRim - T]]);
    cutStrip([[rimIn[2], yRim], [rimIn[2] + 0.5, yRim]], [[rimIn[2], yRim - T], [rimIn[2] + 0.5, yRim - T]]);
  }

  // Flush water's way in: from the cistern down the back and round the rim channel.
  let rimTube = null;
  if (!spec.shell) {
    const ring = []; const rr = rowAt(rows, yRim - 0.28), cx = (rr[1] + rr[2]) / 2, a = (rr[2] - rr[1]) / 2 + 0.14, b = rr[3] + 0.14;
    for (let j = 0; j <= 24; j++) { const th = Math.PI + (Math.PI * j) / 24; ring.push([cx + a * Math.cos(th), yRim - 0.2, b * Math.sin(th)]); }
    rimTube = tube(ring, 0.1, ceramic({ color: 0xdfe6ee }), false, 60); far.add(rimTube);
    const inlet = [[2.45, yRim, 0], [2.45, yRim - 0.3, 0], [2.0, yRim - 0.45, 0], [rimIn[2] + 0.12, yRim - 0.3, 0]].map((p) => new THREE.Vector3(...p));
    const ic = new THREE.CatmullRomCurve3(inlet), ip = ic.getSpacedPoints(16), inn = ip.map((_, i) => { const t = ic.getTangentAt(i / 16); return new THREE.Vector3(-t.y, t.x, 0); });
    add(far, halfPipe(ip, inn, 0.24, true), ceramic({ color: 0xdfe6ee }));
  }

  // Outlet pipe and its surroundings.
  const pipeMat = M.plastic(C.pipe, { roughness: 0.5, side: THREE.DoubleSide });
  if (iBody < NS) add(far, halfPipe(P, Nn, D / 2 + 0.07, true, iBody, NS), pipeMat);
  if (slab) {
    const y0 = spec.shell ? -0.75 : -0.6, y1 = spec.shell ? 0 : 0, x0 = spec.shell ? -5.2 : -5.5, x1 = spec.shell ? 5.2 : 4.9;
    if (spec.shell) {
      // Floor with a hole for the pan: two pieces in front and behind, one beside.
      const sm = M.matte(C.slab);
      const s1 = box(rimIn[1] - 0.9 - x0, 0.35, 3.2, sm); s1.position.set((x0 + rimIn[1] - 0.9) / 2, -0.175, -1.6);
      const s2 = box(x1 - rimIn[2] - 0.5, 0.35, 3.2, sm); s2.position.set((x1 + rimIn[2] + 0.5) / 2, -0.175, -1.6);
      const s3 = box(rimIn[2] - rimIn[1] + 1.4, 0.35, 1.4, sm); s3.position.set((rimIn[1] + rimIn[2]) / 2 - 0.2, -0.175, -2.5);
      far.add(s1, s2, s3);
      // Footrests either side of the pan (the far one is shown).
      const fr = box(2.6, 0.16, 0.95, ceramic()); fr.position.set(-0.6, 0.08, -1.85); far.add(fr);
      for (let i = 0; i < 6; i++) { const rib = box(0.08, 0.04, 0.8, flat(0xd5dbe3)); rib.position.set(-1.6 + i * 0.4, 0.18, -1.85); far.add(rib); }
      const frN = box(2.6, 0.16, 0.95, nearMat); frN.position.set(-0.6, 0.08, 1.85); near.add(frN); nearParts.push(frN);
    } else {
      const s = box(x1 - x0, y1 - y0, 3.4, M.matte(C.slab)); s.position.set((x0 + x1) / 2, (y0 + y1) / 2 - 0.004, -1.7); s.castShadow = false; far.add(s);
    }
  }
  if (wall && !spec.shell) { const w = box(0.3, 9.2, 3.4, M.matte(0x596277)); w.position.set(4.75, 4.0, -1.7); w.castShadow = false; far.add(w); }

  // Seat and lid.
  let seatFar = null, seatNear = null, lid = null;
  if (seat && !spec.shell) {
    const cx = (rimIn[1] + rimIn[2]) / 2 - 0.1, a = (rimIn[2] - rimIn[1]) / 2 + 0.25, b = rimIn[3] + 0.22;
    const half = (mat) => {
      const s = new THREE.Shape(); s.absellipse(0, 0, a, b, 0, Math.PI, false); s.absellipse(0, 0, a - 0.62, b - 0.55, Math.PI, 0, true);
      return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 28 }), mat);
    };
    const sm = M.plastic(0xfafbfc, { roughness: 0.3 });
    seatFar = half(sm); seatFar.rotation.x = -Math.PI / 2; seatFar.position.set(cx, yRim + 0.06, 0); far.add(seatFar);
    const snm = M.plastic(0xfafbfc, { roughness: 0.3, transparent: true });
    seatNear = half(snm); seatNear.rotation.x = Math.PI / 2; seatNear.position.set(cx, yRim + 0.2, 0); near.add(seatNear); nearParts.push(seatNear);
    // Lid, raised and leaning on the cistern.
    const ls = new THREE.Shape(); ls.absellipse(0, 0, b, a, Math.PI / 2, Math.PI * 1.5, false);
    lid = new THREE.Mesh(new THREE.ExtrudeGeometry(ls, { depth: 0.1, bevelEnabled: false, curveSegments: 28 }), sm);
    lid.rotation.y = -Math.PI / 2;
    const lg = new THREE.Group(); lg.add(lid); lid.position.set(0, a, 0); lg.position.set(rimIn[2] + 0.2, yRim + 0.25, 0); lg.rotation.z = -0.02; far.add(lg); lid = lg;
  }

  // ---- water
  const wm = waterMat(), water = new THREE.Group(); g.add(water);
  const fm = new THREE.MeshBasicMaterial({ color: 0x3d86f5, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide });   // unlit, for the cut faces
  const NR = 26;
  const faceGeo = strip(Array.from({ length: NR + 1 }, () => [0, 0]), Array.from({ length: NR + 1 }, () => [0, 0]), 0.012);
  const face = new THREE.Mesh(faceGeo, fm); face.frustumCulled = false; water.add(face);
  const ribGeo = strip(P.map((p) => [p.x, p.y]), P.map((p) => [p.x, p.y]), 0.012);
  const rib = new THREE.Mesh(ribGeo, fm); rib.frustumCulled = false; water.add(rib);
  const disc = (far0) => { const d = new THREE.CircleGeometry(1, 36, far0 ? 0 : Math.PI, Math.PI); d.rotateX(-Math.PI / 2); const me = new THREE.Mesh(d, wm); water.add(me); return me; };
  const topFar = disc(true), topNear = disc(false);
  let cutK = 1;
  function setWater({ h1, h2 = h1, primed = false, stream = 0 }) {
    // Bowl: the section face and the surface.
    const fp = faceGeo.attributes.position, lev = Math.min(h1, m.yRim), wet = lev > m.yS + 0.005;
    face.visible = topFar.visible = wet; topNear.visible = wet && cutK < 0.5;
    if (wet) {
      for (let k = 0; k <= NR; k++) { const y = m.yS + ((lev - m.yS) * k) / NR, r = m.at(y); fp.setXY(k * 2, r[1], y); fp.setXY(k * 2 + 1, r[2], y); }
      fp.needsUpdate = true;
      const r = m.at(lev), cx = (r[1] + r[2]) / 2;
      for (const d of [topFar, topNear]) { d.position.set(cx, lev, 0); d.scale.set((r[2] - r[1]) / 2, 1, r[3]); }
    }
    // Trapway: clip each leg at its own level; past the crown draw the stream on the floor side.
    const rp = ribGeo.attributes.position;
    for (let i = 0; i <= NS; i++) {
      const p = P[i], nx = Nn[i].x * D / 2, ny = Nn[i].y * D / 2;
      let ax = p.x + nx, ay = p.y + ny, bx = p.x - nx, by = p.y - ny;
      if (!primed) {
        if (i <= m.iCrown) {
          const lv = i < m.iDip ? h1 : i === m.iDip ? Math.max(h1, h2) : h2;
          if (ay > lv) { const t = clamp((lv - by) / (ay - by || 1e-6), 0, 1); if (by >= lv) { ax = bx; ay = by; } else { ax = bx + (ax - bx) * t; ay = lv; } }
          if (i > m.iDip && by >= lv) { ax = bx; ay = by; }
        } else { const t = clamp(stream, 0, 1); ax = bx + (ax - bx) * t; ay = by + (ay - by) * t; }
      }
      rp.setXY(i * 2, ax, ay); rp.setXY(i * 2 + 1, bx, by);
    }
    rp.needsUpdate = true;
  }
  function setCut(k) {
    cutK = k;
    near.visible = k < 0.97;
    for (const mat of new Set(nearParts.map((p) => p.material))) { mat.opacity = 1 - k; mat.depthWrite = k < 0.4; }
  }
  setCut(1); setWater({ h1: m.yW });
  return { group: g, far, near, m, setWater, setCut, water, lid, seatFar, seatNear, rimTube, nearParts, cuts };
}

// ---------------------------------------------------------------- water drops for a pan
// Rim wash, trapway flow, a poured stream and bubbles, all in one swarm.
export function makePanFlow(pan, n = 260) {
  const m = pan.m, mesh = swarm(n, new THREE.SphereGeometry(0.05, 6, 5), M.plastic(C.drop, { roughness: 0.15 }));
  mesh.castShadow = false; mesh.frustumCulled = false; pan.group.add(mesh);
  const Pt = Array.from({ length: n }, () => ({ k: 0 }));
  let next = 0, accR = 0, accT = 0, accP = 0, seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const spawn = (o) => { const p = Pt[next]; next = (next + 1) % n; Object.assign(p, o); return p; };
  const v = new THREE.Vector3(), sCrown = m.iCrown * m.ds;
  return {
    mesh, rnd,
    bubbles(count = 14) { for (let i = 0; i < count; i++) spawn({ k: 4, x: m.P[0].x - 0.15 - rnd() * 0.5, y: m.yD - 0.2 + rnd() * 0.2, z: -rnd() * 0.3, vy: 2 + rnd() * 2 }); },
    // rim: L/s arriving through the rim. out: L/s through the trapway. pour: { from: [x,y,z], q } or null.
    update(dt, { rim = 0, out = 0, primed = false, h = m.yW, pour = null }) {
      accR += rim * 70 * dt; accT += out * 55 * dt; accP += (pour?.q || 0) * 60 * dt;
      while (accR >= 1) { accR -= 1; const edge = rnd() < 0.3; spawn({ k: 1, th: edge ? (rnd() < 0.6 ? Math.PI : TAU) : Math.PI + rnd() * Math.PI, y: m.yRim - 0.3, v: 3 + rnd() * 2 }); }
      while (accT >= 1) { accT -= 1; spawn({ k: 2, s: rnd() * 0.3, lat: rnd() - 0.5, z: -rnd() * 0.32 * m.D }); }
      while (accP >= 1 && pour) { accP -= 1; spawn({ k: 3, x: pour.from[0] + (rnd() - 0.5) * 0.15, y: pour.from[1], z: pour.from[2] + (rnd() - 0.5) * 0.15, vx: (pour.vx ?? 4) + rnd(), vy: 0, vz: -pour.from[2] * 1.2 }); }
      const vt = out / m.At;
      Pt.forEach((p, i) => {
        if (p.k === 1) {
          p.v += G * 0.35 * dt; p.y -= p.v * dt;
          if (p.y <= Math.max(h, m.yS)) p.k = 0;
          else { const r = m.at(p.y), cx = (r[1] + r[2]) / 2, a = ((r[2] - r[1]) / 2) * 0.97; v.set(cx + a * Math.cos(p.th), p.y, r[3] * 0.97 * Math.sin(p.th) + 0.03); }
        } else if (p.k === 2) {
          const past = p.s > sCrown;
          const sp = primed || !past ? Math.max(vt, 0.6) : Math.max(vt, 4 + Math.sqrt(2 * G * Math.max(0, m.P[m.iCrown].y - m.point(p.s, 0, v).y)));
          p.s += sp * dt;
          if (p.s > m.L + 1.2 || (out <= 0.002 && !past)) p.k = 0;
          else m.point(p.s, primed || !past ? p.lat * 0.8 : -0.42 + (p.lat + 0.5) * 0.3, v).setZ(p.z);
        } else if (p.k === 3) {
          p.vy -= G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          const r = m.at(clamp(p.y, m.yS, m.yRim));
          if (p.y <= Math.max(h, m.yS)) p.k = 0;
          else if (p.y < m.yRim && p.x < r[1] + 0.06) { p.k = 5; p.v = 3; }       // landed on the sloping front of the pan: run down it
          else v.set(p.x, p.y, p.z);
        } else if (p.k === 5) {
          p.v += G * 0.4 * dt; p.y -= p.v * dt * 0.6;
          if (p.y <= Math.max(h, m.yS)) p.k = 0; else v.set(m.at(p.y)[1] + 0.07, p.y, p.z * 0.6);
        } else if (p.k === 4) {
          p.y += p.vy * dt; p.x += Math.sin(p.y * 9 + i) * dt;
          if (p.y >= h) p.k = 0; else v.set(p.x, p.y, p.z);
        }
        if (p.k) mesh.place(i, [v.x, v.y, v.z], null, p.k === 4 ? 1.5 : 1); else mesh.place(i, [0, -60, 0], null, 0.001);
      });
      mesh.done();
    },
  };
}

// ---------------------------------------------------------------- test balls
// Makers test a pan with small plastic balls: the common "50-ball test" uses 20 mm balls of 3.7 g
// (ceramicninja.com/fifty-ball-test), so their density is about 880 kg/m³ and they float.
// Such a ball rises through still water at about 0.26 m/s: v = √(4 g d (Δρ/ρ) / (3 Cd)), Cd 0.45.
// Water has to move down faster than that to take it under. Falling water stirs the pool to a
// speed of order √(Q · v_fall / A_pool) (its momentum spread over the pool): an estimate, not CFD.
export const BALL = { r: 0.1, rise: 2.64 };
export function makeBalls(pan, n = 8) {
  const m = pan.m, mesh = swarm(n, new THREE.SphereGeometry(BALL.r, 14, 10), M.plastic(0xffd98a, { roughness: 0.35 }));
  mesh.frustumCulled = false; pan.group.add(mesh);
  const B = Array.from({ length: n }, (_, i) => ({ where: 0, fx: (i + 0.5) / n, x: 0, y: 0, s: 0, k: 0.85 + 0.3 * ((i * 0.618) % 1), z: -0.1 - 0.25 * ((i * 0.37) % 1) }));
  const v = new THREE.Vector3(), sCrown = m.iCrown * m.ds;
  const api = {
    mesh, B,
    reset() { B.forEach((b) => { b.where = 0; b.y = m.yRim; b.s = 0; }); },
    get cleared() { return B.filter((b) => b.where === 2).length; },
    // qin: L/s falling into the bowl. fall: its speed on arrival, dm/s. sim: a FlushSim.
    update(dt, sim, qin, fall = 17) {
      const h = sim.h, qout = sim.qout, primed = sim.primed;
      const stir = Math.sqrt((qin * fall) / Math.max(0.3, m.area(Math.max(h, m.yS + 0.05))));   // pool stirred by the falling water
      B.forEach((b, i) => {
        if (b.where === 0) {
          const top = Math.max(h, m.yS + BALL.r) - BALL.r * 0.3;
          // Near the trap inlet the flow converges like a sink: speed = Q / (2π d²), at most the bore speed.
          const d2 = (b.x - m.P[0].x) ** 2 + (b.y - m.P[0].y) ** 2;
          const down = Math.min(qout / m.At, qout / (TAU * Math.max(0.02, d2))) + stir;
          b.y = Math.min(top, b.y + (BALL.rise * b.k - down) * dt);
          const inlet = m.P[0].y + (m.spec.shell ? 0 : m.D * 0.2);
          if (b.y <= inlet && qout > 0.01) { b.where = 1; b.s = 0; }
          else {
            b.y = Math.max(b.y, Math.min(top, inlet));
            const r = m.at(b.y), lo = r[1] + BALL.r + 0.05, hi = r[2] - BALL.r - 0.05, t = clamp((b.y - m.yD) / 0.6, 0, 1);
            b.x = lerp(hi - 0.1, lerp(lo, hi, b.fx), t);
            v.set(b.x, b.y, b.z * clamp(r[3], 0, 1));
          }
        }
        if (b.where === 1) {
          const past = b.s > sCrown;
          let sp = qout / m.At + BALL.rise * b.k * m.slope(b.s);
          if (past && !primed) sp = Math.max(sp, 8);
          b.s += sp * dt;
          // A ball cannot sit above the water in the up leg.
          if (!primed && !past) { const y = m.point(b.s, 0, v).y; if (y > sim.h2 && sp <= 0.5) b.s -= 2 * dt; }
          if (b.s <= 0) { b.where = 0; b.y = m.P[0].y + 0.05; }
          else if (b.s > m.L + 0.8) b.where = 2;
          m.point(Math.max(0, b.s), 0, v).setZ(b.z * 0.4);
        }
        if (b.where === 2) mesh.place(i, [0, -60, 0], null, 0.001); else mesh.place(i, [v.x, v.y, v.z], null, 1);
      });
      mesh.done();
    },
  };
  api.reset();
  return api;
}

// ---------------------------------------------------------------- the cistern
// Built with its long side along local X and its inside floor at y = 0.
export function makeCistern({ supply = true } = {}) {
  const g = new THREE.Group(), { W, Dp, H } = TANK, t = 0.09;
  const shellMat = ceramic({ transparent: true }), body = new THREE.Group(); g.add(body);
  const wallBox = (w, h, d, x, y, z) => { const b = box(w, h, d, shellMat); b.position.set(x, y, z); body.add(b); return b; };
  wallBox(W + 2 * t, t, Dp + 2 * t, 0, -t / 2, 0);
  wallBox(W + 2 * t, H, t, 0, H / 2, -Dp / 2 - t / 2); wallBox(W + 2 * t, H, t, 0, H / 2, Dp / 2 + t / 2);
  wallBox(t, H, Dp, -W / 2 - t / 2, H / 2, 0); wallBox(t, H, Dp, W / 2 + t / 2, H / 2, 0);
  const lid = new THREE.Group(); g.add(lid);
  const lidTop = box(W + 2 * t + 0.14, 0.14, Dp + 2 * t + 0.14, shellMat); lidTop.position.y = H + 0.07; lid.add(lidTop);

  const white = M.plastic(C.valve, { roughness: 0.4 }), grey = M.plastic(0xaab3c0, { roughness: 0.5 }), blue = M.plastic(C.float, { roughness: 0.4 });
  // Fill valve with a float cup.
  const FX = -1.25, FZ = 0.1;
  const fill = new THREE.Group(); fill.position.set(FX, 0, FZ); g.add(fill);
  fill.add(vcyl(0.12, 0.12, -0.55, 0, grey), vcyl(0.17, 0.17, -0.2, -0.05, grey, 6), vcyl(0.11, 0.11, 0, 2.4, white), vcyl(0.21, 0.21, 2.4, 2.72, white));
  const spout = box(0.3, 0.1, 0.12, white); spout.position.set(0.3, 2.5, 0); fill.add(spout);
  const cup = new THREE.Group(); fill.add(cup);
  cup.add(vcyl(0.34, 0.34, -0.28, 0.28, blue, 28, true), vcyl(0.34, 0.34, 0.26, 0.3, blue));
  const link = vcyl(0.025, 0.025, -0.5, 0.5, M.metal(0xd0d4da)); link.position.x = -0.3; fill.add(link);
  const lever = box(0.5, 0.05, 0.08, M.metal(0xd0d4da)); lever.position.set(-0.12, 2.76, 0); fill.add(lever);
  // Ball float on an arm (the older ballcock).
  const ballG = new THREE.Group(); ballG.position.set(-1.45, 2.5, 0.45); g.add(ballG);
  const bv = box(0.3, 0.36, 0.3, M.metal(C.brass, { roughness: 0.4 })); bv.position.set(-0.1, 0, 0); ballG.add(bv);
  const bIn = beam([-0.1, -0.18, 0], [-0.1, -3.05, 0], 0.07, M.metal(C.brass, { roughness: 0.4 })); ballG.add(bIn);
  const arm = new THREE.Group(); ballG.add(arm);
  const ARM = 2.0;
  arm.add(beam([0, 0, 0], [ARM, 0, 0], 0.035, M.metal(C.brass, { roughness: 0.4 })));
  const ball = sphere(0.36, M.metal(0xd28b4a, { roughness: 0.45 })); ball.position.x = ARM + 0.3; arm.add(ball);
  ballG.visible = false;

  // Flush valve: a drop valve with a rubber seal, in a guide, and the overflow tube beside it.
  const VX = 0.2, VZ = -0.2;
  const fv = new THREE.Group(); fv.position.set(VX, 0, VZ); g.add(fv);
  fv.add(vcyl(0.3, 0.3, -1.0, 0.02, grey, 28, true));
  const seat = torus(0.3, 0.05, grey, 32); seat.rotation.x = Math.PI / 2; seat.position.y = 0.03; fv.add(seat);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; fv.add(beam([0.42 * Math.cos(a), 0, 0.42 * Math.sin(a)], [0.42 * Math.cos(a), 1.55, 0.42 * Math.sin(a)], 0.025, grey)); }
  const guide = torus(0.42, 0.03, grey, 32); guide.rotation.x = Math.PI / 2; guide.position.y = 1.55; fv.add(guide);
  const plug = new THREE.Group(); fv.add(plug);
  plug.add(vcyl(0.37, 0.37, 0.05, 0.12, M.plastic(C.rubber, { roughness: 0.8 })), vcyl(0.2, 0.2, 0.12, 1.4, white), vcyl(0.31, 0.31, 0.5, 0.9, M.plastic(0xff9a6b, { roughness: 0.5 })));
  const rodF = vcyl(0.03, 0.03, 1.4, H + 0.1, grey); plug.add(rodF);
  const ovPts = [[0.75, TANK.OV, 0], [0.75, 0.4, 0], [0.75, -0.35, 0], [0.5, -0.62, 0], [0.22, -0.66, 0]];
  const ov = tube(ovPts, TANK.OVD / 2, M.plastic(0xdfe5ec, { roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }), false, 60); fv.add(ov);
  // Refill tube from the fill valve to the overflow.
  const refill = tube([[FX + 0.2, 2.62, FZ], [FX + 0.9, 2.86, FZ - 0.1], [VX + 0.5, 2.7, VZ], [VX + 0.75, TANK.OV + 0.12, VZ]], 0.03, M.plastic(0x30343c), false, 40); g.add(refill);
  // Dual-flush button on the lid.
  const btn = new THREE.Group(); btn.position.set(VX, H + 0.14, VZ); g.add(btn);
  const chrome = M.metal(0xd8dde4, { roughness: 0.2 });
  const mk = (a0, a1) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.absarc(0, 0, 0.3, a0, a1, false); s.lineTo(0, 0); const me = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 20 }), chrome); me.rotation.x = -Math.PI / 2; return me; };
  const bHalf = mk(Math.PI * 0.62, Math.PI * 1.38), bFull = mk(-Math.PI * 0.58, Math.PI * 0.58);
  btn.add(bHalf, bFull, vcyl(0.36, 0.36, -0.02, 0.03, chrome));
  // Water supply: stop valve on the wall and a flexible hose.
  const sup = new THREE.Group(); g.add(sup);
  if (supply) {
    sup.add(tube([[FX, -0.55, FZ], [FX - 0.1, -1.3, FZ], [FX - 0.7, -1.9, FZ - 0.4], [FX - 0.9, -2.0, -Dp / 2 - 0.3]], 0.06, M.metal(0xc4c9d1, { roughness: 0.45 }), false, 50));
    const av = box(0.28, 0.28, 0.3, chrome); av.position.set(FX - 0.9, -2.0, -Dp / 2 - 0.35); sup.add(av);
  }
  // Water and level marks.
  const wm = waterMat({ opacity: 0.42 });
  const water = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 1, Dp - 0.02), wm); g.add(water);
  const mark = (color) => { const me = new THREE.Mesh(new THREE.BoxGeometry(W, 0.025, 0.02), M.glow(color)); me.position.z = Dp / 2 + t + 0.012; g.add(me); return me; };
  const setMark = mark(0x5ce1a9), ovMark = mark(0xffb547); ovMark.position.y = TANK.OV;

  const blueCol = new THREE.Color(C.water), dyeCol = new THREE.Color(0x2b3fd6);
  let kind = 'cup', pressF = 0, pressH = 0;
  function set({ level, setLevel = TANK.SET, lift = 0, floatKind = 'cup', press = null, dye = 0, dt = 0.016 }) {
    water.visible = level > 0.01; water.scale.y = Math.max(0.01, level); water.position.y = level / 2;
    wm.color.copy(blueCol).lerp(dyeCol, dye); wm.opacity = 0.42 + 0.25 * dye;
    setMark.position.y = setLevel;
    kind = floatKind; fill.visible = kind === 'cup'; ballG.visible = kind === 'ball'; refill.visible = kind === 'cup';
    // The float rides on the water until its stop; the stop is the set level.
    const fy = clamp(Math.min(level, setLevel) - 0.08, 0.5, 2.08);
    cup.position.y = fy; link.scale.y = Math.max(0.05, 2.74 - fy); link.position.y = fy + (2.74 - fy) / 2;
    lever.rotation.z = clamp((setLevel - level) * 1.5, 0, 0.3);
    const by = clamp(Math.min(level, setLevel + 0.02) + 0.1, 0.4, 2.7) - 2.5;
    arm.rotation.z = Math.asin(clamp(by / (ARM + 0.3), -0.95, 0.5));
    plug.position.y = lift * 0.45;
    pressF = lerp(pressF, press === 'full' ? 1 : 0, Math.min(1, dt * 14)); pressH = lerp(pressH, press === 'half' ? 1 : 0, Math.min(1, dt * 14));
    bFull.position.y = -0.07 * pressF; bHalf.position.y = -0.07 * pressH;
  }
  function setGlass(k) { shellMat.opacity = lerp(1, 0.13, k); shellMat.depthWrite = k < 0.4; body.children.forEach((c) => { c.castShadow = k < 0.4; }); lidTop.castShadow = k < 0.4; }
  setGlass(1); set({ level: TANK.SET });
  return { group: g, body, lid, fill, cup, ballG, fv, plug, ov, btn, sup, water, refill, set, setGlass, FX, FZ, VX, VZ };
}

// A bucket or mug: an open tapered cylinder with a handle. Pivot at the pouring lip.
export function makeBucket(r = 1.1, h = 2.2, color = 0x3aa0a8) {
  const g = new THREE.Group(), mat = M.plastic(color, { roughness: 0.5, side: THREE.DoubleSide });
  const b = vcyl(r * 0.78, r, 0, h, mat, 28, true), base = vcyl(r * 0.78, r * 0.78, 0, 0.05, mat);
  const inner = new THREE.Group(); inner.add(b, base); inner.position.set(r, -h, 0); g.add(inner);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.74, 1, 24), waterMat({ opacity: 0.55 })); inner.add(w);
  g.setFill = (k) => { w.visible = k > 0.02; w.scale.y = Math.max(0.01, k * h * 0.9); w.position.y = 0.05 + (k * h * 0.9) / 2; };
  g.setFill(1);
  return g;
}
