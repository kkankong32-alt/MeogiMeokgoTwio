/**
 * Proof-only, art-directed low hop for one locked body/head and 12 rigid limb rasters.
 * Pixel coordinates use the original 1254 × 1254 registration canvas (y increases down).
 * No pixels are generated, scaled, sheared, or redrawn by this module.
 */
import { multiply, translate, rotate, transformPoint, pivotRotation } from '../rig-math.mjs';
export { multiply, translate, rotate, transformPoint, pivotRotation };
export const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);
const EPS = 1e-9;
const radians = degrees => degrees * Math.PI / 180;
const degrees = angle => angle * 180 / Math.PI;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const finite = (n, name) => { if (!Number.isFinite(n)) throw new TypeError(`${name} must be finite`); return n; };
const point = (p, name) => ({ x: finite(p?.x, `${name}.x`), y: finite(p?.y, `${name}.y`) });
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
export const wrapAngle = angle => { finite(angle, 'angle'); return ((angle + 180) % 360 + 360) % 360 - 180; };
export const angleLerp = (a, b, t) => a + wrapAngle(b - a) * t;
const vectorAt = (angle, length) => ({ x: Math.cos(radians(angle)) * length, y: Math.sin(radians(angle)) * length });
const angleOf = vector => degrees(Math.atan2(vector.y, vector.x));
function deepFreeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }

export const REST_JOINTS = deepFreeze({
  'hind-near': { start: { x: 414, y: 653 }, mid: { x: 430, y: 822 }, end: { x: 355, y: 823 }, contact: { x: 451, y: 955 } },
  'hind-far':  { start: { x: 450, y: 370 }, mid: { x: 290, y: 358 }, end: { x: 382, y: 458 }, contact: { x: 486, y: 528 } },
  'fore-near': { start: { x: 717, y: 734 }, mid: { x: 602, y: 845 }, end: { x: 784, y: 946 }, contact: { x: 852, y: 992 } },
  'fore-far':  { start: { x: 993, y: 683 }, mid: { x: 967, y: 715 }, end: { x: 1020, y: 760 }, contact: { x: 1049, y: 800 } },
});
/** Observed fore-cap refinements for ../partial-ten-part-registration-v02.json.
 * Opt in explicitly; original rest/baseline geometry stays unchanged. */
export const FORE_V02_JOINT_OVERRIDES = deepFreeze({
  'fore-near': { mid: { x: 647, y: 852 } },
  'fore-far': { start: { x: 981, y: 664 } },
});
export const DRAW_ORDER = Object.freeze([
  'hind-far-foot', 'hind-far-shank', 'hind-far-thigh',
  'fore-far-hand', 'fore-far-lower', 'fore-far-upper',
  'body-head',
  'hind-near-foot', 'hind-near-shank', 'hind-near-thigh',
  'fore-near-hand', 'fore-near-lower', 'fore-near-upper',
]);
export const PHASES = deepFreeze([
  { name: 'prepare', start: 0, end: 0.20 },
  { name: 'push', start: 0.20, end: 0.34 },
  { name: 'flight-trail', start: 0.34, end: 0.46 },
  { name: 'flight-tuck', start: 0.46, end: 0.56 },
  { name: 'landing-prepare', start: 0.56, end: 0.64 },
  { name: 'fore-compression', start: 0.64, end: 0.78 },
  { name: 'hind-recovery', start: 0.78, end: 1 },
]);
// [normalized time, horizontal travel, vertical translation, body angle in degrees]
export const ROOT_TRACK = deepFreeze([
  [0, 0, 0, 0], [0.14, 0, 6, 0.5], [0.20, 0, 5, 0.25],
  [0.34, 5, -6, -0.4], [0.46, 13, -18, -0.8], [0.55, 19, -17, -0.2],
  [0.64, 24, -4, 0.5], [0.74, 27, 5, 0.75], [0.84, 28, 3, 0.3], [1, 28, 0, 0],
]);
const DEFAULT_EVENTS = deepFreeze({ fore: { release: 0.20, land: 0.64 }, hind: { release: 0.34, land: 0.84 } });
// Offsets from rest: upper absolute angle, lower absolute angle, foot/hand absolute angle.
// All of these are BODY-LOCAL angles, not raster-cap guesses or changes to bone lengths.
const DEFAULT_FLIGHT = deepFreeze({
  hind: { trail: [8, 8, 10], tuck: [18, 34, 32] },
  fore: { trail: [8, 10, 12], tuck: [14, 4, 24] },
});

