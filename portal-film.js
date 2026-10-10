/* DSSS Mainframe — scroll film engine. Started by portal.js once the members are on the page. */
window.DSSSFilm = { start(){
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const GLY = '01#%&@$<>/\\=+*ABCDEFXZ';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random()*(b - a);
const pick = a => a[Math.random()*a.length|0];
const DECK = ['#2F6BFF','#5B8CFF','#9DB6F0','#0B1F4F','#1553E6'];

/* ---------- text helpers ---------- */
function decode(el, p){
  const t = el.dataset.text || (el.dataset.text = el.textContent);
  if (p >= 1){ if (el.textContent !== t) el.textContent = t; return; }
  const k = Math.max(0, Math.floor(t.length * p));
  el.textContent = t.slice(0, k) + t.slice(k).replace(/\S/g, () => GLY[Math.random()*GLY.length|0]);
}
function splitWords(el){
  const chars = [], txt = el.textContent.trim(); el.textContent = '';
  txt.split(/\s+/).forEach((w, wi) => {
    if (wi) el.appendChild(document.createTextNode(' '));
    const ws = document.createElement('span'); ws.className = 'w';
    for (const c of w){ const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; ws.appendChild(s); chars.push(s); }
    el.appendChild(ws);
  });
  return chars;
}

/* ---------- HUD ---------- */
const hudsec = $('#hudsec'), hudbar = $('#hudbar');
const hud = t => { if (t && hudsec.textContent !== t) hudsec.textContent = t; };
addEventListener('scroll', () => { const m = document.documentElement.scrollHeight - innerHeight; hudbar.style.transform = `scaleX(${m > 0 ? scrollY/m : 0})`; }, {passive:true});
function burst(){ if (reduce) return; document.body.classList.add('burst'); setTimeout(() => document.body.classList.remove('burst'), 240); }

/* ---------- particle field: 2D fallback ---------- */
const makeP2 = () => (() => {
  const c = $('#pt'), x = c.getContext('2d');
  let W, H, parts = [], shape = 'DSSS', explode = 0, dark = 0;
  const mouse = {x:-9999, y:-9999};
  function resize(){
    const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    c.width = W*d; c.height = H*d; x.setTransform(d,0,0,d,0,0);
    const n = W < 700 ? 900 : 1700;
    while (parts.length < n) parts.push({x:Math.random()*W, y:Math.random()*H, vx:0, vy:0, tx:0, ty:0, on:false, s:1+Math.random()*1.6, a:.25+Math.random()*.6, ph:Math.random()*6.28});
    parts.length = n; set(shape, true);
  }
  function sampleText(txt, cx, cy, maxW, maxH){
    const o = document.createElement('canvas'), ox = o.getContext('2d');
    ox.font = '900 200px "Big Shoulders Display", Impact, sans-serif'; const m = ox.measureText(txt);
    const sc = Math.min(maxW / m.width, maxH / 170), fw = Math.ceil(m.width*sc)+8, fh = Math.ceil(200*sc);
    o.width = fw; o.height = fh; ox.font = `900 ${200*sc}px "Big Shoulders Display", Impact, sans-serif`;
    ox.textBaseline = 'middle'; ox.fillText(txt, 4, fh/2);
    const d = ox.getImageData(0,0,fw,fh).data, pts = [], step = Math.max(3, Math.round(Math.sqrt(fw*fh/(parts.length*.85))));
    for (let yy=0; yy<fh; yy+=step) for (let xx=0; xx<fw; xx+=step) if (d[(yy*fw+xx)*4+3] > 128) pts.push([xx+cx-fw/2, yy+cy-fh/2]);
    for (let i=pts.length-1;i>0;i--){ const j = Math.random()*(i+1)|0; [pts[i],pts[j]] = [pts[j],pts[i]]; }
    return pts;
  }
  function sampleIcon(svg, cx, cy, size){
    const o = document.createElement('canvas'), ox = o.getContext('2d'), S = Math.ceil(size);
    o.width = o.height = S; ox.scale(S/24, S/24); ox.lineWidth = 2.3; ox.lineCap = ox.lineJoin = 'round'; ox.strokeStyle = '#000';
    [...svg.children].forEach(el => {
      if (el.tagName === 'path') ox.stroke(new Path2D(el.getAttribute('d')));
      else if (el.tagName === 'circle'){ ox.beginPath(); ox.arc(+el.getAttribute('cx'), +el.getAttribute('cy'), +el.getAttribute('r'), 0, 7); ox.stroke(); }
    });
    const d = ox.getImageData(0,0,S,S).data, pts = [], step = Math.max(3, Math.round(Math.sqrt(S*S/(parts.length*1.6))));
    for (let yy=0; yy<S; yy+=step) for (let xx=0; xx<S; xx+=step) if (d[(yy*S+xx)*4+3] > 100) pts.push([xx + cx - S/2, yy + cy - S/2]);
    for (let i=pts.length-1;i>0;i--){ const j = Math.random()*(i+1)|0; [pts[i],pts[j]] = [pts[j],pts[i]]; }
    return pts;
  }
  function set(name, force){
    if (name === shape && !force) return; shape = name;
    let pts = [];
    if (name === 'DSSS') pts = sampleText('DSSS', W/2, H*.43, Math.min(W*.82, 980), H*.3);
    else if (name && name.startsWith('icon:')){
      const svg = document.querySelector('#' + name.slice(5) + ' .ic');
      if (svg && W >= 820) pts = sampleIcon(svg, W*.13, H*.5, Math.min(H*.42, W*.22));
      else if (svg) pts = sampleIcon(svg, W*.5, H*.17, Math.min(W*.34, H*.2));
    }
    else if (name === '12') pts = W < 820 ? sampleText('12', W/2, H*.24, W*.6, H*.22) : sampleText('12', W*.74, H*.5, W*.36, H*.62);
    parts.forEach((p, i) => { if (i < pts.length){ p.tx = pts[i][0]; p.ty = pts[i][1]; p.on = true; } else { p.tx = Math.random()*W; p.ty = Math.random()*H; p.on = false; } });
  }
  function frame(t){
    x.clearRect(0,0,W,H);
    for (const p of parts){
      let tx = p.tx, ty = p.ty; const ex = explode * (p.on ? 1 : .2);
      if (!p.on){ tx += Math.sin(t*.0003 + p.ph)*30; ty += Math.cos(t*.00025 + p.ph)*30; }
      if (ex > 0){ const r = ex*(200 + p.s*260); tx += Math.cos(p.ph*3)*r; ty += Math.sin(p.ph*3)*r - ex*120; }
      const f = p.on ? .055 : .012;
      p.vx = (p.vx + (tx - p.x)*f)*.82; p.vy = (p.vy + (ty - p.y)*f)*.82;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx*dx + dy*dy;
      if (d2 < 9000){ const q = (9000 - d2)/9000*4, d = Math.sqrt(d2+1); p.vx += dx/d*q; p.vy += dy/d*q; }
      p.x += p.vx; p.y += p.vy;
      x.fillStyle = `rgba(${dark ? '230,236,255' : '11,75,245'},${p.on ? p.a*(1-explode*.7) : p.a*.28})`;
      const z = p.s*(p.on?1.3:1); x.fillRect(p.x, p.y, z, z);
    }
    if (Math.random() < .05){ const y = Math.random()*H, h = 2+Math.random()*14, gx = Math.random()*W*.6, gw = 60+Math.random()*W*.4;
      x.fillStyle = 'rgba(157,184,255,.22)'; x.fillRect(gx-5, y, gw, h); x.fillStyle = 'rgba(11,75,245,.14)'; x.fillRect(gx, y, gw, h); }
    requestAnimationFrame(frame);
  }
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse'){ mouse.x = e.clientX; mouse.y = e.clientY; } });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  return {
    start(){ resize(); if (reduce){ x.clearRect(0,0,W,H); parts.forEach(p => { x.fillStyle = `rgba(11,75,245,${p.on ? p.a : p.a*.25})`; x.fillRect(p.tx, p.ty, p.s, p.s); }); } else requestAnimationFrame(frame); },
    setShape: set, refresh(){ set(shape, true); }, set explode(v){ explode = v; }, set dark(v){ dark = v; }, set spin(v){}, set warp(v){},
  };
})();

/* ---------- particle galaxy: 3D (Three.js), same interface ---------- */
const makeP3 = () => {
  if (!window.THREE || reduce) return null;
  const canvas = $('#pt'); let R;
  try { R = new THREE.WebGLRenderer({canvas, alpha:true, antialias:false, powerPreference:'high-performance'}); } catch (e) { return null; }
  if (!R || !R.getContext()) return null;
  R.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, 1, 1, 6000), CZ = 640; cam.position.z = CZ;
  const lite = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4, N = lite ? 6000 : 18000;
  const pos = new Float32Array(N*3), vel = new Float32Array(N*3), tgt = new Float32Array(N*3), amb = new Float32Array(N*3);
  const sd = new Float32Array(N*3), on = new Uint8Array(N), aA = new Float32Array(N), aS = new Float32Array(N);
  for (let i=0;i<N;i++){ sd[i*3] = Math.random(); sd[i*3+1] = Math.random(); sd[i*3+2] = Math.random(); aS[i] = 2 + Math.random()*3.2; aA[i] = .4 + Math.random()*.55; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(aA, 1));
  geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  const mat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false,
    uniforms:{ uColor:{value:new THREE.Color(0x0b4bf5)}, uPix:{value:Math.min(devicePixelRatio || 1, 2)}, uFade:{value:1} },
    vertexShader:`attribute float aA; attribute float aS; varying float vA; uniform float uPix;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = aS*uPix*(640.0/max(1.0,-mv.z)); vA = aA*clamp((-mv.z)/120.0,0.0,1.0); gl_Position = projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uColor; uniform float uFade; varying float vA;
      void main(){ float d = length(gl_PointCoord - vec2(.5)); if (d > .5) discard; float a = vA*uFade*smoothstep(.5,.05,d); gl_FragColor = vec4(uColor, a); }`
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  let W, H, k, shape = 'DSSS', cx = 0, cy = 0, spin = 0, warp = 0, dark = 0, mx = 0, my = 0, mwx = 1e9, mwy = 1e9;
  const blue = new THREE.Color(0x0b4bf5), white = new THREE.Color(0xe6ecff);
  const px = (x, y) => [(x - W/2)*k, -(y - H/2)*k];

  function grid(ox, w, h, offx, offy, density){
    const d = ox.getImageData(0,0,w,h).data, out = [];
    let filled = 0; for (let i=3; i<d.length; i+=4) if (d[i] > 110) filled++;
    const step = Math.max(1, Math.sqrt(filled/(N*density)));
    for (let yy=0; yy<h; yy+=step) for (let xx=0; xx<w; xx+=step){ const X = xx|0, Y = yy|0; if (d[(Y*w+X)*4+3] > 110) out.push([xx + offx + (Math.random()-.5)*step, yy + offy + (Math.random()-.5)*step]); }
    for (let i=out.length-1;i>0;i--){ const j = Math.random()*(i+1)|0; [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function sText(txt, x0, y0, maxW, maxH, opt = {}){
    // opt.family/weight/gap/erode keep letters readable at small sizes: the condensed display S fills in and reads as an 8
    const wt = opt.weight || 900, gap = opt.gap || 0, fam = opt.family || '"Big Shoulders Display", Impact', F = s => `${wt} ${s}px ${fam}, sans-serif`;
    const o = document.createElement('canvas'), ox = o.getContext('2d');
    ox.font = F(200); const cw = [...txt].map(ch => ox.measureText(ch).width), tw = cw.reduce((a, b) => a + b, 0) + gap*200*(txt.length - 1);
    const sc = Math.min(maxW/tw, maxH/170), fw = Math.ceil(tw*sc) + 8, fh = Math.ceil(200*sc);
    o.width = fw; o.height = fh; ox.font = F(200*sc); ox.textBaseline = 'middle';
    let x = 4; [...txt].forEach((ch, i) => { ox.fillText(ch, x, fh/2); x += (cw[i] + gap*200)*sc; });
    if (opt.erode){ // shave the outline off every letter: opens up the gaps inside S so the dots can't close them
      ox.globalCompositeOperation = 'destination-out'; ox.lineWidth = opt.erode*200*sc; ox.lineJoin = 'round';
      x = 4; [...txt].forEach((ch, i) => { ox.strokeText(ch, x, fh/2); x += (cw[i] + gap*200)*sc; });
      ox.globalCompositeOperation = 'source-over';
    }
    return grid(ox, fw, fh, x0 - fw/2, y0 - fh/2, .9);
  }
  function sIcon(svg, x0, y0, size){
    const o = document.createElement('canvas'), ox = o.getContext('2d'), S = Math.ceil(size);
    o.width = o.height = S; ox.scale(S/24, S/24); ox.lineWidth = 2.6; ox.lineCap = ox.lineJoin = 'round';
    [...svg.children].forEach(el => {
      if (el.tagName === 'path') ox.stroke(new Path2D(el.getAttribute('d')));
      else if (el.tagName === 'circle'){ ox.beginPath(); ox.arc(+el.getAttribute('cx'), +el.getAttribute('cy'), +el.getAttribute('r'), 0, 7); ox.stroke(); }
    });
    return grid(ox, S, S, x0 - S/2, y0 - S/2, .6);
  }
  function set(name, force){
    if (W < 760 && name && (name === '12' || name.startsWith('icon:'))) name = 'scatter'; // phones: no shape behind the text column
    if (name === shape && !force) return; shape = name;
    let p = [], depth = 50, c = [W/2, H/2];
    if (name === 'DSSS'){ c = W < 760 ? [W/2, H*.2] : [W/2, H*.43]; p = W < 760 ? sText('DSSS', c[0], c[1], W*.84, H*.16, {family:'"IBM Plex Sans"', weight:700, gap:.06, erode:.03}) : sText('DSSS', c[0], c[1], Math.min(W*.82, 980), H*.3); } // phones: sit above the title, not on it
    else if (name === '12'){ c = W < 820 ? [W/2, H*.24] : [W*.74, H*.5]; p = W < 820 ? sText('12', c[0], c[1], W*.6, H*.22) : sText('12', c[0], c[1], W*.36, H*.62); }
    else if (name && name.startsWith('icon:')){
      const svg = document.querySelector('#' + name.slice(5) + ' .ic');
      c = W >= 820 ? [W*.14, H*.5] : [W*.5, H*.17];
      if (svg) p = sIcon(svg, c[0], c[1], W >= 820 ? Math.min(H*.46, W*.24) : Math.min(W*.36, H*.2));
      depth = 70;
    }
    [cx, cy] = px(c[0], c[1]);
    for (let i=0;i<N;i++){
      const j = i*3;
      if (i < p.length){ const [wx, wy] = px(p[i][0], p[i][1]); tgt[j] = wx; tgt[j+1] = wy; tgt[j+2] = (sd[j+2] - .5)*depth; on[i] = 1; }
      else { tgt[j] = amb[j]; tgt[j+1] = amb[j+1]; tgt[j+2] = amb[j+2]; on[i] = 0; }
    }
  }
  function resize(){
    W = innerWidth; H = innerHeight; R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.setSize(W, H, false);
    cam.aspect = W/H; cam.updateProjectionMatrix(); k = 2*CZ*Math.tan(25*Math.PI/180)/H;
    const vw = W*k, vh = H*k;
    for (let i=0;i<N;i++){ const j = i*3; amb[j] = (sd[j] - .5)*vw*1.6; amb[j+1] = (sd[j+1] - .5)*vh*1.6; amb[j+2] = -1400 + sd[j+2]*1700; }
    set(shape, true);
  }
  function frame(t){
    requestAnimationFrame(frame);
    const T = t*.001, cs = Math.cos(spin), sn = Math.sin(spin), wv = warp, ws = T*900;
    for (let i=0;i<N;i++){
      const j = i*3; let tx = tgt[j], ty = tgt[j+1], tz = tgt[j+2];
      if (on[i]){ const dx = tx - cx; tx = cx + dx*cs - tz*sn; tz = dx*sn + tz*cs; }
      else { tx += Math.sin(T*.35 + sd[j]*40)*24; ty += Math.cos(T*.3 + sd[j+1]*40)*24; }
      if (wv > .001){
        const a = sd[j]*6.2832 + T*.4, rr = 160 + sd[j+1]*520, zz = ((sd[j+2]*3200 + ws) % 3200) - 2600;
        tx += (Math.cos(a)*rr - tx)*wv; ty += (Math.sin(a)*rr - ty)*wv; tz += (zz - tz)*wv;
      }
      const f = on[i] && wv < .5 ? .07 : .03;
      let vx = (vel[j] + (tx - pos[j])*f)*.84, vy = (vel[j+1] + (ty - pos[j+1])*f)*.84, vz = (vel[j+2] + (tz - pos[j+2])*f)*.84;
      const ddx = pos[j] - mwx, ddy = pos[j+1] - mwy, d2 = ddx*ddx + ddy*ddy;
      if (d2 < 6400 && pos[j+2] > -200){ const q = (6400 - d2)/6400*5, d = Math.sqrt(d2) + 1; vx += ddx/d*q; vy += ddy/d*q; vz += q*1.5; }
      vel[j] = vx; vel[j+1] = vy; vel[j+2] = vz; pos[j] += vx; pos[j+1] += vy; pos[j+2] += vz;
    }
    geo.attributes.position.needsUpdate = true;
    cam.position.x += (mx*60 - cam.position.x)*.05; cam.position.y += (-my*40 - cam.position.y)*.05; cam.lookAt(0, 0, 0);
    mat.uniforms.uColor.value.copy(blue).lerp(white, dark);
    R.render(scene, cam);
  }
  addEventListener('pointermove', e => {
    mx = e.clientX/innerWidth - .5; my = e.clientY/innerHeight - .5;
    if (e.pointerType === 'mouse'){ [mwx, mwy] = px(e.clientX, e.clientY); }
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  return {
    start(){ resize(); for (let i=0;i<N*3;i++) pos[i] = amb[i]; requestAnimationFrame(frame); },
    setShape: set, refresh(){ set(shape, true); },
    set explode(v){ warp = v; }, set warp(v){ warp = v; }, set spin(v){ spin = v; }, set dark(v){ dark = v; },
  };
};
const P = makeP3() || makeP2();

/* ---------- designation visuals (one renderer per deck slide) ---------- */
const G = (() => {
  const c = $('#fxbg'), g = c.getContext('2d');
  const panels = $$('.panel');
  let W, H, last = 0, vel = 0;
  const st = new Map();
  function resize(){ const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; c.width = W*d; c.height = H*d; g.setTransform(d,0,0,d,0,0); st.clear(); }
  // spread range: visuals sit on a slower parallax plane, so cover beyond the panel edges
  const X0 = () => -20, X1 = () => W + 20;

  function roundRect(x, y, w, h, r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
  function star(x, y, R, rot){ g.beginPath(); for (let i=0;i<10;i++){ const r = i%2 ? R*.42 : R, a = rot - Math.PI/2 + i*Math.PI/5; g.lineTo(x+Math.cos(a)*r, y+Math.sin(a)*r); } g.closePath(); }

  const FX = {
    rain: {
      poke: (s, x, y) => { for (const k of s.cols) if (Math.abs(k.x - x) < 140){ k.y = y + rnd(-40, 40); k.sp *= 1.8; k.hot = 1; } },
      init: () => { const cols = []; for (let x = X0(); x < X1(); x += 24) if (Math.random() < .55) cols.push({x, y: rnd(-H, H), sp: rnd(70, 220), n: 8 + (Math.random()*12|0), ch: Array.from({length:22}, () => Math.random() < .5 ? '0' : '1'), c: pick(['157,182,240','91,140,255','185,204,245'])}); return {cols}; },
      draw: (s, t, dt, e) => {
        g.font = '600 15px "JetBrains Mono", monospace'; g.textAlign = 'center';
        for (const k of s.cols){
          k.y += k.sp*dt*(.6 + e*1.4); if (k.y - k.n*18 > H){ k.y = rnd(-H*.4, 0); k.sp = rnd(70, 220); k.hot = 0; }
          if (Math.random() < .04) k.ch[Math.random()*k.n|0] = Math.random() < .5 ? '0' : '1';
          for (let i=0;i<k.n;i++){ g.fillStyle = i === 0 ? 'rgba(11,75,245,.85)' : k.hot ? `rgba(11,75,245,${(1 - i/k.n)*.7})` : `rgba(${k.c},${(1 - i/k.n)*.6})`; g.fillText(k.ch[i], k.x, k.y - i*18); }
        }
      }},
    bubbles: {
      poke: (s, x, y) => { for (let i=0;i<8;i++) s.b.push({x: x + rnd(-30, 30), y: y + rnd(-20, 20), w: rnd(36, 90), sp: rnd(140, 260), ph: rnd(0, 7), round: Math.random() < .5, dots: true, c: pick(['21,83,230','91,140,255']), a: .45, flip: Math.random() < .5, tmp: 1}); },
      init: () => ({b: Array.from({length: 26}, () => ({x: rnd(X0(), X1()), y: rnd(0, H*1.4), w: rnd(46, 120), sp: rnd(22, 60), ph: rnd(0, 7), round: Math.random() < .5, dots: Math.random() < .55, c: pick(['157,182,240','91,140,255','21,83,230']), a: rnd(.16, .3), flip: Math.random() < .5}))}),
      draw: (s, t, dt, e) => {
        s.b = s.b.filter(b => !b.dead);
        for (const b of s.b){
          b.y -= b.sp*dt*(.7 + e*1.3); if (b.y < -120){ if (b.tmp){ b.dead = 1; continue; } b.y = H + rnd(40, 200); b.x = rnd(X0(), X1()); }
          const x = b.x + Math.sin(t*.8 + b.ph)*14, y = b.y, w = b.w, h = w*.62, f = b.flip ? -1 : 1;
          g.fillStyle = `rgba(${b.c},${b.a})`;
          if (b.round){ g.beginPath(); g.ellipse(x, y, w/2, h/2, 0, 0, 7); g.fill(); }
          else { roundRect(x - w/2, y - h/2, w, h, h*.3); g.fill(); }
          g.beginPath(); g.moveTo(x - f*w*.18, y + h*.36); g.lineTo(x - f*w*.36, y + h*.78); g.lineTo(x - f*w*.02, y + h*.42); g.fill();
          if (b.dots){ g.fillStyle = `rgba(255,255,255,${.75})`; for (let i=-1;i<=1;i++){ g.beginPath(); g.arc(x + i*w*.17, y, w*.045 + Math.max(0, Math.sin(t*5 - i))*w*.015, 0, 7); g.fill(); } }
        }
      }},
    gears: {
      poke: (s) => { s.boost = (s.boost || 0) + 7; },
      init: () => ({gs: [[-.04,.02,.2,12,1,'21,83,230'],[1.0,.06,.17,9,-1,'11,31,79'],[.98,.92,.22,12,1,'11,31,79'],[.02,.95,.16,9,-1,'21,83,230'],[.15,.16,.08,8,-1,'11,31,79'],[.88,.33,.065,8,1,'11,31,79'],[.5,1.02,.12,10,1,'91,140,255'],[-.3,.5,.14,10,1,'157,182,240'],[1.3,.55,.16,11,-1,'157,182,240']]}),
      draw: (s, t, dt, e, so) => {
        const m = Math.min(W, H); s.boost = Math.max(0, (s.boost || 0) - dt*3); s.ang = (s.ang || 0) + dt*(1 + s.boost);
        for (const [fx, fy, fr, n, dir, col] of s.gs){
          const x = fx*W, y = fy*H, R = fr*m*1.6*(.9 + e*.1), a = dir*(s.ang*.35*(10/n) + so*.006);
          g.save(); g.translate(x, y); g.rotate(a); g.beginPath();
          const ri = R*.8, ro = R;
          for (let i=0;i<n;i++){ const a0 = i/n*Math.PI*2, a1 = a0 + Math.PI/n*.55, a2 = a0 + Math.PI/n, a3 = a2 + Math.PI/n*.45;
            g.lineTo(Math.cos(a0)*ri, Math.sin(a0)*ri); g.lineTo(Math.cos(a1)*ro, Math.sin(a1)*ro); g.lineTo(Math.cos(a2)*ro, Math.sin(a2)*ro); g.lineTo(Math.cos(a3)*ri, Math.sin(a3)*ri); }
          g.closePath(); g.moveTo(R*.32, 0); g.arc(0, 0, R*.32, 0, Math.PI*2, true);
          g.fillStyle = `rgba(${col},${.1 + e*.06})`; g.fill('evenodd');
          g.restore();
        }
      }},
    ripples: {
      poke: (s, x, y, t) => { for (let i=0;i<3;i++) s.rings.push({x, y, b: t + i*.18}); },
      init: () => ({rings: [], next: 0, c: [[.08,.48],[.92,.52],[-.3,.3],[1.3,.7]]}),
      draw: (s, t, dt, e) => {
        if (t > s.next){ s.c.forEach(([fx, fy]) => s.rings.push({x: fx*W, y: fy*H, b: t})); s.next = t + (1.1 - e*.5); }
        const max = Math.min(W, H)*.62;
        s.rings = s.rings.filter(r => t - r.b < 3.6);
        for (const r of s.rings){
          if (t < r.b) continue; // staggered rings poked by a tap start slightly in the future
          const k = (t - r.b)/3.6, rad = Math.max(0, 8 + k*max);
          g.beginPath(); g.arc(r.x, r.y, rad, 0, 7); g.lineWidth = 14*(1 - k) + 1; g.strokeStyle = `rgba(21,83,230,${.24*(1 - k)})`; g.stroke();
          g.beginPath(); g.arc(r.x, r.y, rad*.55, 0, 7); g.lineWidth = 3; g.strokeStyle = `rgba(157,182,240,${.3*(1 - k)})`; g.stroke();
        }
      }},
    coins: {
      poke: (s, x, y) => { for (let i=0;i<14;i++) s.cs.push({x: x + rnd(-60, 60), y: y - rnd(0, 120), r: rnd(10, 22), sp: rnd(160, 320), spin: rnd(3, 8), ph: rnd(0, 7), tmp: 1}); },
      init: () => ({cs: Array.from({length: 30}, () => ({x: rnd(X0(), X1()), y: rnd(-H, H), r: rnd(10, 24), sp: rnd(90, 230), spin: rnd(2, 6), ph: rnd(0, 7)}))}),
      draw: (s, t, dt, e) => {
        s.cs = s.cs.filter(k => !k.dead);
        for (const k of s.cs){
          k.y += k.sp*dt*(.5 + e*1.3); if (k.y > H + 40){ if (k.tmp){ k.dead = 1; continue; } k.y = rnd(-200, -30); k.x = rnd(X0(), X1()); }
          const fl = Math.cos(t*k.spin + k.ph), w = Math.max(.12, Math.abs(fl))*k.r;
          const gr = g.createLinearGradient(k.x - w, k.y - k.r, k.x + w, k.y + k.r); gr.addColorStop(0, '#FFD54A'); gr.addColorStop(.5, '#F2B705'); gr.addColorStop(1, '#B8860B');
          g.globalAlpha = .82; g.beginPath(); g.ellipse(k.x, k.y, w, k.r, 0, 0, 7); g.fillStyle = gr; g.fill();
          g.lineWidth = 1.5; g.strokeStyle = '#B8860B'; g.stroke();
          if (w > k.r*.4){ g.beginPath(); g.ellipse(k.x, k.y, w*.68, k.r*.68, 0, 0, 7); g.strokeStyle = 'rgba(184,134,11,.7)'; g.stroke(); }
          g.globalAlpha = 1;
        }
      }},
    arrows: {
      poke: (s, x, y) => { for (let i=0;i<10;i++) s.as.push({x: x + rnd(-50, 50), y: y + rnd(0, 40), s: rnd(16, 40), sp: rnd(380, 700), c: '21,83,230', a: .55, tmp: 1}); },
      init: () => ({as: Array.from({length: 26}, () => ({x: rnd(X0(), X1()), y: rnd(0, H*1.4), s: rnd(14, 46), sp: rnd(40, 120), c: pick(['21,83,230','91,140,255']), a: rnd(.15, .3)}))}),
      draw: (s, t, dt, e) => {
        s.as = s.as.filter(k => !k.dead);
        for (const k of s.as){
          k.y -= k.sp*dt*(.6 + e*1.6); if (k.y < -k.s*2){ if (k.tmp){ k.dead = 1; continue; } k.y = H + rnd(20, 160); k.x = rnd(X0(), X1()); }
          const x = k.x, y = k.y, z = k.s;
          g.fillStyle = `rgba(${k.c},${k.a})`; g.beginPath();
          g.moveTo(x, y - z); g.lineTo(x + z*.6, y - z*.2); g.lineTo(x + z*.24, y - z*.2); g.lineTo(x + z*.24, y + z); g.lineTo(x - z*.24, y + z); g.lineTo(x - z*.24, y - z*.2); g.lineTo(x - z*.6, y - z*.2); g.closePath(); g.fill();
        }
      }},
    docs: {
      poke: (s, x, y) => { for (const d of s.ds){ const dx = d.x - x, dy = d.y - y, q = Math.hypot(dx, dy) + 1; if (q < 320){ d.vx = (d.vx || 0) + dx/q*520; d.vy = (d.vy || 0) + dy/q*520; d.vr += rnd(-4, 4); } } },
      init: () => ({ds: Array.from({length: 16}, () => ({x: rnd(X0(), X1()), y: rnd(-H, H), w: rnd(44, 80), rot: rnd(-.5, .5), vr: rnd(-.6, .6), sp: rnd(40, 100), ph: rnd(0, 7)}))}),
      draw: (s, t, dt, e) => {
        for (const d of s.ds){
          d.vx = (d.vx || 0)*.94; d.vy = (d.vy || 0)*.94; d.x += d.vx*dt; d.vr *= .99;
          d.y += d.sp*dt*(.5 + e*1.2) + d.vy*dt; d.rot += d.vr*dt; if (d.y > H + 120){ d.y = rnd(-260, -80); d.x = rnd(X0(), X1()); }
          const w = d.w, h = w*1.3;
          g.save(); g.translate(d.x + Math.sin(t + d.ph)*20, d.y); g.rotate(d.rot);
          g.beginPath(); g.moveTo(-w/2, -h/2); g.lineTo(w/2, -h/2); g.lineTo(w/2, h*.38);
          g.bezierCurveTo(w*.2, h*.25, -w*.15, h*.62, -w/2, h*.45); g.closePath();
          g.fillStyle = 'rgba(255,255,255,.92)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(157,182,240,.95)'; g.stroke();
          g.fillStyle = 'rgba(157,182,240,.8)'; for (let i=0;i<4;i++) g.fillRect(-w*.32, -h*.32 + i*h*.15, w*(i === 3 ? .4 : .64), 2.5);
          g.restore();
        }
      }},
    bolts: {
      poke: (s, x, y) => { s.bs.push({x, y, s: rnd(70, 110), c: '47,107,255', nf: 1e9, fl: 1, r: rnd(-.3, .3), tmp: 1, life: 1.2}); s.flash = 1; },
      init: () => ({bs: Array.from({length: 12}, () => ({x: rnd(X0(), X1()), y: rnd(H*.05, H*.9), s: rnd(28, 70), c: pick(['47,107,255','21,83,230','91,140,255']), nf: rnd(0, 3), fl: 0, r: rnd(-.3, .3)})), flash: 0}),
      draw: (s, t, dt, e) => {
        if (s.flash > 0){ g.fillStyle = `rgba(157,184,255,${s.flash*.16})`; g.fillRect(X0(), 0, X1() - X0(), H); s.flash -= dt*4; }
        s.bs = s.bs.filter(b => !(b.tmp && (b.life -= dt) <= 0));
        for (const b of s.bs){
          if (b.tmp) b.fl = Math.max(b.fl, b.life*.8);
          if (t > b.nf){ b.fl = 1; b.nf = t + rnd(.8, 3.2)/(.6 + e); if (Math.random() < .35*e) s.flash = 1; }
          b.fl = Math.max(0, b.fl - dt*5);
          const a = .2 + b.fl*.75, z = b.s, jx = b.fl > .5 ? rnd(-3, 3) : 0;
          g.save(); g.translate(b.x + jx, b.y); g.rotate(b.r); g.beginPath();
          g.moveTo(z*.1, -z); g.lineTo(-z*.45, z*.08); g.lineTo(-z*.02, z*.08); g.lineTo(-z*.18, z); g.lineTo(z*.48, -z*.18); g.lineTo(z*.05, -z*.18); g.lineTo(z*.32, -z); g.closePath();
          g.fillStyle = `rgba(${b.c},${a})`; g.fill();
          if (b.fl > .3){ g.shadowColor = 'rgba(91,140,255,.9)'; g.shadowBlur = 24; g.fill(); }
          g.restore();
        }
      }},
    chair: {
      poke: (s, x, y) => { for (let i=0;i<12;i++){ const a = i/12*Math.PI*2; s.ss.push({x, y, vx: Math.cos(a)*rnd(120, 260), vy: Math.sin(a)*rnd(120, 260), r: rnd(6, 14), ph: rnd(0, 7), sp: rnd(2, 4), tmp: 1, life: 2}); } },
      init: () => ({ss: Array.from({length: 34}, () => ({x: rnd(X0(), X1()), y: rnd(0, H), r: rnd(5, 16), ph: rnd(0, 7), sp: rnd(1, 3)})), dots: Array.from({length: 60}, () => ({x: rnd(X0(), X1()), y: rnd(0, H), v: rnd(6, 20)}))}),
      bg: (x0, w) => { const gr = g.createRadialGradient(x0 + w/2, H*.42, 0, x0 + w/2, H*.42, Math.max(w, H)*.75); gr.addColorStop(0, '#163FA8'); gr.addColorStop(.6, '#06113A'); gr.addColorStop(1, '#040C2A'); return gr; },
      draw: (s, t, dt, e, so) => {
        for (const d of s.dots){ d.y -= d.v*dt; if (d.y < 0) d.y = H; g.fillStyle = 'rgba(220,230,255,.35)'; g.fillRect(d.x, d.y, 1.5, 1.5); }
        s.ss = s.ss.filter(k => !(k.tmp && (k.life -= dt) <= 0));
        for (const k of s.ss){
          if (k.tmp){ k.x += k.vx*dt; k.y += k.vy*dt; k.vx *= .97; k.vy *= .97; }
          const tw = .55 + Math.sin(t*k.sp + k.ph)*.45;
          star(k.x, k.y, k.r*(.6 + tw*.5), t*.3 + k.ph);
          g.fillStyle = `rgba(242,183,5,${.35 + tw*.55})`; g.fill();
          if (tw > .85){ g.shadowColor = 'rgba(242,183,5,.9)'; g.shadowBlur = 16; g.fill(); g.shadowBlur = 0; }
        }
      }},
  };
  // the deck's floating pale dots + dot grid, under every visual
  function base(x0, w, dark){
    g.fillStyle = dark ? 'rgba(157,184,255,.14)' : 'rgba(11,75,245,.12)';
    for (let i=0;i<6;i++) for (let j=0;j<4;j++){ g.beginPath(); g.arc(x0 + w*.73 + i*16, 46 + j*16, 1.6, 0, 7); g.fill(); }
  }
  function render(now){
    const t = now/1000, dt = Math.min(.05, t - (last || t)); last = t;
    g.clearRect(0,0,W,H);
    for (const p of panels){
      const vis = p._vis === undefined ? 1 : p._vis; if (vis <= .002) continue;
      const r = p.getBoundingClientRect();
      if (r.right <= 0 || r.left >= W || r.bottom <= 0 || r.top >= H) continue;
      const fx = FX[p.dataset.fx]; if (!fx) continue;
      if (!st.has(p)) st.set(p, fx.init());
      const e = clamp(vis*(1 - Math.abs(r.top)/H), 0, 1), sc = p._sc || 1;
      g.save(); try { g.beginPath();
      const ir = p._iris === undefined ? 1 : p._iris;
      if (ir < .999) g.arc(r.left + r.width/2, r.top + r.height/2, ir*Math.hypot(r.width, r.height)*.53, 0, Math.PI*2);
      else g.rect(r.left, r.top, r.width, r.height);
      g.clip();
      g.globalAlpha = vis;
      g.fillStyle = fx.bg ? fx.bg(r.left, r.width) : '#F6F8FF'; g.fillRect(r.left, r.top, r.width, r.height);
      g.translate(r.left + r.width/2, r.top*.6 + r.height/2); g.scale(sc, sc); g.translate(-r.width/2, -r.height/2);
      base(0, r.width, !!fx.bg);
      fx.draw(st.get(p), t, reduce ? 0 : dt*(1 + vel), e, r.top);
      } catch (err){ console.warn('scene visual skipped a frame', err); }
      finally { g.restore(); }
    }
  }
  function loop(n){ requestAnimationFrame(loop); vel *= .93; document.documentElement.style.setProperty('--v', vel.toFixed(3)); render(n); } // schedule first: an error can't stop the loop
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  function poke(p, cx, cy){
    const fx = FX[p.dataset.fx], s = st.get(p); if (!fx || !s || !fx.poke) return;
    const r = p.getBoundingClientRect();
    fx.poke(s, cx - r.left, cy - r.top*.6, performance.now()/1000);
  }
  return { poke, set vel(v){ vel = Math.max(vel, v); }, start(){ resize(); if (reduce){ const once = () => render(performance.now()); addEventListener('scroll', once, {passive:true}); once(); } else requestAnimationFrame(loop); } };
})();

/* ---------- confetti (from the deck's name-box bursts) ---------- */
const C = (() => {
  const c = $('#fx'), g = c.getContext('2d'); let W, H, ps = [], running = false;
  function resize(){ const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; c.width = W*d; c.height = H*d; g.setTransform(d,0,0,d,0,0); }
  function frame(){
    g.clearRect(0,0,W,H);
    ps = ps.filter(p => p.life > 0 && p.y < H + 40);
    for (const p of ps){
      p.vy += .32; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, p.life/30); g.fillStyle = p.c;
      if (p.round){ g.beginPath(); g.ellipse(0, 0, p.s*.5, p.s*.5*Math.abs(Math.cos(p.rot*2)), 0, 0, 7); g.fill(); }
      else g.fillRect(-p.s*.6, -p.s*.25, p.s*1.2, p.s*.5*Math.abs(Math.cos(p.rot*3)) + 1);
      g.restore();
    }
    if (ps.length) requestAnimationFrame(frame); else { running = false; g.clearRect(0,0,W,H); }
  }
  addEventListener('resize', resize);
  return {
    start: resize,
    fire(x, y, n = 90, gold = false){
      if (reduce) return;
      const cols = gold ? [...DECK, '#F2B705', '#F2B705'] : DECK;
      for (let i=0;i<n;i++){ const a = rnd(-Math.PI*.95, -Math.PI*.05), v = rnd(6, 16);
        ps.push({x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, rot: rnd(0, 7), vr: rnd(-.3, .3), s: rnd(6, 12), c: pick(cols), round: Math.random() < .45, life: rnd(80, 140)}); }
      if (!running){ running = true; requestAnimationFrame(frame); }
    }
  };
})();

/* ---------- sound: a generated score that follows the film ---------- */
const A = (() => {
  const btn = $('#snd'), lab = $('#sndl'), AC = window.AudioContext || window.webkitAudioContext;
  const NOTE = m => 440*Math.pow(2, (m - 69)/12);
  // root note + chord quality per section; the Chair resolves to a bright major
  const KEY = {gb:[57,'m'], 'adv-hack':[57,'m'], 'adv-comm':[60,'M'], tech:[62,'m'], rep:[55,'M'], treas:[64,'m'], dgs:[65,'M'], gs:[62,'m'], vc:[59,'m'], chair:[60,'M']};
  const chord = k => { const [r, q] = KEY[k] || KEY.gb; return [r, r + (q === 'M' ? 4 : 3), r + 7, r + 12]; };
  const BPM = 112, SIX = 60/BPM/4, PAT = [0,2,1,3,2,1,3,2, 0,2,1,3,2,3,1,2];
  let ctx, out, filt, sub, pads = [], noise, dly, on = false, want = 'gb', timer, step = 0, nextT = 0, bright = 0;
  function build(){
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    out = ctx.createGain(); out.gain.value = 0; out.connect(comp);
    filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 700; filt.Q.value = 5; filt.connect(out);
    const padG = ctx.createGain(); padG.gain.value = .045; padG.connect(filt);
    chord(want).slice(0, 3).forEach((m, i) => [-8, 8].forEach(d => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(m - 12); o.detune.value = d; o.connect(padG); o.start(); pads.push({o, i});
    }));
    sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = NOTE(chord(want)[0] - 24);
    const subG = ctx.createGain(); subG.gain.value = .1; sub.connect(subG); subG.connect(out); sub.start();
    dly = ctx.createDelay(1); dly.delayTime.value = SIX*3; const fb = ctx.createGain(); fb.gain.value = .32; const wet = ctx.createGain(); wet.gain.value = .22;
    dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(out);
    const len = ctx.sampleRate*.2, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2 - 1)*(1 - i/len); noise = nb;
  }
  function voice(t, m, len, gain, type){
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = NOTE(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    o.connect(g); g.connect(filt); g.connect(dly); o.start(t); o.stop(t + len + .05);
  }
  function kick(t){
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
    g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.0001, t + .32);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + .35);
  }
  function hat(t, v){
    const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noise;
    hp.type = 'highpass'; hp.frequency.value = 7000; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    n.connect(hp); hp.connect(g); g.connect(out); n.start(t); n.stop(t + .06);
  }
  function play(t, k){
    const c = chord(want), oct = (Math.floor(k/16) % 2) ? 24 : 12;
    if (k % 4 === 0) kick(t);
    if (k % 4 === 2) hat(t, .025 + bright*.05);
    if (bright > .35 && k % 2 === 1) hat(t, .012 + bright*.03);
    if (k % 2 === 0 || bright > .2) voice(t, c[PAT[k % 16]] + oct, .16 + bright*.12, .07 + bright*.05, 'triangle');
  }
  function tick(){ while (nextT < ctx.currentTime + .12){ play(nextT, step++); nextT += SIX; } }
  function glide(){
    if (!ctx) return; const t = ctx.currentTime, c = chord(want);
    pads.forEach(({o, i}) => o.frequency.setTargetAtTime(NOTE(c[i] - 12), t, .35));
    sub.frequency.setTargetAtTime(NOTE(c[0] - 24), t, .35);
  }
  btn.addEventListener('click', async () => {
    on = !on; btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); lab.textContent = on ? 'Sound on' : 'Sound off';
    if (!AC) return;
    if (!ctx) build();
    if (ctx.state === 'suspended') await ctx.resume();
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(on ? .6 : 0, t, .35);
    clearInterval(timer);
    if (on){ nextT = ctx.currentTime + .05; timer = setInterval(tick, 25); }
  });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : (on && ctx.resume()); });
  return {
    to(k){ want = KEY[k] ? k : 'gb'; glide(); },
    vel(v){ bright = Math.min(1, v/2.2); if (ctx) filt.frequency.setTargetAtTime(650 + bright*4200, ctx.currentTime, .12); },
    ping(){ if (!ctx || !on) return; const t = ctx.currentTime, c = chord(want); voice(t, c[0] + 24, 1.4, .09, 'sine'); voice(t + .09, c[2] + 24, 1.2, .07, 'sine'); voice(t + .18, c[3] + 24, 1.6, .06, 'sine'); },
  };
})();

