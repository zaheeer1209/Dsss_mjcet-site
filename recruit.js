/* DSSS homepage — "Join the inner circle" recruitment scene (poster theme: ink, paper, signal red).
   A 3D tunnel of three rings (MJCET → DSSS → EXECOM & CORE) around a red core ("you").
   The camera flies the red "start here" path through the rings into the core as you scroll.
   Needs three.js r128 (window.THREE). home.js drives it with Recruit.progress(0→1); without
   GSAP or with reduced motion it renders one still frame of the poster view. */
window.Recruit = (() => {
  const T = window.THREE;
  const sec = document.getElementById('recruit'), cv = document.getElementById('recGL');
  if (!T || !sec || !cv) return { progress(){}, still(){}, ok:false };

  const INK = 0x0A0A0A, PAPER = 0xF4F3EF, RED = 0xFF2E1F;
  const small = innerWidth < 760;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mix = (a, b, t) => a + (b - a)*t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
  const band = (p, a, b) => clamp((p - a)/(b - a), 0, 1);

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: !small, powerPreference: 'high-performance' }); }
  catch (e) { sec.classList.add('nogl'); return { progress(){}, still(){}, ok:false }; }
  renderer.setClearColor(INK, 1);
  const scene = new T.Scene();
  scene.fog = new T.Fog(INK, 30, 95);
  const cam = new T.PerspectiveCamera(50, 1, .1, 400);

  // soft round sprite for particles and the core glow
  function dotTex(soft){
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (soft){ g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(255,255,255,1)'); g.addColorStop(.75, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t;
  }
  const DOT = dotTex(false), GLOW = dotTex(true);

  /* ---- the three rings, set back in depth so they read as the poster from the front ---- */
  const RINGS = [
    { r: 10,  z: 0,   op: .45, w: 1,   label: 'MJCET' },
    { r: 9.2, z: -12, op: .7,  w: 1,   label: 'DSSS' },
    { r: 6.9, z: -24, op: 1,   w: 1.6, label: 'EXECOM & CORE' },
  ];
  const CORE_Z = -34, CORE_R = 2.6;
  const world = new T.Group(); scene.add(world);
  const ringObjs = RINGS.map(R => {
    const pts = []; for (let i = 0; i <= 256; i++){ const a = i/256*Math.PI*2; pts.push(new T.Vector3(Math.cos(a)*R.r, Math.sin(a)*R.r, 0)); }
    const g = new T.BufferGeometry().setFromPoints(pts);
    const line = new T.Line(g, new T.LineBasicMaterial({ color: PAPER, transparent: true, opacity: R.op }));
    // a faint second loop gives the ring some body when you fly close
    const echo = new T.Line(g, new T.LineBasicMaterial({ color: PAPER, transparent: true, opacity: R.op*.25 }));
    echo.scale.setScalar(1.015);
    const grp = new T.Group(); grp.add(line, echo); grp.position.z = R.z; world.add(grp);
    // tick marks around the ring, like a dial
    const tk = []; const n = 72;
    for (let i = 0; i < n; i++){ const a = i/n*Math.PI*2, l = i % 6 ? .25 : .7;
      tk.push(new T.Vector3(Math.cos(a)*R.r, Math.sin(a)*R.r, 0), new T.Vector3(Math.cos(a)*(R.r + l), Math.sin(a)*(R.r + l), 0)); }
    const ticks = new T.LineSegments(new T.BufferGeometry().setFromPoints(tk), new T.LineBasicMaterial({ color: PAPER, transparent: true, opacity: R.op*.55 }));
    grp.add(ticks);
    return grp;
  });

  /* ---- the core: "you" ---- */
  const core = new T.Mesh(new T.SphereGeometry(CORE_R, 48, 32), new T.MeshBasicMaterial({ color: RED }));
  core.position.z = CORE_Z; world.add(core);
  const halo = new T.Sprite(new T.SpriteMaterial({ map: GLOW, color: RED, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }));
  halo.scale.setScalar(CORE_R*5.2); halo.position.z = CORE_Z; world.add(halo);
  const coreRingPts = []; for (let i = 0; i <= 128; i++){ const a = i/128*Math.PI*2; coreRingPts.push(new T.Vector3(Math.cos(a)*CORE_R*1.32, Math.sin(a)*CORE_R*1.32, 0)); }
  const coreRing = new T.Line(new T.BufferGeometry().setFromPoints(coreRingPts), new T.LineBasicMaterial({ color: RED, transparent: true, opacity: .5 }));
  coreRing.position.z = CORE_Z; world.add(coreRing);

  /* ---- particles: people as data points. They start as scattered noise and settle into orbit bands ---- */
  const N = small ? 1400 : 3200;
  const pos = new Float32Array(N*3), col = new Float32Array(N*3);
  const P = []; // per particle: chaos position, orbit band
  const cPaper = new T.Color(PAPER), cRed = new T.Color(RED);
  for (let i = 0; i < N; i++){
    const b = i % 4; // 0..2 ring bands, 3 = loose dust in the tunnel
    const R = RINGS[Math.min(b, 2)];
    const radius = b < 3 ? R.r + (Math.random() - .5)*(b === 2 ? 3 : 4.2) : 4 + Math.random()*11;
    const z = b < 3 ? R.z + (Math.random() - .5)*5 : 14 - Math.random()*60;
    const u = Math.random(), v = Math.random();
    const th = 2*Math.PI*u, ph = Math.acos(2*v - 1), rr = 18 + Math.random()*40;
    P.push({ a: Math.random()*Math.PI*2, r: radius, z, s: (b === 3 ? .02 : .05 + Math.random()*.08)*(b % 2 ? -1 : 1),
      cx: rr*Math.sin(ph)*Math.cos(th), cy: rr*Math.sin(ph)*Math.sin(th), cz: rr*Math.cos(ph) - 10, d: Math.random() });
    const red = Math.random() < .035; const c = red ? cRed : cPaper, k = red ? 1 : .55 + Math.random()*.45;
    col[i*3] = c.r*k; col[i*3+1] = c.g*k; col[i*3+2] = c.b*k;
  }
  const pg = new T.BufferGeometry();
  pg.setAttribute('position', new T.BufferAttribute(pos, 3));
  pg.setAttribute('color', new T.BufferAttribute(col, 3));
  const points = new T.Points(pg, new T.PointsMaterial({ size: small ? .26 : .2, map: DOT, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: .02 }));
  world.add(points);

  /* ---- the red "start here" path: the camera rides it into the core ---- */
  const path = new T.CatmullRomCurve3([
    new T.Vector3(0, 0, 31),
    new T.Vector3(-10, -7, 15),
    new T.Vector3(-6, -5, 0),     // through MJCET
    new T.Vector3(4, -3, -12),    // through DSSS
    new T.Vector3(-2, 2.4, -24),  // through EXECOM & CORE
    new T.Vector3(0, .3, -25.5),  // just inside the inner circle, facing you
  ], false, 'catmullrom', .5);
  // the visible dashed trail starts outside the rings, lower left, like the poster
  const trailPts = path.getSpacedPoints(400).slice(75);
  const trailGeo = new T.BufferGeometry().setFromPoints(trailPts);
  const trail = new T.Line(trailGeo, new T.LineDashedMaterial({ color: RED, dashSize: .35, gapSize: .7, transparent: true, opacity: .9 }));
  trail.computeLineDistances(); world.add(trail);
  const start = new T.Mesh(new T.RingGeometry(.28, .4, 40), new T.MeshBasicMaterial({ color: RED, side: T.DoubleSide, transparent: true }));
  start.position.copy(trailPts[0]); world.add(start);

  /* ---- HTML labels pinned to 3D points ---- */
  const labels = [...sec.querySelectorAll('[data-ring]')];
  const youEl = sec.querySelector('.r-you'), startEl = sec.querySelector('.r-start');
  const v3 = new T.Vector3();
  function pin(el, x, y, z, vis){
    if (!el) return;
    v3.set(x, y, z).applyMatrix4(world.matrixWorld).project(cam);
    const on = v3.z < 1 && v3.z > -1 && vis > .01;
    el.style.opacity = on ? vis.toFixed(3) : 0;
    if (on) el.style.transform = `translate(${(v3.x*.5 + .5)*W}px, ${(-v3.y*.5 + .5)*H}px) translate(-50%,-50%)`;
  }

  /* ---- sizing, pointer, loop ---- */
  let W = 1, H = 1, P01 = 0, mx = 0, my = 0, tmx = 0, tmy = 0, live = false, t0 = performance.now();
  function size(){
    W = cv.clientWidth || sec.clientWidth; H = cv.clientHeight || innerHeight; // the canvas is one screen tall even when the section is not
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.setSize(W, H, false); cam.aspect = W/H;
    // keep the whole outer ring on screen at the start, portrait or landscape
    cam.fov = W/H < .8 ? 68 : 50; cam.updateProjectionMatrix();
  }
  addEventListener('resize', size);
  addEventListener('pointermove', e => { tmx = e.clientX/innerWidth - .5; tmy = e.clientY/innerHeight - .5; }, { passive: true });

  const look = new T.Vector3(), corePos = new T.Vector3(0, 0, CORE_Z);
  function frame(now){
    const t = (now - t0)/1000, p = P01;
    mx += (tmx - mx)*.05; my += (tmy - my)*.05;

    // 0 → .16 noise settles into orbits · .16 → .78 camera flies the path · .78 → 1 hold on the core
    const order = ease(band(p, .0, .16)), fly = ease(band(p, .16, .78)), hold = band(p, .74, 1);
    const cp = path.getPointAt(fly);
    const ahead = path.getPointAt(Math.min(1, fly + .06));
    // keep the core in view the whole way: look between the road ahead and the core, then lock on to it
    look.copy(ahead).lerp(corePos, Math.max(.45 + .55*band(fly, .5, 1), 1 - band(fly, 0, .08)));
    cam.position.set(cp.x + mx*2.2*(1 - hold*.6), cp.y - my*1.6*(1 - hold*.6), cp.z);
    // once you arrive, slide the core aside to make room for the details panel (left on desktop, up on phones)
    const side = ease(band(p, .8, .92)), wide = W/H >= .8;
    const ox = wide ? side*4.4 : 0, oy = wide ? 0 : -side*3.6;
    cam.position.x += ox; cam.position.y += oy; look.x += ox; look.y += oy;
    cam.lookAt(look);
    cam.rotation.z += Math.sin(fly*Math.PI)*.35; // a gentle bank through the turns

    world.rotation.z = t*.02;
    ringObjs.forEach((g, i) => { g.rotation.z = t*(i % 2 ? -.05 : .04); });
    const pulse = 1 + Math.sin(t*2.2)*.035 + hold*.12;
    core.scale.setScalar(pulse); coreRing.scale.setScalar(1 + Math.sin(t*2.2 + 1)*.05 + hold*.2);
    halo.material.opacity = .45 + .25*hold + Math.sin(t*2.2)*.06;

    for (let i = 0; i < N; i++){
      const q = P[i]; q.a += q.s*.016*(1 + hold*.8);
      const ox = Math.cos(q.a)*q.r, oy = Math.sin(q.a)*q.r, oz = q.z + Math.sin(t*.6 + q.d*6)*.4;
      const k = clamp(order*1.25 - q.d*.25, 0, 1);
      pos[i*3] = mix(q.cx, ox, k); pos[i*3+1] = mix(q.cy, oy, k); pos[i*3+2] = mix(q.cz, oz, k);
    }
    pg.attributes.position.needsUpdate = true;

    trail.material.opacity = .9*(1 - band(fly, .85, 1)*.6);
    start.lookAt(cam.position);
    renderer.render(scene, cam);
    world.updateMatrixWorld();

    // ring labels sit at the top of each ring; they fade out once you have flown through
    labels.forEach((el, i) => { const R = RINGS[i], dz = cam.position.z - R.z;
      pin(el, 0, R.r + 1.1, R.z, clamp(dz/6, 0, 1)*(1 - band(p, .7, .8))); });
    pin(youEl, 0, 0, CORE_Z, band(p, .55, .72));
    pin(startEl, trailPts[0].x, trailPts[0].y - 1.4, trailPts[0].z, (1 - band(p, .1, .2)));
  }
  function loop(now){ if (!live) return; frame(now); requestAnimationFrame(loop); }
  new IntersectionObserver(es => es.forEach(e => {
    const was = live; live = e.isIntersecting && !reduce;
    if (live && !was) requestAnimationFrame(loop);
  }), { rootMargin: '200px' }).observe(sec);

  size();
  return {
    ok: true,
    progress(p){ P01 = clamp(p, 0, 1); },
    resize: size,
    still(){ P01 = .16; size(); frame(performance.now()); }, // the poster view, for reduced motion / no GSAP
  };
})();