/**
 * Branch convention matches ../rig-math.mjs: +1 places the mid joint to the right
 * of the start→goal ray in y-down coordinates. Exact reach limits are supported.
 * Diagnostics retain the requested endpoint; a clamp never changes bone lengths.
 */
export function solveTwoBone(startInput, goalInput, a, b, bend = 1, fallbackAngle = 0) {
  const start = point(startInput, 'start'), goal = point(goalInput, 'goal');
  finite(a, 'upper length'); finite(b, 'lower length'); finite(fallbackAngle, 'fallbackAngle');
  if (a <= 0 || b <= 0 || ![1, -1].includes(bend)) throw new RangeError('Positive lengths and bend ±1 are required');
  const delta = subtract(goal, start), requestedDistance = distance(start, goal);
  const minReach = Math.abs(a - b), maxReach = a + b;
  if (![requestedDistance, maxReach, a * a, b * b].every(Number.isFinite)) throw new RangeError('Chain magnitude exceeds numeric range');
  const solvedDistance = clamp(requestedDistance, minReach, maxReach);
  const direction = requestedDistance > EPS ? { x: delta.x / requestedDistance, y: delta.y / requestedDistance } : vectorAt(fallbackAngle, 1);
  let mid, end;
  if (solvedDistance <= EPS) {
    // Equal-length coincident target: deterministic fully folded solution.
    mid = add(start, { x: direction.y * a * bend, y: -direction.x * a * bend });
    end = { ...start };
  } else {
    const along = (a * a - b * b + solvedDistance * solvedDistance) / (2 * solvedDistance);
    const height = Math.sqrt(Math.max(0, a * a - along * along));
    mid = { x: start.x + direction.x * along + direction.y * height * bend, y: start.y + direction.y * along - direction.x * height * bend };
    end = add(start, { x: direction.x * solvedDistance, y: direction.y * solvedDistance });
  }
  const error = Math.abs(solvedDistance - requestedDistance);
  return { mid, knee: mid, end, clamped: error > EPS, requestedGoal: goal,
    diagnostic: { requestedDistance, solvedDistance, minReach, maxReach, error, reason: error <= EPS ? null : requestedDistance > maxReach ? 'too-far' : 'too-close', bend } };
}

