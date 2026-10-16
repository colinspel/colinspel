// Shared motion model for every view.
// Players: cubic Hermite spline through observed positions (freeze frames + event anchors),
// so runs keep their momentum through each observation instead of stopping at every frame.
// Ball: driven by event segments. Passes decelerate along the ground or arc through the air
// by StatsBomb's pass height; carries keep the ball at the carrier's feet; shots fly to the
// recorded end point and height.

function hermite(pts, t) {
  const n = pts.length;
  if (n === 1 || t <= pts[0][0]) return [pts[0][1], pts[0][2]];
  if (t >= pts[n - 1][0]) return [pts[n - 1][1], pts[n - 1][2]];
  let i = 1; while (pts[i][0] < t) i++;
  const a = pts[i - 1], b = pts[i], h = Math.max(1e-3, b[0] - a[0]), s = (t - a[0]) / h;
  const chord = Math.hypot(b[1] - a[1], b[2] - a[2]);
  const tan = (k) => {
    const p = pts[Math.max(0, k - 1)], q = pts[Math.min(n - 1, k + 1)], dt = q[0] - p[0];
    if (dt <= 0) return [0, 0];
    let vx = (q[1] - p[1]) / dt, vy = (q[2] - p[2]) / dt;
    const sp = Math.hypot(vx, vy), lim = Math.min(9, 1.4 * chord / h + 0.5);   // no overshoot loops
    if (sp > lim) { vx *= lim / sp; vy *= lim / sp; }
    return [vx, vy];
  };
  const ma = tan(i - 1), mb = tan(i);
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return [h00 * a[1] + h10 * h * ma[0] + h01 * b[1] + h11 * h * mb[0],
          h00 * a[2] + h10 * h * ma[1] + h01 * b[2] + h11 * h * mb[1]];
}
function trackPos(tr, t) { return hermite(tr.pts, t); }
function trackVel(tr, t) {
  const a = hermite(tr.pts, t - 0.06), b = hermite(tr.pts, t + 0.06);
  return [(b[0] - a[0]) / 0.12, (b[1] - a[1]) / 0.12];
}
function lerp2(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }

function ballState(goal, t) {
  const S = goal.bseg || [];
  if (!S.length) { const p = window.__lerpBall(goal.ball, t); return { x: p[0], y: p[1], z: 0.11, carrier: -1, kind: 'rest' }; }
  let act = null, prev = null, next = null;
  for (const sg of S) { if (t >= sg[0] && t <= sg[1]) act = sg; if (sg[1] <= t) prev = sg; if (!next && sg[0] > t) next = sg; }
  if (!act) {
    if (!prev) { const f = S[0]; return { x: f[3], y: f[4], z: 0.11, carrier: -1, kind: 'rest' }; }
    if (prev[2] === 's') return { x: prev[5], y: prev[6], z: Math.max(0.11, prev[7]), carrier: -1, kind: 'net' };
    // between touches the ball drifts from where it arrived to where it is next played,
    // so it never jumps between the end of one event and the start of the next
    if (next) {
      const f = Math.min(1, Math.max(0, (t - prev[1]) / Math.max(0.05, next[0] - prev[1])));
      const q = lerp2([prev[5], prev[6]], [next[3], next[4]], f);
      return { x: q[0], y: q[1], z: 0.11, carrier: next[2] === 'c' ? next[8] : -1, kind: 'rest' };
    }
    return { x: prev[5], y: prev[6], z: 0.11, carrier: -1, kind: 'rest' };
  }
  const [t0, t1, kind, x0, y0, x1, y1, h, ci] = act;
  const f = Math.min(1, Math.max(0, (t - t0) / Math.max(0.05, t1 - t0)));
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (kind === 'c') {
    const tr = ci >= 0 ? goal.tracks[ci] : null;
    if (tr) {
      const p = trackPos(tr, t), v = trackVel(tr, t), sp = Math.hypot(v[0], v[1]);
      const d = sp > 0.6 ? [v[0] / sp, v[1] / sp] : [(x1 - x0) / (dist || 1), (y1 - y0) / (dist || 1)];
      // blend from the exact start point and into the exact end point so the hand-offs line up
      const lead = 0.55, w = Math.min(1, f / 0.15, (1 - f) / 0.15);
      const feet = [p[0] + d[0] * lead, p[1] + d[1] * lead];
      const line = lerp2([x0, y0], [x1, y1], f);
      const q = lerp2(line, feet, w);
      return { x: q[0], y: q[1], z: 0.11 + 0.05 * Math.abs(Math.sin(f * dist * 1.4)), carrier: ci, kind };
    }
    const q = lerp2([x0, y0], [x1, y1], f); return { x: q[0], y: q[1], z: 0.11, carrier: -1, kind };
  }
  if (kind === 'p') {
    const fe = h === 0 ? 1 - Math.pow(1 - f, 1.7) : f;            // ground passes slow down; lofted ones fly evenly
    const q = lerp2([x0, y0], [x1, y1], fe);
    const peak = h === 0 ? 0 : h === 1 ? Math.min(1.6, dist * 0.06) : Math.min(9, 1.2 + dist * 0.17);
    return { x: q[0], y: q[1], z: 0.11 + 4 * peak * f * (1 - f), carrier: -1, kind };
  }
  // shot: fast, ends at the recorded height
  const q = lerp2([x0, y0], [x1, y1], f);
  const endz = Math.max(0.11, h || 0.11), lift = endz > 1.2 ? 0.6 : 0.2;
  return { x: q[0], y: q[1], z: 0.11 + (endz - 0.11) * f + 4 * lift * f * (1 - f), carrier: -1, kind };
}