/* ---------- boot ---------- */
function boot(done){
  const el = $('#boot'), pre = $('#bootTxt');
  el.remove(); return done(); // no intro screen: the page opens straight onto the hero
  const lines = ['> mount <b>GB_2026-27.enc</b>','> password: ********','> <b>access granted</b>','> decrypting 12 identities ...','> PEOPLE | DATA | IDEAS | IMPACT'];
  let i = 0;
  const t = setInterval(() => {
    pre.innerHTML = lines.slice(0, ++i).join('\n');
    if (i >= lines.length){ clearInterval(t); setTimeout(() => { el.classList.add('gone'); done(); setTimeout(() => el.remove(), 800); }, 380); }
  }, 230);
}

/* ---------- scroll film ---------- */
function film(){
  gsap.registerPlugin(ScrollTrigger, ...[window.SplitText, window.ScrambleTextPlugin, window.DrawSVGPlugin, window.Draggable, window.InertiaPlugin, window.CustomEase, window.CustomWiggle].filter(Boolean));
  gsap.config({ nullTargetWarn: false }); // optional scene parts (e.g. no domain line) are simply skipped
  ScrollTrigger.config({ ignoreMobileResize: true }); // the phone address bar showing/hiding must not re-measure the page (it made the scroll jump)
  const HAS = { split: !!window.SplitText, scr: false, draw: !!window.DrawSVGPlugin, drag: !!(window.Draggable && window.InertiaPlugin), wig: !!(window.CustomWiggle && window.CustomEase) };
  if (HAS.wig) CustomWiggle.create('impact', {wiggles:9, type:'easeOut'});
  const SCR = '01#%&@$<>/=+*';
  document.body.classList.add('js');
  if (window.Lenis && matchMedia('(pointer:fine)').matches){
    const lenis = new Lenis({ duration:1.15, smoothWheel:true, wheelMultiplier:.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t*1000)); gsap.ticker.lagSmoothing(0);
  }
  const cur = $('#cur'), dot = $('#dot'), curl = $('#curl');
  if (matchMedia('(hover:hover) and (pointer:fine)').matches){
    const cx = gsap.quickTo(cur, 'x', {duration:.35, ease:'power3'}), cy = gsap.quickTo(cur, 'y', {duration:.35, ease:'power3'});
    const dx = gsap.quickTo(dot, 'x', {duration:.08}), dy = gsap.quickTo(dot, 'y', {duration:.08});
    addEventListener('pointermove', e => {
      const pl = e.target.closest && e.target.closest('.plate'), pn = e.target.closest && e.target.closest('.panel');
      let x = e.clientX, y = e.clientY;
      if (pl){ const r = pl.getBoundingClientRect(); x += (r.left + r.width/2 - x)*.25; y += (r.top + r.height/2 - y)*.25; }
      cx(x); cy(y); dx(e.clientX); dy(e.clientY);
      const show = !!pn; cur.style.opacity = show ? 1 : 0; dot.style.opacity = show ? 1 : 0;
      cur.classList.toggle('big', !!pl); cur.classList.toggle('mid', !pl && !!pn);
      curl.textContent = pl ? (HAS.drag ? 'DRAG' : 'SPIN') : 'TAP';
    });
  }
  const stagesEl = $('#stages'), stageRows = $$('#stages [data-s]'), pct = $('#pct');
  const STAGE = [0, .08, .27, .5, .62, .86];
  function stage(q){
    let k = 0; STAGE.forEach((b, i) => { if (q >= b) k = i; });
    stageRows.forEach((d, i) => { d.classList.toggle('on', i === k); d.classList.toggle('done', i < k); });
    pct.textContent = String(Math.round(q*100)).padStart(3, '0') + '%';
  }
  const ENTR = {
    rain:    () => ({y: () => rnd(-520, -260), opacity:0, stagger:{each:.012, from:'random'}, duration:.07, ease:'bounce.out'}),
    bubbles: () => ({scale:0, y:80, opacity:0, stagger:{each:.012, from:'center'}, duration:.07, ease:'elastic.out(1,.35)'}),
    gears:   () => ({rotation: () => rnd(-540, -300), scale:0, opacity:0, stagger:{each:.012, from:'edges'}, duration:.07, ease:'back.out(1.6)'}),
    ripples: () => ({scale:3.2, opacity:0, filter:'blur(14px)', stagger:{each:.01, from:'center'}, duration:.07, ease:'expo.out'}),
    coins:   () => ({rotationY:-720, y:-300, opacity:0, transformPerspective:600, stagger:{each:.012}, duration:.08, ease:'power3.out'}),
    arrows:  () => ({y:460, scaleY:2.6, opacity:0, transformOrigin:'50% 100%', stagger:{each:.008}, duration:.07, ease:'expo.out'}),
    docs:    () => ({y:-340, x: () => rnd(-160, 160), rotation: () => rnd(-80, 80), opacity:0, stagger:{each:.01, from:'random'}, duration:.08, ease:'power2.out'}),
    bolts:   () => ({opacity:0, x: () => rnd(-80, 80), skewX: () => rnd(-50, 50), scaleY:2, stagger:{each:.012, from:'random'}, duration:.06, ease:'steps(5)'}),
    chair:   () => ({scale:4.5, opacity:0, filter:'blur(18px)', y:-50, stagger:{each:.03}, duration:.06, ease:'power4.out'}),
  };

  // HERO
  const hChars = splitWords($('#heroH .ln'));
  gsap.timeline({ scrollTrigger:{ trigger:'#hero', start:'top top', end:'+=110%', pin:true, scrub:1, onUpdate: s => P.explode = clamp((s.progress - .35)/.65, 0, 1), onLeave: () => P.explode = 0, onEnterBack: s => P.explode = clamp((s.progress - .35)/.65, 0, 1) } })
    .to('#hero .top', {y:-80, opacity:0, ease:'none'}, 0)
    .to('#hero .cue, #hero p', {opacity:0, y:30, ease:'none'}, 0)
    .to([...hChars, '#heroH .yr'], {y: () => rnd(-260, 260), x: () => rnd(-160, 160), rotate: () => rnd(-90, 90), opacity:0, filter:'blur(6px)', stagger:{each:.01, from:'random'}, ease:'power2.in'}, .15);

  // MANIFEST
  const stats = $$('#manifest .stat');
  gsap.timeline({ scrollTrigger:{ trigger:'#manifest', start:'top top', end:'+=110%', pin:true, scrub:1,
    onUpdate: s => stats.forEach((st, i) => { const b = $('b', st); b.textContent = String(Math.round(+b.dataset.to*clamp((s.progress - i*.12)/.5, 0, 1))).padStart(2,'0'); }) } })
    .from(stats, {x:-120, opacity:0, stagger:.12, ease:'power3.out', duration:.4}, 0)
    .from('#manifest .man-copy p, #manifest .eb', {opacity:0, y:20, duration:.3}, .3)
    .to({}, {duration:.4});

  gsap.from('#desh h2, #desh .eb', { scrollTrigger:{ trigger:'#desh', start:'top 85%', end:'top 35%', scrub:1 }, y:140, skewY:10, opacity:0, stagger:.1 });

  // DESIGNATIONS — one pinned stage, the camera flies through nine scenes
  const lite = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
  const blur = v => lite ? 'blur(0px)' : `blur(${v}px)`;
  const scenes = $$('.panel'), N = scenes.length;
  gsap.set(scenes, {autoAlpha:0}); scenes.forEach(p => { p._vis = 0; p._sc = 1; });
  const master = gsap.timeline();
  const S = scenes.map((p, i) => {
    const dark = p.classList.contains('dark');
    const title = $('.rtitle', p), plates = $('.plates', p), grid = $('.p-grid', p);
    const chars = splitWords(title), names = $$('.pl-name', p), pls = $$('.plate', p);
    names.forEach(n => { n.dataset.text = n.textContent; if (HAS.scr) n.textContent = n.textContent.replace(/\S/g, '·'); });
    const desc = $('.desc', p);
    let dws;
    if (HAS.split){ dws = SplitText.create(desc, {type:'lines', mask:'lines', linesClass:'ln'}).lines; }
    else { const words = desc.textContent.trim().split(/\s+/); desc.textContent = ''; dws = words.map((w, k) => { const sp = document.createElement('span'); sp.className = 'dw'; sp.textContent = w + (k < words.length - 1 ? ' ' : ''); desc.appendChild(sp); return sp; }); }
    // outline rect around each plate, sized to the plate in px so DrawSVG lengths are exact
    const lines = pls.map(pl => { const r = pl.getBoundingClientRect(), w = r.width + 14, h = r.height + 14;
      pl.insertAdjacentHTML('beforeend', `<svg class="pl-line" viewBox="0 0 ${w} ${h}" aria-hidden="true"><rect x="1" y="1" width="${w-2}" height="${h-2}"/></svg>`); return $('.pl-line rect', pl); });
    const icPaths = $$('.ic > *', p);
    const sweep = document.createElement('div'); sweep.className = 'sweep'; p.appendChild(sweep);
    const hint = document.createElement('div'); hint.className = 'hint';
    hint.innerHTML = '<span class="m"><b>Click</b> the scene · <b>click</b> a name</span><span class="t"><b>Tap</b> the scene · <b>tap</b> a name</span>'; p.appendChild(hint);
    const word = p.getAttribute('aria-label'), band = Array(6).fill(word).join(' <i>—</i> ') + ' <i>—</i> ';
    const mqA = document.createElement('div'); mqA.className = 'mq a'; mqA.setAttribute('aria-hidden','true'); mqA.innerHTML = band;
    const mqB = document.createElement('div'); mqB.className = 'mq b'; mqB.setAttribute('aria-hidden','true'); mqB.innerHTML = band;
    p.insertBefore(mqB, p.firstChild); p.insertBefore(mqA, p.firstChild);
    const fire = () => { burst(); A.ping(); pls.forEach(pl => { const r = pl.getBoundingClientRect(); C.fire(r.left + r.width/2, r.top + r.height/2, dark ? 220 : 110, dark || p.dataset.fx === 'coins'); }); };

    const tl = gsap.timeline({ defaults:{ ease:'power3.out' } });
    // FLY IN · out of the distance
    tl.fromTo(p, {autoAlpha:1, clipPath:'circle(0% at 50% 50%)'}, {clipPath:'circle(75% at 50% 50%)', duration:.1, ease:'power2.inOut'}, 0)
    // MARQUEES · cross the whole scene in opposite directions with the scroll
      .fromTo(mqA, {xPercent:6, rotation:-7}, {xPercent:-38, rotation:-7, duration:1.05, ease:'none'}, 0)
      .fromTo(mqB, {xPercent:-38, rotation:-7}, {xPercent:6, rotation:-7, duration:1.05, ease:'none'}, 0)
      .fromTo(grid, {scale:.18, z:-600, filter:blur(22), rotationX:18, transformPerspective:1200}, {scale:1, z:0, filter:blur(0), rotationX:0, duration:.11, ease:'power2.out'}, 0)
    // STAGE 1 · arrival
      .fromTo($('.beam.l', p), {rotate:-75, opacity:0}, {rotate:-14, opacity:1, duration:.08}, .02)
      .fromTo($('.beam.r', p), {rotate:75, opacity:0}, {rotate:14, opacity:1, duration:.08}, .02)
      .from($('.ic', p), {scale:0, rotate:-220, duration:.05, ease:'back.out(2.2)'}, .05)
      .from(icPaths, HAS.draw ? {drawSVG:0, duration:.06, stagger:.01, ease:'power2.inOut'} : {opacity:0, duration:.04}, .07)
      .from($('.idx', p), {opacity:0, y:-24, duration:.04}, .06)
      .from($('.eb', p), {opacity:0, letterSpacing:'1.2em', duration:.06}, .07)
    // STAGE 2 · title
      .from(chars, ENTR[p.dataset.fx](), .1)
      .from($$('.domain', p), {opacity:0, clipPath:'inset(0 50% 0 50%)', duration:.04}, .25)
    // STAGE 3 · identity lock
      .fromTo(lines, HAS.draw ? {drawSVG:'50% 50%'} : {opacity:0}, HAS.draw ? {drawSVG:'0% 100%', duration:.05, stagger:.02, ease:'power2.inOut'} : {opacity:1, duration:.03}, .25)
      .from(pls, {clipPath:'inset(0 50% 0 50%)', stagger:.03, duration:.05}, .29)
      .from(pls, {yPercent:220, rotation: k => k % 2 ? 14 : -14, rotationX:60, scale:.6, transformPerspective:900, stagger:.03, duration:.06, ease:'back.out(1.5)'}, .265)
      .to(lines, {opacity:0, duration:.03}, .4)
      .from($$('.br', p), {x: k => [-70,70,-70,70][k%4], y: k => [-70,-70,70,70][k%4], opacity:0, duration:.06}, .29)
      .fromTo(sweep, {top:'0%', opacity:1}, {top:'100%', opacity:.15, duration:.16, ease:'none'}, .3)
      .from($$('.stamp', p), {scale:3.2, opacity:0, rotate:-14, duration:.03, ease:'back.out(3)'}, .46)
      .to(grid, HAS.wig ? {x:16, rotation:.6, ease:'impact', duration:.05} : {x:0, duration:.01}, .47)
    // STAGE 4 · story
      .to([$('.rc-top', p), $('.eb', p)], {opacity:0, y:-24, duration:.04, ease:'power2.in'}, .495)
      .to(title, {scale:.56, y: () => -title.offsetHeight*.3, transformOrigin:'50% 0%', duration:.06, ease:'power3.inOut'}, .5)
      .to(plates, {scale: () => innerWidth < 760 ? 1.04 : 1.16, y: () => -title.offsetHeight*.42, duration:.06, ease:'power3.inOut'}, .5)
      .to(desc, {y: () => -title.offsetHeight*.36, duration:.06, ease:'power3.inOut'}, .5)
      .to($('.domain', p) || {}, {y: () => -title.offsetHeight*.4, scale:.85, duration:.06, ease:'power3.inOut'}, .5)
      .from(dws, HAS.split ? {yPercent:115, rotation:2, stagger:{each:.1/Math.max(dws.length, 1)}, duration:.05, ease:'power4.out'} : {opacity:0, y:22, filter:blur(6), stagger:{each: .1/dws.length}, duration:.03}, .54)
    // STAGE 5 · hold
      .to(chars, {yPercent:-28, scaleY:1.15, duration:.035, ease:'sine.inOut', stagger:{each: .09/Math.max(chars.length, 6), yoyo:true, repeat:3}}, .63)
      .to(pls, {yPercent:-12, stagger:.02, duration:.1, ease:'sine.inOut'}, .62)
      .to(pls, {yPercent:0, stagger:.02, duration:.1, ease:'sine.inOut'}, .73)
      .to($('.beam.l', p), {rotate:-30, duration:.11, ease:'sine.inOut'}, .62)
      .to($('.beam.r', p), {rotate:30, duration:.11, ease:'sine.inOut'}, .62)
      .to($('.beam.l', p), {rotate:-8, duration:.11, ease:'sine.inOut'}, .73)
      .to($('.beam.r', p), {rotate:8, duration:.11, ease:'sine.inOut'}, .73)
      .to(grid, {rotationY:11, rotationX:-6, z:-110, transformPerspective:1200, duration:.11, ease:'sine.inOut'}, .62)
      .to(grid, {rotationY:-11, rotationX:4, z:40, transformPerspective:1200, duration:.12, ease:'sine.inOut'}, .73)
    // STAGE 6 · exit, then FLY THROUGH · rush past the camera
      .to(chars, {y: () => rnd(-300, -120), x: () => rnd(-200, 200), rotate: () => rnd(-100, 100), opacity:0, stagger:{each:.003, from:'random'}, duration:.06, ease:'power2.in'}, .86)
      .to(pls, {rotationX:90, yPercent:-25, opacity:0, transformPerspective:900, stagger:.02, duration:.06, ease:'power2.in'}, .87)
      .to([...dws, $('.domain', p), $('.eb', p), $('.idx', p)].filter(Boolean), {opacity:0, y:-20, stagger:.001, duration:.05, ease:'power2.in'}, .87)
      .to($('.ic', p), {scale:0, rotate:180, duration:.04, ease:'power2.in'}, .9)
      .to(grid, {scale:3.4, z:400, filter:blur(16), opacity:0, duration:.13, ease:'power2.in'}, .93)
      .to($$('.beam', p), {opacity:0, duration:.06}, .95)
      .to(p, {autoAlpha:0, duration:.06, ease:'none'}, 1.02);
    if (HAS.scr) names.forEach((n, k) => tl.to(n, {scrambleText:{text:n.dataset.text, chars:SCR, revealDelay:.35, speed:.6}, duration:.14, ease:'none'}, .31 + k*.02));
    master.add(tl, i);

    // INTERACTION · 3D tilt with the pointer
    const tX = gsap.quickTo(title, 'rotationY', {duration:.6}), tY = gsap.quickTo(title, 'rotationX', {duration:.6});
    const pX = gsap.quickTo(plates, 'rotationY', {duration:.8}), pY = gsap.quickTo(plates, 'rotationX', {duration:.8});
    gsap.set([title, plates], {transformPerspective:1000});
    p.addEventListener('pointermove', e => {
      const r = p.getBoundingClientRect(), nx = (e.clientX - r.left)/r.width - .5, ny = (e.clientY - r.top)/r.height - .5;
      tX(nx*16); tY(-ny*12); pX(nx*24); pY(-ny*16);
      if (e.buttons && Math.random() < .25) G.poke(p, e.clientX, e.clientY);
    });
    p.addEventListener('pointerleave', () => { tX(0); tY(0); pX(0); pY(0); });
    p.addEventListener('click', e => { if (e.target.closest('.plate')) return; G.poke(p, e.clientX, e.clientY); C.fire(e.clientX, e.clientY, 18, dark || p.dataset.fx === 'coins'); });
    const spin = pl => {
      burst();
      const n = $('.pl-name', pl), r = pl.getBoundingClientRect();
      C.fire(r.left + r.width/2, r.top + r.height/2, dark ? 160 : 90, dark || p.dataset.fx === 'coins');
      gsap.fromTo(pl, {rotationY:0}, {rotationY:360, transformPerspective:2400, duration:.9, ease:'power3.inOut'});
      if (HAS.scr) gsap.to(n, {scrambleText:{text:n.dataset.text, chars:SCR, speed:.8}, duration:.9});
      else { const o = {q:0}; gsap.to(o, {q:1, duration:.9, ease:'none', onUpdate: () => decode(n, o.q)}); }
      G.poke(p, r.left + r.width/2, r.top);
    };
    const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
    pls.forEach(pl => {
      if (HAS.drag && fine){
        Draggable.create(pl, { type:'x,y', inertia:true, zIndexBoost:false, minimumMovement:6,
          onPress(e){ e.stopPropagation && e.stopPropagation(); },
          onClick(){ spin(pl); },
          onDragStart(){ burst(); },
          onDrag(){ const r = pl.getBoundingClientRect(); if (Math.random() < .12) G.poke(p, r.left + r.width/2, r.top + r.height/2); },
          onThrowComplete(){ gsap.to(pl, {x:0, y:0, duration:1.3, ease:'elastic.out(1,.35)'}); },
          onRelease(){ if (!this.tween || !this.tween.isActive()) gsap.to(pl, {x:0, y:0, duration:1.3, ease:'elastic.out(1,.35)'}); } });
      } else pl.addEventListener('click', e => { e.stopPropagation(); spin(pl); });
    });
    return { p, dark, names, fire, fired:false, grid };
  });
  master.to({}, {duration:.001}, N + .08);

  const skewers = S.map(sc => gsap.quickTo(sc.grid, 'skewY', {duration:.45, ease:'power3'}));
  const skewAll = v => skewers.forEach(f => f(v)); let skewT;
  let active = -1;
  function setActive(i){
    if (i === active) return; active = i;
    const sc = S[i]; hud(sc.p.dataset.hud);
    document.body.classList.toggle('dark', sc.dark); P.dark = sc.dark ? 1 : 0;
    P.setShape('icon:' + sc.p.id); A.to(sc.p.dataset.key); burst();
  }
  master.eventCallback('onUpdate', () => {
    const t = master.time();
    S.forEach((sc, i) => {
      const q = t - i;
      sc.p._vis = (q < -.001 || q > 1.08) ? 0 : clamp((1.08 - q)/.1, 0, 1);
      sc.p._iris = q < .1 ? gsap.parseEase('power2.inOut')(clamp(q/.1, 0, 1)) : 1;
      sc.p._sc = q < .11 ? .35 + .65*clamp(q/.11, 0, 1) : q > .93 ? 1 + 2.4*clamp((q - .93)/.15, 0, 1) : 1;
      if (!HAS.scr && q > -.05 && q < 1.1) sc.names.forEach(n => {
        if (q >= .3){ if (!n._dec){ n._dec = 1; const o = {q:0}; gsap.to(o, {q:1, duration:.55, ease:'none', onUpdate: () => decode(n, o.q)}); } }
        else if (q < .25 && n._dec){ n._dec = 0; decode(n, 1); } // scrolled back: plain name again, never left scrambled
      });
      if (q > .47 && q < .8 && !sc.fired){ sc.fired = true; sc.fire(); } else if (q < .25 || q > .9) sc.fired = false;
    });
    setActive(clamp(Math.floor(t + .02), 0, N - 1));
    { const a = clamp(Math.floor(t + .02), 0, N - 1), q = t - a;
      P.spin = clamp((q - .08)/.84, 0, 1)*Math.PI*2*(a % 2 ? -1 : 1);
      P.warp = q > .9 ? clamp((q - .9)/.12, 0, 1) : q < .1 ? clamp(1 - q/.1, 0, 1)*(a > 0 ? 1 : .6) : 0; }
  });
  ScrollTrigger.create({ trigger:'#stage', start:'top top', end: () => '+=' + innerHeight*5.4*N, pin:true, scrub:1.4, anticipatePin:1, animation: master,
    onUpdate: s => { G.vel = Math.min(3, Math.abs(s.getVelocity())/900); A.vel(Math.abs(s.getVelocity())/900); const sv = clamp(s.getVelocity()/-260, -9, 9); skewAll(sv); clearTimeout(skewT); skewT = setTimeout(() => skewAll(0), 110); if (s.isActive){ const x = s.progress*(N + .08); stage(clamp(x - Math.floor(clamp(x, 0, N - .001)), 0, 1)); } },
    onToggle: s => { stagesEl.classList.toggle('on', s.isActive); if (s.isActive){ const i = active < 0 ? 0 : active; active = -1; setActive(i); } else { document.body.classList.remove('dark'); P.dark = 0; P.spin = 0; P.warp = 0; } } });

  // ASSEMBLY
  gsap.timeline({ scrollTrigger:{ trigger:'#assembly', start:'top top', end:'+=130%', pin:true, scrub:1 } })
    .from('#assembly h2, #assembly .eb', {y:60, opacity:0, stagger:.05, duration:.2}, 0)
    .from($$('.mcard'), { x: () => rnd(-innerWidth*.6, innerWidth*.6), y: () => rnd(-innerHeight*.7, innerHeight*.7), rotate: () => rnd(-50, 50), scale: () => rnd(.4, innerWidth < 760 ? 1.1 : 1.5), opacity:0, stagger:{each:.03}, duration:.6, ease:'power3.out' }, .05)
    .to({}, {duration:.15});
  gsap.from('.fcard', { scrollTrigger:{ trigger:'#faculty', start:'top 75%', end:'top 25%', scrub:1 }, y:60, opacity:0, stagger:.1 });

  // section labels + particle shapes, created last so positions include the pins above
  [['#hero','DSSS'],['#manifest','12'],['#assembly','scatter'],['#faculty','scatter']].forEach(([sel, shp]) =>
    ScrollTrigger.create({ trigger: sel, start:'top 55%', end:'bottom 45%', onToggle: s => { if (s.isActive){ P.setShape(shp); hud($(sel).dataset.hud); A.to('gb'); } } }));

  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
}

P.start(); G.start(); C.start();
document.fonts && document.fonts.ready.then(() => { P.refresh(); if (reduce) P.start(); });
boot(() => { if (reduce || !window.gsap || !window.ScrollTrigger) return; const go = () => film(); (document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve()).then(go); });
} };