function sampleTrack(track, u) {
  if (u <= 0) return { x: track[0][1], y: track[0][2], angle: track[0][3] };
  if (u >= 1) { const last = track.at(-1); return { x: last[1], y: last[2], angle: last[3] }; }
  const end = track.findIndex(row => row[0] >= u), a = track[end - 1], b = track[end];
  const s = smooth((u - a[0]) / (b[0] - a[0]));
  return { x: lerp(a[1], b[1], s), y: lerp(a[2], b[2], s), angle: angleLerp(a[3], b[3], s) };
}
function rootAt(rig, u) {
  const motion = sampleTrack(rig.rootTrack, u);
  return { ...motion, matrix: multiply(translate(motion.x, motion.y), pivotRotation(rig.bodyPivot, motion.angle)) };
}
function anchorAt(rig, chain, landing) { return add(chain.rest.contact, { x: landing ? rig.travel : 0, y: 0 }); }
function solvePlant(rig, chain, u, landing) {
  const root = rootAt(rig, u), start = transformPoint(root.matrix, chain.rest.start);
  const anchor = anchorAt(rig, chain, landing);
  // Zero world rotation of the whole distal part locks BOTH ankle/wrist and toe/hand.
  const requestedEnd = subtract(anchor, subtract(chain.rest.contact, chain.rest.end));
  const ik = solveTwoBone(start, requestedEnd, chain.lengths[0], chain.lengths[1], chain.bend, chain.restAngles.upper + root.angle);
  return { start, mid: ik.mid, end: ik.end, contact: add(ik.end, subtract(chain.rest.contact, chain.rest.end)), anchor, footAngle: chain.restAngles.distal, ik, root };
}
function plantSafe(rig, chain, u, landing) {
  const result = solvePlant(rig, chain, u, landing), d = result.ik.diagnostic;
  return d.requestedDistance >= d.minReach + rig.contactMargin && d.requestedDistance <= d.maxReach - rig.contactMargin;
}
function boundary(a, b, predicate) {
  const state = predicate(a);
  for (let i = 0; i < 45; i++) { const m = (a + b) / 2; if (predicate(m) === state) a = m; else b = m; }
  return (a + b) / 2;
}
function firstTransition(a, b, predicate, wantState) {
  if (predicate(a) === wantState) return a;
  let previous = a;
  // Deterministic construction-time guard, not stateful per-frame simulation.
  for (let i = 1; i <= 1024; i++) { const u = lerp(a, b, i / 1024); if (predicate(u) === wantState) return boundary(previous, u, predicate); previous = u; }
  return null;
}
function localAngles(solved, chain) {
  const upper = angleOf(subtract(solved.mid, solved.start)) - solved.root.angle;
  const lower = angleOf(subtract(solved.end, solved.mid)) - solved.root.angle;
  return { upper, bendAngle: wrapAngle(lower - upper), distal: solved.footAngle - solved.root.angle };
}
function restAngleOffsets(chain, offsets) {
  const upper = chain.restAngles.upper + offsets[0], lower = chain.restAngles.lower + offsets[1];
  const bendAngle = wrapAngle(lower - upper);
  if (Math.sign(bendAngle) !== chain.bend || Math.abs(bendAngle) > 179.99) throw new RangeError(`${chain.id}: flight offsets cross the configured bend branch`);
  return { upper, bendAngle, distal: chain.restAngles.distal + offsets[2] };
}
function mixAngles(a, b, t) { return { upper: angleLerp(a.upper, b.upper, t), bendAngle: lerp(a.bendAngle, b.bendAngle, t), distal: angleLerp(a.distal, b.distal, t) }; }

