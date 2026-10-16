// 3D game view (three.js). World mapping: StatsBomb (x along pitch, y across, z up)
// -> three (X = y, Y = z, Z = -x). Leverkusen attack towards -Z, away from the camera.
// Players are procedural low-poly footballers with a running rig driven by the data.

function makeGame3D(stage) {
  const T = window.THREE;
  const glCanvas = stage.querySelector('.gp-gl'), hudCanvas = stage.querySelector('.gp-hud');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const hud = hudCanvas.getContext('2d');
  const scene = new T.Scene();
  const sky = document.createElement('canvas'); sky.width = 4; sky.height = 256; const sg = sky.getContext('2d');
  const grd = sg.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#04070d'); grd.addColorStop(.55, '#0d1726'); grd.addColorStop(1, '#22324a');
  sg.fillStyle = grd; sg.fillRect(0, 0, 4, 256); const skyT = new T.CanvasTexture(sky); skyT.colorSpace = T.SRGBColorSpace; scene.background = skyT;
  scene.fog = new T.Fog('#0a1019', 70, 150);
  const camera = new T.PerspectiveCamera(48, 0.8, 0.3, 400);
  const W3 = (x, y, z = 0) => new T.Vector3(y, z, -x);

  // ---------------- lights
  scene.add(new T.HemisphereLight('#dfe9ff', '#2b4a22', 0.9));
  const sun = new T.DirectionalLight('#fff6e8', 2.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 140;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);

  // ---------------- pitch texture: mowing stripes + lines, 14 px per yard
  const PX = 14, gx0 = -8, gy0 = -10, GW = 136, GH = 100;
  const pc = document.createElement('canvas'); pc.width = GH * PX; pc.height = GW * PX;  // u = y, v = x
  const g = pc.getContext('2d');
  const toC = (x, y) => [(y - gy0) * PX, (gx0 + GW - x) * PX];
  g.fillStyle = '#2f7a35'; g.fillRect(0, 0, pc.width, pc.height);
  for (let s = 0; s < 20; s++) { const [, ya] = toC(s * 6 + 6, 0), [, yb] = toC(s * 6, 0); g.fillStyle = s % 2 ? '#3d9142' : '#358539'; const [xa] = toC(0, -2), [xb] = toC(0, 82); g.fillRect(xa, ya, xb - xa, yb - ya); }
  // fine grass noise
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90000; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,255,255'},${0.03 + rnd() * 0.03})`; g.fillRect(rnd() * pc.width, rnd() * pc.height, 2, 2); }
  g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 0.13 * PX; g.lineCap = 'round';
  const ln = (a, b, c, d) => { const p = toC(a, b), q = toC(c, d); g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.stroke(); };
  ln(0, 0, 120, 0); ln(0, 80, 120, 80); ln(0, 0, 0, 80); ln(120, 0, 120, 80); ln(60, 0, 60, 80);
  for (const [x0, x1] of [[102, 120], [0, 18]]) { ln(x0, 18, x1, 18); ln(x0, 62, x1, 62); ln(x0 === 102 ? 102 : 18, 18, x0 === 102 ? 102 : 18, 62); }
  for (const [x0, x1] of [[114, 120], [0, 6]]) { ln(x0, 30, x1, 30); ln(x0, 50, x1, 50); ln(x0 === 114 ? 114 : 6, 30, x0 === 114 ? 114 : 6, 50); }
  const arc = (cx, cy, r, a0, a1) => { g.beginPath(); for (let i = 0; i <= 64; i++) { const a = a0 + (a1 - a0) * i / 64; const p = toC(cx + r * Math.cos(a), cy + r * Math.sin(a)); i ? g.lineTo(...p) : g.moveTo(...p); } g.stroke(); };
  arc(60, 40, 10, 0, Math.PI * 2); arc(108, 40, 10, Math.PI * .705, Math.PI * 1.295); arc(12, 40, 10, -Math.PI * .295, Math.PI * .295);
  for (const [x, y] of [[60, 40], [108, 40], [12, 40]]) { const p = toC(x, y); g.fillStyle = '#fff'; g.beginPath(); g.arc(p[0], p[1], 0.25 * PX, 0, 7); g.fill(); }
  const ptex = new T.CanvasTexture(pc); ptex.colorSpace = T.SRGBColorSpace; ptex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pitch = new T.Mesh(new T.PlaneGeometry(GH, GW), new T.MeshLambertMaterial({ map: ptex }));
  pitch.rotation.x = -Math.PI / 2; pitch.position.copy(W3(gx0 + GW / 2, gy0 + GH / 2)); pitch.receiveShadow = true; scene.add(pitch);

  // ---------------- stands with a crowd texture
  const cc = document.createElement('canvas'); cc.width = 1024; cc.height = 256; const cg = cc.getContext('2d');
  cg.fillStyle = '#1a2230'; cg.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 9000; i++) { const h = rnd(); cg.fillStyle = h < .35 ? `hsl(${355 + rnd() * 10},62%,${26 + rnd() * 22}%)` : h < .6 ? `hsl(0,0%,${55 + rnd() * 35}%)` : `hsl(${200 + rnd() * 40},20%,${18 + rnd() * 20}%)`;
    cg.fillRect(rnd() * 1024, rnd() * 256, 3, 4); }
  const ctex = new T.CanvasTexture(cc); ctex.colorSpace = T.SRGBColorSpace; ctex.wrapS = ctex.wrapT = T.RepeatWrapping;
  const standMat = (rep) => { const t = ctex.clone(); t.needsUpdate = true; t.repeat.set(rep, 2); return new T.MeshLambertMaterial({ map: t }); };
  const stand = (cx, cy, len, rot, rep) => {
    const m = new T.Mesh(new T.PlaneGeometry(len, 16), standMat(rep));
    m.position.copy(W3(cx, cy, 6.5)); m.rotation.set(0, rot, 0); m.rotateX(-0.62); scene.add(m);
  };
  stand(60, -15, 150, Math.PI / 2, 6); stand(60, 95, 150, -Math.PI / 2, 6);
  stand(137, 40, 110, 0, 4); stand(-17, 40, 110, Math.PI, 4);
  // advertising boards
  const bc = document.createElement('canvas'); bc.width = 512; bc.height = 32; const bg = bc.getContext('2d');
  bg.fillStyle = '#0e1726'; bg.fillRect(0, 0, 512, 32); bg.fillStyle = '#d81e2c'; bg.fillRect(0, 26, 512, 6);
  bg.fillStyle = '#e8edf5'; bg.font = '700 18px system-ui,sans-serif'; bg.fillText('UNBEATEN  ·  2023-24  ·  UNBEATEN  ·  2023-24', 12, 20);
  const btex = new T.CanvasTexture(bc); btex.colorSpace = T.SRGBColorSpace; btex.wrapS = T.RepeatWrapping; btex.repeat.set(5, 1);
  const board = (cx, cy, len, rot) => { const m = new T.Mesh(new T.PlaneGeometry(len, 1), new T.MeshBasicMaterial({ map: btex })); m.position.copy(W3(cx, cy, 0.5)); m.rotation.y = rot; scene.add(m); };
  board(60, -3, 124, Math.PI / 2); board(60, 83, 124, -Math.PI / 2); board(123.5, 40, 86, 0);

  // ---------------- goals
  const white = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .4 });
  const netMat = new T.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .35 });
  function goal(xg, dir) {
    const y1 = 36.34, y2 = 43.66, h = 2.67, d = 2.2 * dir, r = 0.07;
    const post = (y) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, h, 12), white); m.position.copy(W3(xg, y, h / 2)); m.castShadow = true; scene.add(m); };
    post(y1); post(y2);
    const bar = new T.Mesh(new T.CylinderGeometry(r, r, y2 - y1 + 2 * r, 12), white); bar.rotation.z = Math.PI / 2; bar.position.copy(W3(xg, 40, h)); bar.castShadow = true; scene.add(bar);
    const P = [];
    for (let i = 0; i <= 14; i++) { const y = y1 + (y2 - y1) * i / 14; P.push(W3(xg, y, h), W3(xg + d, y, h * .8), W3(xg + d, y, h * .8), W3(xg + d, y, 0)); }
    for (let k = 0; k <= 6; k++) { const z = h * k / 6; P.push(W3(xg + d, y1, z * .8), W3(xg + d, y2, z * .8), W3(xg, y1, z), W3(xg + d, y1, z * .8), W3(xg, y2, z), W3(xg + d, y2, z * .8)); }
    for (let k = 0; k <= 5; k++) { const x = xg + d * k / 5; P.push(W3(x, y1, h - (h * .2) * k / 5), W3(x, y2, h - (h * .2) * k / 5)); }
    scene.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(P), netMat));
  }
  goal(120, 1); goal(0, -1);

  // ---------------- footballer rig
  const KIT = { L: { shirt: '#d81e2c', trim: '#111111', shorts: '#151515', socks: '#d81e2c', num: '#ffffff' },
                O: { shirt: '#f1f3f6', trim: '#1d2b4f', shorts: '#1d2b4f', socks: '#f1f3f6', num: '#1d2b4f' },
                GL: { shirt: '#2fbf71', trim: '#0b2a18', shorts: '#2fbf71', socks: '#2fbf71', num: '#0b2a18' },
                GO: { shirt: '#f5d33a', trim: '#202020', shorts: '#202020', socks: '#f5d33a', num: '#202020' } };
  const SKINS = ['#e0b48f', '#c99b72', '#a9764e', '#7d5236', '#5c3b26'], HAIRS = ['#1d1612', '#3b2a1e', '#6b4a2b', '#151515', '#a07c4f'];
  const matCache = {};
  const mat = (c, rough = .85) => matCache[c + rough] || (matCache[c + rough] = new T.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 }));
  const numTex = {};
  function numberTexture(n, color, bg) {
    const key = n + color + bg; if (numTex[key]) return numTex[key];
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 128, 128); x.fillStyle = color; x.font = '900 86px system-ui,Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(n, 64, 70); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return (numTex[key] = t);
  }
  const cap = (r, len, m) => { const mesh = new T.Mesh(new T.CapsuleGeometry(r, len, 4, 10), m); mesh.castShadow = true; return mesh; };
  function makeFootballer(kitKey, num, look) {
    const k = KIT[kitKey], skin = mat(SKINS[look % SKINS.length], .7), hair = mat(HAIRS[(look * 7) % HAIRS.length], .9);
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const hips = new T.Group(); hips.position.y = 0.96; body.add(hips);
    const shorts = new T.Mesh(new T.CylinderGeometry(0.2, 0.235, 0.27, 14), mat(k.shorts)); shorts.position.y = -0.06; shorts.scale.z = .8; shorts.castShadow = true; hips.add(shorts);
    const legs = [];
    for (const side of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(side * 0.105, -0.06, 0); hips.add(hip);
      const thigh = cap(0.082, 0.3, skin); thigh.position.y = -0.21; hip.add(thigh);
      const shortLeg = new T.Mesh(new T.CylinderGeometry(0.105, 0.11, 0.16, 12), mat(k.shorts)); shortLeg.position.y = -0.1; shortLeg.castShadow = true; hip.add(shortLeg);
      const knee = new T.Group(); knee.position.y = -0.43; hip.add(knee);
      const shin = cap(0.07, 0.3, mat(k.socks)); shin.position.y = -0.2; knee.add(shin);
      const boot = new T.Mesh(new T.BoxGeometry(0.11, 0.08, 0.27), mat('#141414', .5)); boot.position.set(0, -0.43, -0.06); boot.castShadow = true; knee.add(boot);
      legs.push({ hip, knee });
    }
    const torso = new T.Group(); torso.position.y = 0.02; hips.add(torso);
    const chest = cap(0.2, 0.26, mat(k.shirt, .75)); chest.scale.set(1.18, 1, 0.72); chest.position.y = 0.33; torso.add(chest);
    const collar = new T.Mesh(new T.TorusGeometry(0.075, 0.022, 6, 16), mat(k.trim)); collar.rotation.x = Math.PI / 2; collar.position.y = 0.6; torso.add(collar);
    if (num) {
      const back = new T.Mesh(new T.PlaneGeometry(0.26, 0.26), new T.MeshStandardMaterial({ map: numberTexture(num, k.num, k.shirt), roughness: .75 }));
      back.position.set(0, 0.37, 0.148); torso.add(back);
    }
    const arms = [];
    for (const side of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(side * 0.27, 0.52, 0); torso.add(sh);
      const sleeve = cap(0.07, 0.12, mat(k.shirt, .75)); sleeve.position.y = -0.1; sh.add(sleeve);
      const upper = cap(0.055, 0.14, skin); upper.position.y = -0.2; sh.add(upper);
      const elbow = new T.Group(); elbow.position.y = -0.3; sh.add(elbow);
      const fore = cap(0.05, 0.2, skin); fore.position.y = -0.13; elbow.add(fore);
      sh.rotation.z = side * 0.12; arms.push({ sh, elbow });
    }
    const neck = new T.Mesh(new T.CylinderGeometry(0.055, 0.06, 0.1, 10), skin); neck.position.y = 0.66; torso.add(neck);
    const head = new T.Group(); head.position.y = 0.8; torso.add(head);
    const skull = new T.Mesh(new T.SphereGeometry(0.115, 18, 14), skin); skull.scale.set(.92, 1.06, .98); skull.castShadow = true; head.add(skull);
    const hairM = new T.Mesh(new T.SphereGeometry(0.122, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); hairM.position.y = 0.012; hairM.rotation.x = 0.35; head.add(hairM);
    for (const side of [-1, 1]) { const ear = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), skin); ear.position.set(side * 0.108, -0.005, 0.01); head.add(ear); }
    root.userData = { legs, arms, torso, body, head, hips };
    return root;
  }
  function pose(p, phase, amp, idle) {
    const u = p.userData, s = Math.sin(phase) * amp, c = Math.cos(phase);
    u.legs[0].hip.rotation.x = s * 0.85 - 0.05 * amp; u.legs[1].hip.rotation.x = -s * 0.85 - 0.05 * amp;
    u.legs[0].knee.rotation.x = -(Math.max(0, -s) * 1.5 + 0.18 * amp + 0.05);
    u.legs[1].knee.rotation.x = -(Math.max(0, s) * 1.5 + 0.18 * amp + 0.05);
    u.arms[0].sh.rotation.x = -s * 0.9; u.arms[1].sh.rotation.x = s * 0.9;
    u.arms[0].elbow.rotation.x = 0.35 + amp * 0.9; u.arms[1].elbow.rotation.x = 0.35 + amp * 0.9;
    u.torso.rotation.x = -0.2 * amp; u.body.position.y = Math.abs(c) * 0.05 * amp - 0.03 * amp;
    u.torso.rotation.y = s * 0.12;
    if (idle) { u.arms[0].sh.rotation.x = 0.05; u.arms[1].sh.rotation.x = 0.05; }
  }

  // ---------------- ball
  const bcv = document.createElement('canvas'); bcv.width = 256; bcv.height = 128; const bx = bcv.getContext('2d');
  bx.fillStyle = '#f7f7f7'; bx.fillRect(0, 0, 256, 128); bx.fillStyle = '#1b1b1b';
  for (let i = 0; i < 12; i++) { const px = (i % 6) * 44 + (i > 5 ? 22 : 0) + 10, py = i > 5 ? 88 : 36; bx.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; bx.lineTo(px + 12 * Math.cos(a), py + 12 * Math.sin(a)); } bx.fill(); }
  const balltex = new T.CanvasTexture(bcv); balltex.colorSpace = T.SRGBColorSpace;
  const ball = new T.Mesh(new T.SphereGeometry(0.12, 24, 16), new T.MeshStandardMaterial({ map: balltex, roughness: .45 }));
  ball.castShadow = true; scene.add(ball);

  // ---------------- per-goal actors
  let actors = [], curGoal = null;
  function setup(goalData) {
    actors.forEach(a => scene.remove(a.obj)); actors = [];
    goalData.tracks.forEach((tr, i) => {
      const kit = tr.keeper ? (tr.team === 'L' ? 'GL' : 'GO') : tr.team;
      const obj = makeFootballer(kit, tr.team === 'L' ? tr.num : null, (tr.num || i * 3 + 1) + (tr.team === 'L' ? 0 : 2));
      obj.traverse(m => { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; } });
      scene.add(obj);
      let d = 0; tr.cum = [0]; for (let k = 1; k < tr.pts.length; k++) { d += Math.hypot(tr.pts[k][1] - tr.pts[k - 1][1], tr.pts[k][2] - tr.pts[k - 1][2]); tr.cum.push(d); }
      actors.push({ tr, obj, heading: null, i });
    });
    curGoal = goalData;
  }
  function stridePhase(tr, t) {
    // distance travelled along the spline, sampled coarsely: phase advances with ground covered
    const st = Math.max(tr.pts[0][0], t - 8), span = Math.max(0, t - st);
    let dist = 0, prev = trackPos(tr, st);
    for (let k = 1; k <= 32; k++) { const tt = st + span * k / 32; const q = trackPos(tr, tt); dist += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
    return dist * 2.35;
  }
  function setOpacity(obj, o) { obj.visible = o > 0.02; obj.traverse(m => { if (m.material) { m.material.opacity = o; m.material.depthWrite = o > 0.98; } }); }

  let W = 0, H = 0, dpr = 1, K = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); W = Math.max(200, r.width); H = W * 1.25; K = W / 400;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    hudCanvas.width = W * dpr; hudCanvas.height = H * dpr;
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', () => { resize(); if (curGoal) render(curGoal, lastT); });

  // ---------------- camera: same rules as the 2D view, ball never leaves frame
  const camState = { x: 0, y: 40 };
  function placeCamera(goalData, t, bs) {
    let sx = 0, sy = 0; for (let k = 0; k <= 8; k++) { const q = ballState(goalData, Math.max(0, t - k * 0.07)); sx += q.x; sy += q.y; } sx /= 9; sy /= 9;
    const box = Math.max(0, Math.min(1, (sx - 92) / 14));
    const cx = Math.min(sx - 16.5, 100, bs.x - 9), cz = 8.8, phi = 0.38;
    let cy = 40 + (sy - 40) * (0.93 - 0.55 * box);
    const dep = (bs.x - cx) * Math.cos(phi) + cz * Math.sin(phi), half = dep * Math.tan(48 / 2 * Math.PI / 180) * (W / H) * 0.72;
    cy = Math.max(bs.y - half, Math.min(bs.y + half, cy));
    camera.position.copy(W3(cx, cy, cz));
    camera.lookAt(W3(cx + cz / Math.tan(phi), cy, 0));
    sun.position.copy(W3(cx + 10, cy - 30, 60)); sun.target.position.copy(W3(cx + 22, cy, 0)); sun.target.updateMatrixWorld();
  }

  let lastT = 0;
  function render(goalData, t) {
    if (goalData !== curGoal) setup(goalData);
    lastT = t;
    const bs = ballState(goalData, t);
    placeCamera(goalData, t, bs);
    let carrier = null, cd = 2.5;
    actors.forEach(a => {
      // the player on the ball is always drawn, even if the camera data briefly lost him
      const o = (bs.carrier === a.i) ? 1 : opacity(a.tr, t, goalData.dur);
      setOpacity(a.obj, o); if (!a.obj.visible) return;
      const p = trackPos(a.tr, t), v = trackVel(a.tr, t), sp = Math.hypot(v[0], v[1]);
      a.obj.position.copy(W3(p[0], p[1], 0));
      // face where they run; when slow, face the ball
      let dx = v[0], dy = v[1];
      if (sp < 1.2) { dx = bs.x - p[0]; dy = bs.y - p[1]; }
      const hd = Math.atan2(-dy, dx);   // three: forward (-Z) is +x in pitch; rotation.y = atan2(-X3, -Z3) with X3=dy, Z3=-dx
      a.heading = a.heading === null ? hd : a.heading + Math.atan2(Math.sin(hd - a.heading), Math.cos(hd - a.heading)) * 0.35;
      a.obj.rotation.y = a.heading;
      const amp = Math.min(1, sp / 6.5);
      pose(a.obj, stridePhase(a.tr, t), amp, sp < 0.4);
      if (a.tr.team === 'L' && a.tr.name) { const d = (bs.carrier === a.i) ? 0 : Math.hypot(p[0] - bs.x, p[1] - bs.y); if (d < cd) { cd = d; carrier = a; } }
    });
    ball.position.copy(W3(bs.x, bs.y, bs.z));
    ball.rotation.x = -(bs.x * 2.1); ball.rotation.z = bs.y * 2.1;
    renderer.render(scene, camera);
    drawHud(goalData, t, carrier);
  }

  // ---------------- HUD overlay
  const ABBR = { 'Bayern Munich': 'FCB', 'Borussia Dortmund': 'BVB', 'RB Leipzig': 'RBL', 'VfB Stuttgart': 'VFB', 'Eintracht Frankfurt': 'SGE',
    'Hoffenheim': 'TSG', 'Freiburg': 'SCF', 'Augsburg': 'FCA', 'Werder Bremen': 'SVW', 'Borussia Mönchengladbach': 'BMG', 'Wolfsburg': 'WOB',
    'Union Berlin': 'FCU', 'Bochum': 'BOC', 'FC Heidenheim': 'HDH', 'FSV Mainz 05': 'M05', 'FC Köln': 'KOE', 'Darmstadt 98': 'D98' };
  function drawHud(goalData, t, carrier) {
    const c = hud; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    if (carrier) {
      const head = new T.Vector3(); carrier.obj.userData.head.getWorldPosition(head); head.y += 0.32; head.project(camera);
      const x = (head.x + 1) / 2 * W, y = (1 - head.y) / 2 * H;
      c.save(); c.translate(x, y); c.scale(K, K);
      const text = `${carrier.tr.num ? carrier.tr.num + '  ' : ''}${carrier.tr.name.toUpperCase()}`;
      c.font = '700 12px system-ui,sans-serif'; const w = c.measureText(text).width + 14;
      c.fillStyle = 'rgba(10,14,22,.85)'; c.beginPath(); c.roundRect(-w / 2, -30, w, 19, 9.5); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, -20.5);
      c.fillStyle = '#ffd94a'; c.beginPath(); c.moveTo(-5, -9); c.lineTo(5, -9); c.lineTo(0, -3); c.closePath(); c.fill();
      c.restore();
    }
    const m = goalData.meta, opp = ABBR[m.opponent] || m.opponent.slice(0, 3).toUpperCase();
    const [lf, la] = m.score_before, goalNow = t >= goalData.dur - 1.15;
    const Lb = m.home ? 'LEV' : opp, Rb = m.home ? opp : 'LEV';
    const sl = m.home ? (goalNow ? lf + 1 : lf) : la, sr = m.home ? la : (goalNow ? lf + 1 : lf);
    const tot = (m.minute * 60 + m.second) - Math.max(0, goalData.dur - 1.2 - t);
    const mm = Math.max(0, Math.floor(tot / 60)), ss = Math.max(0, Math.floor(tot % 60));
    c.save(); c.scale(K, K); const Wk = W / K;
    c.font = '800 13px system-ui,sans-serif'; c.textBaseline = 'middle';
    const x = 12, y = 12, h = 26;
    c.fillStyle = 'rgba(8,12,20,.88)'; c.beginPath(); c.roundRect(x, y, 158, h, 6); c.fill();
    c.fillStyle = m.home ? '#d81e2c' : '#f2f3f5'; c.fillRect(x + 6, y + 6, 4, 14);
    c.fillStyle = m.home ? '#f2f3f5' : '#d81e2c'; c.fillRect(x + 86, y + 6, 4, 14);
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(Lb, x + 14, y + h / 2); c.fillText(Rb, x + 94, y + h / 2);
    c.textAlign = 'center'; c.fillText(`${sl}-${sr}`, x + 67, y + h / 2);
    c.fillStyle = 'rgba(8,12,20,.88)'; c.beginPath(); c.roundRect(x + 162, y, 52, h, 6); c.fill();
    c.fillStyle = '#9fe870'; c.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, x + 188, y + h / 2);
    c.fillStyle = 'rgba(8,12,20,.75)'; c.beginPath(); c.roundRect(Wk - 74, y, 62, h, 6); c.fill();
    c.fillStyle = '#fff'; c.font = '700 11px system-ui,sans-serif'; c.fillText(`xG ${m.xg.toFixed(2)}`, Wk - 43, y + h / 2);
    c.restore();
    if (goalNow) {
      const k = Math.min(1, (t - (goalData.dur - 1.15)) / 0.35);
      c.save(); c.globalAlpha = k;
      c.fillStyle = 'rgba(216,30,44,.92)'; c.fillRect(0, H * .70, W, H * .13);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${Math.round(W * .13)}px system-ui,sans-serif`;
      c.fillText('GOAL', W / 2, H * .745);
      c.font = `700 ${Math.round(W * .042)}px system-ui,sans-serif`;
      c.fillText(`${m.scorer.toUpperCase()} ${mlabel(m)}${m.assist ? '  ·  ASSIST ' + m.assist.toUpperCase() : ''}`, W / 2, H * .798);
      c.restore();
    }
  }
  return { render, resize };
}