/** All custom registration endpoints must come from observed pixels, never image dimensions. */
export function createRig({ joints = {}, registrations = {}, bodyPivot = { x: 650, y: 600 }, duration = 0.72,
  rootTrack = ROOT_TRACK, phases = PHASES, events = {}, flight = {}, airClearance = {}, contactMargin = 0.5 } = {}) {
  finite(duration, 'duration'); finite(contactMargin, 'contactMargin');
  if (duration <= 0 || contactMargin < 0) throw new RangeError('Invalid duration/contact margin');
  const track = rootTrack.map((row, i) => { if (!Array.isArray(row) || row.length !== 4) throw new TypeError('Root-track rows require [u,x,y,angle]'); return row.map((n, j) => finite(n, `rootTrack[${i}][${j}]`)); });
  if (track.length < 2 || track[0][0] !== 0 || track.at(-1)[0] !== 1 || track.some((r, i) => i && r[0] <= track[i - 1][0])) throw new RangeError('Root track must increase from 0 to 1');
  if (track[0].slice(1).some(v => v !== 0) || track.at(-1)[2] !== 0 || wrapAngle(track.at(-1)[3]) !== 0) throw new RangeError('Loop requires rest at start, baseline and zero rotation at end');
  const phaseTrack = phases.map((p, i) => ({ name: String(p.name), start: finite(p.start, `phase[${i}].start`), end: finite(p.end, `phase[${i}].end`) }));
  if (!phaseTrack.length || phaseTrack[0].start !== 0 || phaseTrack.at(-1).end !== 1 || phaseTrack.some((p, i) => p.start >= p.end || (i && p.start !== phaseTrack[i - 1].end))) throw new RangeError('Phases must continuously partition [0,1]');
  const rig = { phases: phaseTrack, canvas: { width: 1254, height: 1254 }, bodyPivot: point(bodyPivot, 'bodyPivot'), duration, rootTrack: track,
    travel: track.at(-1)[1], contactMargin, chains: {}, registrations: {}, drawOrder: [...DRAW_ORDER], safetyDiagnostics: [] };
  for (const id of Object.keys(REST_JOINTS)) {
    const kind = id.startsWith('hind') ? 'hind' : 'fore';
    const rest = Object.fromEntries(Object.entries({ ...REST_JOINTS[id], ...joints[id] }).map(([key, value]) => [key, point(value, `${id}.${key}`)]));
    const lengths = [distance(rest.start, rest.mid), distance(rest.mid, rest.end), distance(rest.end, rest.contact)];
    if (lengths.some(n => n <= EPS || !Number.isFinite(n))) throw new RangeError(`${id}: zero/invalid bone length`);
    const upper = angleOf(subtract(rest.mid, rest.start)), lower = angleOf(subtract(rest.end, rest.mid));
    const bendAngle = wrapAngle(lower - upper), bend = Math.sign(bendAngle);
    if (!bend || Math.abs(bendAngle) > 179.99) throw new RangeError(`${id}: collinear rest joints need a nondegenerate bend branch`);
    const nominal = { ...DEFAULT_EVENTS[kind], ...events[kind], ...events[id] };
    finite(nominal.release, `${id}.release`); finite(nominal.land, `${id}.land`);
    if (!(nominal.release >= 0 && nominal.release < nominal.land && nominal.land <= 1)) throw new RangeError(`${id}: invalid contact order`);
    const parts = kind === 'hind' ? [`${id}-thigh`, `${id}-shank`, `${id}-foot`] : [`${id}-upper`, `${id}-lower`, `${id}-hand`];
    const clearance = airClearance[id] ?? airClearance[kind] ?? (kind === 'hind' ? 8 : 5);
    finite(clearance, `${id}.airClearance`);
    if (clearance < 0) throw new RangeError(`${id}: air clearance must be nonnegative`);
    const chain = { id, kind, rest, lengths, bend, clearance, restAngles: { upper, lower, distal: angleOf(subtract(rest.contact, rest.end)), bendAngle }, parts, nominal };
    rig.chains[id] = chain;
    if (!plantSafe(rig, chain, 0, false)) throw new RangeError(`${id}: rest contact lacks the requested reach margin`);
    const early = firstTransition(0, nominal.release, u => plantSafe(rig, chain, u, false), false);
    const release = early === null ? nominal.release : Math.max(0, early - 1e-8);
    const late = firstTransition(nominal.land, 1, u => plantSafe(rig, chain, u, true), true);
    if (late === null) throw new RangeError(`${id}: final landing cannot reach its anchor`);
    const land = late > nominal.land ? Math.min(1, late + 1e-8) : late;
    const unsafeRecovery = firstTransition(land, 1, u => plantSafe(rig, chain, u, true), false);
    const recoveryRelease = unsafeRecovery === null ? null : Math.max(land, unsafeRecovery - 1e-8);
    // A later unsafe recovery needs art-direction, rather than a contact falsely held.
    chain.events = { release, land, recoveryRelease };
    if (early !== null) rig.safetyDiagnostics.push({ chain: id, reason: 'early-release-before-reach-limit', nominal: nominal.release, actual: release });
    if (land > nominal.land) rig.safetyDiagnostics.push({ chain: id, reason: 'delayed-landing-until-reachable', nominal: nominal.land, actual: land });
    if (recoveryRelease !== null) rig.safetyDiagnostics.push({ chain: id, reason: 'recovery-release-before-reach-limit', nominal: 1, actual: recoveryRelease });
    const f = { ...DEFAULT_FLIGHT[kind], ...flight[kind], ...flight[id] };
    for (const [key, values] of Object.entries(f)) { if (!Array.isArray(values) || values.length !== 3 || values.some(n => !Number.isFinite(n))) throw new TypeError(`${id}.${key}: flight offsets require three finite degrees`); }
    chain.flight = [
      [0, localAngles(solvePlant(rig, chain, release, false), chain)],
      [0.30, restAngleOffsets(chain, f.trail)],
      [0.57, restAngleOffsets(chain, f.tuck)],
      [1, localAngles(solvePlant(rig, chain, land, true), chain)],
    ];
  }
  for (const id of DRAW_ORDER) {
    const input = registrations[id];
    if (!input) { rig.registrations[id] = { path: null, baseTransform: null, status: 'unregistered' }; continue; }
    const m = input.baseTransform;
    if (!Array.isArray(m) || m.length !== 6 || m.some(v => !Number.isFinite(v)) || Math.hypot(m[0], m[1]) <= EPS || Math.abs(m[0] - m[3]) > 1e-7 || Math.abs(m[1] + m[2]) > 1e-7) throw new TypeError(`${id}: baseTransform must be an orientation-preserving similarity`);
    rig.registrations[id] = { ...input, baseTransform: [...m], status: 'registered' };
  }
  return deepFreeze(rig);
}

export const DEFAULT_RIG = createRig();
/** Larger, proof-only preview. Flight targets follow the body, so lift/travel do
 * not create false world-space foot constraints before the actual touchdown. */
export const LARGE_PREVIEW_OPTIONS = deepFreeze({
  duration: 0.78,
  rootTrack: [
    [0, 0, 0, 0], [0.12, 0, 10, 0.6], [0.18, 0, 8, 0.2], [0.30, 8, -8, -1],
    [0.43, 45, -88, -1.5], [0.50, 65, -100, -1], [0.59, 95, -65, 0],
    [0.72, 126, -4, 1], [0.80, 132, 10, 1], [0.90, 132, 5, 0.3], [1, 132, 0, 0],
  ],
  events: { fore: { release: 0.18, land: 0.72 }, hind: { release: 0.30, land: 0.90 } },
  phases: [
    { name: 'prepare', start: 0, end: 0.18 },
    { name: 'push', start: 0.18, end: 0.30 },
    { name: 'flight-trail', start: 0.30, end: 0.44 },
    { name: 'flight-tuck', start: 0.44, end: 0.55 },
    { name: 'landing-prepare', start: 0.55, end: 0.72 },
    { name: 'fore-compression', start: 0.72, end: 0.82 },
    { name: 'hind-recovery', start: 0.82, end: 1 },
  ],
});
export const LARGE_PREVIEW_RIG = createRig(LARGE_PREVIEW_OPTIONS);

/** Inspect a hypothetical fixed contact independently of the active pose.
 * Useful for diagnosing touchdown timing; a positive reachMargin is feasible. */
export function probeContact(progress, { rig = DEFAULT_RIG, chainId, landing = true } = {}) {
  finite(progress, 'progress');
  const chain = rig.chains[chainId];
  if (!chain) throw new RangeError(`Unknown chain: ${chainId}`);
  const solved = solvePlant(rig, chain, clamp(progress, 0, 1), landing), d = solved.ik.diagnostic;
  const reachMargin = Math.min(d.requestedDistance - d.minReach, d.maxReach - d.requestedDistance);
  return { chainId, progress: clamp(progress, 0, 1), anchor: solved.anchor, requestedEnd: solved.ik.requestedGoal,
    start: solved.start, reachMargin, safeWithMargin: reachMargin >= rig.contactMargin, ...d };
}
function rigidBetween(restStart, restEnd, poseStart, poseEnd) {
  let rotation = wrapAngle(angleOf(subtract(poseEnd, poseStart)) - angleOf(subtract(restEnd, restStart)));
  if (Math.abs(rotation) < 1e-10) rotation = 0;
  const matrix = multiply(multiply(translate(poseStart.x, poseStart.y), rotate(rotation)), translate(-restStart.x, -restStart.y));
  return matrix.map((v, i) => i >= 4 && Math.abs(v) < 1e-10 ? 0 : v);
}
function flightPose(rig, chain, u) {
  const root = rootAt(rig, u), s = clamp((u - chain.events.release) / (chain.events.land - chain.events.release), 0, 1);
  const index = Math.max(1, chain.flight.findIndex(row => row[0] >= s));
  const [aT, a] = chain.flight[index - 1], [bT, b] = chain.flight[index];
  const angles = mixAngles(a, b, smooth((s - aT) / (bT - aT)));
  const upper = root.angle + angles.upper, lower = upper + angles.bendAngle, footAngle = root.angle + angles.distal;
  const start = transformPoint(root.matrix, chain.rest.start), mid = add(start, vectorAt(upper, chain.lengths[0]));
  const rawEnd = add(mid, vectorAt(lower, chain.lengths[1])), rawContact = add(rawEnd, vectorAt(footAngle, chain.lengths[2]));
  // Each contact marker has its own projected ground baseline in this oblique
  // drawing. Lift a scripted airborne marker if it would dip below that baseline.
  // The envelope is zero with zero slope at release/landing. This is contact-point
  // clearance only; actual raster silhouettes still need a playback inspection.
  const ceiling = chain.rest.contact.y - chain.clearance * Math.sin(Math.PI * s) ** 2;
  const clearanceLift = Math.max(0, rawContact.y - ceiling);
  const requestedEnd = { x: rawEnd.x, y: rawEnd.y - clearanceLift };
  const ik = solveTwoBone(start, requestedEnd, chain.lengths[0], chain.lengths[1], chain.bend, upper);
  const end = ik.end, contact = add(end, vectorAt(footAngle, chain.lengths[2]));
  return { start, mid: ik.mid, end, contact, footAngle, root, angles, ik, anchor: null, clearanceLift };
}
function phaseAt(rig, u) { return rig.phases.find(phase => u >= phase.start && u < phase.end) || rig.phases.at(-1); }

/**
 * Pure random-access evaluation. timeSeconds clamps unless loop=true. A looping
 * cycle accumulates world travel; applying camera.followHorizontal removes only
 * that travel, so playback has no sprite teleport while world contacts still move.
 */
export function evaluateHop(timeSeconds = 0, { rig = DEFAULT_RIG, loop = false, worldOrigin = { x: 0, y: 0 } } = {}) {
  finite(timeSeconds, 'timeSeconds'); const origin = point(worldOrigin, 'worldOrigin');
  let cycle = 0, u;
  if (loop) { cycle = Math.floor(timeSeconds / rig.duration); u = (timeSeconds - cycle * rig.duration) / rig.duration; }
  else u = clamp(timeSeconds / rig.duration, 0, 1);
  // Multiplying an exact event fraction by duration and dividing back can land
  // one ulp below the event. Snap only numerical noise, not a visible time span.
  const boundaries = [0, 1, ...rig.phases.map(p => p.start), ...Object.values(rig.chains).flatMap(c => [c.events.release, c.events.land, c.events.recoveryRelease].filter(v => v !== null))];
  const exact = boundaries.find(value => Math.abs(value - u) < 1e-12);
  if (exact !== undefined) u = exact;
  if (!Number.isFinite(cycle * rig.travel + origin.x)) throw new RangeError('World travel exceeds numeric range');
  const root = rootAt(rig, u), cycleShift = { x: origin.x + cycle * rig.travel, y: origin.y }, world = translate(cycleShift.x, cycleShift.y);
  const bodyMatrix = multiply(world, root.matrix), transforms = { 'body-head': bodyMatrix }, chains = {}, contacts = {}, diagnostics = [];
  for (const chain of Object.values(rig.chains)) {
    const initial = u < chain.events.release || (u === 0 && chain.events.release > 0);
    const recovered = u >= chain.events.land && (chain.events.recoveryRelease === null || u < chain.events.recoveryRelease);
    let solved, state;
    if (initial || recovered) { solved = solvePlant(rig, chain, u, recovered); state = initial ? 'planted-push' : 'planted-recovery'; }
    else if (chain.events.recoveryRelease !== null && u >= chain.events.recoveryRelease) {
      // Hold the last feasible LOCAL articulation after safety release. This is
      // a diagnostic fallback requiring pose retuning, not a sliding fake plant.
      const last = solvePlant(rig, chain, chain.events.recoveryRelease, true), a = localAngles(last, chain);
      const start = transformPoint(root.matrix, chain.rest.start), mid = add(start, vectorAt(root.angle + a.upper, chain.lengths[0]));
      const end = add(mid, vectorAt(root.angle + a.upper + a.bendAngle, chain.lengths[1]));
      const footAngle = root.angle + a.distal;
      solved = { start, mid, end, contact: add(end, vectorAt(footAngle, chain.lengths[2])), footAngle, anchor: null, root, ik: null };
      state = 'released-reach-limit';
    } else { solved = flightPose(rig, chain, u); state = 'airborne'; }
    if (solved.ik?.clamped) diagnostics.push({ chain: chain.id, ...solved.ik.diagnostic });
    const joints = Object.fromEntries(['start', 'mid', 'end', 'contact'].map(key => [key, add(solved[key], cycleShift)]));
    for (let i = 0; i < 3; i++) {
      const names = ['start', 'mid', 'end', 'contact'];
      transforms[chain.parts[i]] = rigidBetween(chain.rest[names[i]], chain.rest[names[i + 1]], joints[names[i]], joints[names[i + 1]]);
    }
    const upper = angleOf(subtract(joints.mid, joints.start)), lower = angleOf(subtract(joints.end, joints.mid));
    chains[chain.id] = { joints, lengths: chain.lengths, bend: chain.bend, clearanceLift: solved.clearanceLift ?? 0,
      angles: { upper: wrapAngle(upper), lower: wrapAngle(lower), distal: wrapAngle(solved.footAngle), bendAngle: wrapAngle(lower - upper) } };
    const lockedPoint = solved.anchor ? add(solved.anchor, cycleShift) : null;
    const planted = Boolean(lockedPoint) && !solved.ik?.clamped;
    contacts[chain.id] = { state: solved.ik?.clamped ? 'released-clamp' : state, planted, point: joints.contact,
      lockedPoint: planted ? lockedPoint : null, error: lockedPoint ? distance(joints.contact, lockedPoint) : null,
      nominal: chain.nominal, effective: chain.events };
  }
  const phase = phaseAt(rig, u), travel = cycle * rig.travel + root.x;
  const parts = Object.fromEntries(DRAW_ORDER.map(id => [id, { ...rig.registrations[id], id, poseTransform: transforms[id] }]));
  return { timeSeconds, cycle, progress: u, duration: rig.duration, phase: phase.name,
    phaseProgress: clamp((u - phase.start) / (phase.end - phase.start), 0, 1),
    root: { position: transformPoint(bodyMatrix, rig.bodyPivot), translation: { x: origin.x + travel, y: origin.y + root.y },
      travel, height: -root.y, rotationDegrees: root.angle, poseTransform: bodyMatrix },
    camera: { followHorizontal: translate(-origin.x - travel, -origin.y) },
    parts, transforms, chains, contacts, drawOrder: rig.drawOrder,
    diagnostics: { ikClamps: diagnostics, contactSafety: rig.safetyDiagnostics, needsRetuning: diagnostics.length > 0 || rig.safetyDiagnostics.length > 0 },
  };
}

/** Renderer order: context.transform(camera); transform(pose); transform(base); drawImage(image,0,0). */
export function composeRasterTransform(part, camera = IDENTITY) {
  if (!part.baseTransform) throw new Error(`${part.id}: actual art registration is missing`);
  return multiply(multiply(camera, part.poseTransform), part.baseTransform);
}
