/* DSSS homepage — 3D scroll film. Needs GSAP (+ScrollTrigger, SplitText, DrawSVG) and Lenis, loaded in index.html. */
(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random()*(b - a);
const GLY = '01#%&@$<>/\\=+*ABCDEFXZ';
function decode(el, p){
  const t = el.dataset.text || (el.dataset.text = el.textContent);
  if (p >= 1){ if (el.textContent !== t) el.textContent = t; return; }
  const k = Math.max(0, Math.floor(t.length*p));
  el.textContent = t.slice(0, k) + t.slice(k).replace(/\S/g, () => GLY[Math.random()*GLY.length|0]);
}

/* ---------- background: the outlined section word (CSS) + brief glitch bars when scrolling fast ---------- */
const BG = (() => {
  const c = $('#bg'), x = c.getContext('2d'); let W, H, gl = [], lastY = scrollY, vel = 0;
  function resize(){ const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; c.width = W*d; c.height = H*d; x.setTransform(d,0,0,d,0,0); }
  function draw(){
    const dy = scrollY - lastY; lastY = scrollY; vel = vel*.85 + Math.abs(dy)*.15;
    if (Math.random() < (vel > 6 ? Math.min(.3, vel/180) : .003)) gl.push({y: Math.random()*H, h: 2 + Math.random()*14, x: Math.random()*W*.6, w: 40 + Math.random()*W*.45, life: 2 + (Math.random()*6|0)});
    if (!gl.length) return; x.clearRect(0,0,W,H);
    gl = gl.filter(g => g.life-- > 0);
    for (const g of gl){ const j = (Math.random()-.5)*20, o = 3 + Math.random()*5;
      x.fillStyle = `rgba(157,184,255,${.14 + Math.random()*.16})`; x.fillRect(g.x + j - o, g.y, g.w, g.h);
      x.fillStyle = `rgba(11,75,245,${.06 + Math.random()*.12})`; x.fillRect(g.x + j, g.y, g.w, g.h); }
    if (!gl.length) x.clearRect(0,0,W,H);
  }
  function loop(){ draw(); requestAnimationFrame(loop); }
  addEventListener('resize', resize);
  return { start(){ resize(); if (!reduce) loop(); } };
})();


/* ---------- HUD ---------- */
const hudsec = $('#hudsec'), hudbar = $('#hudbar');
addEventListener('scroll', () => { const m = document.documentElement.scrollHeight - innerHeight; hudbar.style.transform = `scaleX(${m > 0 ? scrollY/m : 0})`; }, {passive:true});
const hud = t => { if (t && hudsec.textContent !== t) hudsec.textContent = t; };
function burst(){ if (reduce) return; document.body.classList.add('burst'); setTimeout(() => document.body.classList.remove('burst'), 240); }

/* ---------- boot ---------- */
function boot(done){
  const el = $('#boot'), pre = $('#bootTxt');
  if (reduce){ el.remove(); return done(); }
  const lines = ['> boot <b>DSSS_NODE_01</b>','> loading people · data · ideas · impact','> <b>society online</b>'];
  let i = 0; const t = setInterval(() => { pre.innerHTML = lines.slice(0, ++i).join('\n');
    if (i >= lines.length){ clearInterval(t); setTimeout(() => { el.classList.add('gone'); done(); setTimeout(() => el.remove(), 800); }, 300); } }, 260);
}

/* ---------- scroll film ---------- */
function film(){
  gsap.registerPlugin(ScrollTrigger, ...[window.SplitText, window.DrawSVGPlugin].filter(Boolean));
  const HAS = { split: !!window.SplitText, draw: !!window.DrawSVGPlugin };
  const lite = innerWidth < 760;
  document.body.classList.add('js');
  let lenis = null;
  if (window.Lenis && matchMedia('(pointer:fine)').matches){
    lenis = new Lenis({duration:1.6, smoothWheel:true, wheelMultiplier:.55, touchMultiplier:.8});
    lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t*1000)); gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
    // nav lands on the section's fully assembled moment (its lock point), not the empty start of the pin
    const L = locks.find(l => l.st.trigger === t), st = ScrollTrigger.getAll().find(x => x.trigger === t && x.pin),
          q = {teams:.45}[t.id] ?? (L && L.q),
          y = t.id === 'hero' ? 0 : L ? Math.round(L.st.start + (L.st.end - L.st.start)*q) : st ? st.start : t.getBoundingClientRect().top + scrollY - 60;
    jumping = true; setTimeout(() => jumping = false, 2400);
    lenis ? lenis.scrollTo(y, {duration:2}) : scrollTo({top:y, behavior:'smooth'});
  }));
  if (matchMedia('(hover:hover) and (pointer:fine)').matches){
    const cur = $('#cur'), cx = gsap.quickTo(cur, 'x', {duration:.3, ease:'power3'}), cy = gsap.quickTo(cur, 'y', {duration:.3, ease:'power3'});
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); cur.style.opacity = 1; cur.classList.toggle('big', !!(e.target.closest && e.target.closest('a,button'))); });
  }

  // a pinned stage: `len` screens of scroll, animations placed on a 0→1 timeline
  // LOCK: when a section has fully assembled, the scroll settles there and holds for 0.398s so nobody scrolls past it unseen
  let jumping = false, holding = false, lastY = scrollY;
  const locks = [];
  function hold(y){
    holding = true;
    const release = () => setTimeout(() => { holding = false; lenis ? lenis.start() : (document.documentElement.style.overflow = ''); }, 398);
    if (lenis){ lenis.scrollTo(y, {duration:.6, lock:true, force:true, onComplete:() => { lenis.stop(); release(); }}); }
    else { document.documentElement.style.overflow = 'hidden'; release(); }
  }
  addEventListener('scroll', () => {
    const y = scrollY, big = Math.abs(y - lastY) > innerHeight*.5; // scrollbar drags and jumps never lock
    if (big) locks.forEach(L => L.armed = true);
    if (!holding && !jumping && !big) for (const L of locks){
      const at = L.st.start + (L.st.end - L.st.start)*L.q;
      if (lastY < at && y >= at){ if (!L.armed) continue; L.armed = false; hold(at); break; } // only on the way down
      if (Math.abs(y - at) > innerHeight*.6) L.armed = true;
    }
    lastY = y;
  }, {passive:true});
  let STAGES = 0;
  function stage(sel, len, build, lockAt){
    const sec = $(sel), tl = gsap.timeline({ defaults:{ease:'power3.out'}, scrollTrigger:{ trigger:sec, start:'top top', end: () => '+=' + innerHeight*len, pin:true, scrub:1.6, anticipatePin:1, onToggle: st => { if (st.isActive) hud(sec.dataset.hud); } } });
    const mq = $('.mq', sec); if (mq) tl.fromTo(mq, {xPercent:0, yPercent:-50, rotationX:0}, {xPercent:-45, yPercent:-50, rotationX:-6, duration:1, ease:'none'}, 0);
    const cam = sec.id === 'hero' ? $('#hero .cam') : $(':scope > .wrap', sec), dir = (STAGES++ % 2) ? 1 : -1;
    if (cam && sec.id !== 'hero') tl.fromTo(cam, {z:-1100, rotationX:32, rotationY:dir*14, opacity:0}, {z:0, rotationX:0, rotationY:0, opacity:1, duration:.2, ease:'power2.out'}, 0);
    if (cam){
      tl.to(cam, {rotationY:dir*-7, rotationX:3, z:-60, duration:.3, ease:'sine.inOut'}, .5)
        .to(cam, {rotationY:dir*5, rotationX:-2, z:0, duration:.1, ease:'sine.inOut'}, .8)
        .to(cam, {z:520, rotationX:-28, rotationY:dir*-10, opacity:0, duration:.12, ease:'power2.in'}, .88);
    }
    build(tl, sec);
    // content taller than the screen glides up inside the pin
    const w = $(':scope > .wrap', sec), over = w ? w.offsetHeight - (innerHeight - 100) : 0;
    if (over > 0) tl.fromTo(w, {y:0}, {y:-over, duration:.7, ease:'none'}, .2);
    tl.to({}, {duration:.001}, 1);
    if (lockAt != null) locks.push({st: tl.scrollTrigger, q: lockAt, armed: true});
    return tl;
  }
  const STY = [
    () => ({rotationX:-105, yPercent:40, opacity:0, transformOrigin:'50% 100% -20px', stagger:.012, ease:'back.out(1.6)'}),
    () => ({z:-900, rotationY: () => rnd(-110, 110), rotationX: () => rnd(-40, 40), opacity:0, stagger:{each:.012, from:'random'}, ease:'power3.out'}),
    () => ({rotationY:-180, opacity:0, transformOrigin:'50% 50% -30px', stagger:.014, ease:'back.out(1.3)'}),
  ];
  let hi = 0;
  const heading = (tl, sec, at = 0, dur = .18) => {
    const h = $('.h2', sec); if (!h) return;
    const chars = HAS.split ? SplitText.create(h, {type:'words,chars'}).chars : [h];
    { const v = STY[hi++ % 3](), fr = (v.stagger && v.stagger.from) || 'start'; v.stagger = {amount:dur*.55, from:fr}; tl.from(chars, {...v, duration:dur*.45}, at); }
  };
  const ebIn = (tl, sec, at = 0) => { const e = $('.eb', sec); if (e) tl.from(e, {x:-60, opacity:0, duration:.08}, at); };

  // 00 HERO · ~4 screens: copy drops away, then the title comes apart letter by letter
  const hl = HAS.split ? SplitText.create('#heroH .l1, #heroH .l2', {type:'words,chars'}).chars : [];
  gsap.set('#heroH .l1, #heroH .l2, #heroH div', {transformStyle:'preserve-3d'});
  stage('#hero', 4, tl => {
    tl.fromTo('#hero .cue', {opacity:1}, {opacity:0, duration:.05, immediateRender:false}, 0)
      .fromTo('#hero p, #hero .cta', {y:0, opacity:1}, {y:60, opacity:0, stagger:.04, duration:.2, immediateRender:false}, .08)
      // letters drift apart at the speed of the scroll, and only fade near the end
      .fromTo(hl.length ? hl : '#heroH', {x:0, y:0, z:0, rotationX:0, rotationY:0},
        {immediateRender:false, z: () => rnd(30, 140), y: () => rnd(-110, 110), x: () => rnd(-130, 130), rotationX: () => rnd(-45, 45), rotationY: () => rnd(-45, 45), stagger:{amount:.12, from:'random'}, duration:.5, ease:'power2.in'}, .35)
      .fromTo(hl.length ? hl : '#heroH', {opacity:1}, {immediateRender:false, opacity:0, stagger:{amount:.12, from:'random'}, duration:.45, ease:'power4.in'}, .42)
      .fromTo('#hero .top', {y:0, opacity:1, rotationX:0}, {y:-80, rotationX:80, opacity:0, duration:.1, immediateRender:false}, .85);
  }, .3);

  // 01 MANIFEST · ~4.5 screens: stats flip down like tiles while the DS+ mark turns in 3D
  const nums = $$('#manifest .stat b[data-to]');
  const mtl = stage('#manifest', 4.5, (tl, sec) => {
    ebIn(tl, sec, 0);
    tl.fromTo('#mark', {rotationY:-75, rotationX:22, z:-700, opacity:0, transformPerspective:1100}, {rotationY:0, rotationX:0, z:0, opacity:1, duration:.3}, .05)
      .from('#manifest .stat', {rotationX:-95, transformOrigin:'50% 0%', transformPerspective:900, opacity:0, stagger:.12, duration:.16, ease:'back.out(1.4)'}, .14)
      .from('#manifest .man-copy p', {y:40, rotationX:-40, transformPerspective:800, opacity:0, duration:.1}, .52)
      .to('#mark', {rotationY:28, rotationX:-10, duration:.42, ease:'sine.inOut'}, .42);
  }, .6);
  mtl.eventCallback('onUpdate', () => { const q = mtl.progress(); nums.forEach((b, i) => { b.textContent = String(Math.max(Math.round(+b.dataset.to*clamp((q - .16 - i*.12)/.1, 0, 1)), q > .1 ? 0 : 0)).padStart(2,'0'); }); });

  // 02 VISION · ~5 screens: heading builds, the statement rises from a tilt and fills in word by word
  stage('#vision', 5, (tl, sec) => {
    ebIn(tl, sec, 0); heading(tl, sec, .03, .2);
    tl.fromTo('#lead', {rotationX:48, y:80, transformOrigin:'50% 100%', transformPerspective:900, opacity:0}, {rotationX:0, y:0, opacity:1, duration:.2}, .24);
    if (HAS.split){
      const words = SplitText.create('#lead', {type:'words'}).words;
      gsap.set(words, {color:'#C9D6F7'});
      tl.to(words, {color:'#0A1A4A', stagger:.36/words.length, duration:.04, ease:'none'}, .34);
    }
    tl.from('#vision .rule-grid span', {scaleX:0, transformOrigin:'0% 50%', stagger:.05, duration:.08}, .74);
  }, .84);

  // 03 GOALS · ~7.5 screens: ten objectives on a 3D ring that turns with the scroll
  const ring = $('#ring'), gs = $$('#ring .g'), gc = $('#goalCount'), STEP = 360/gs.length;
  let R = 0;
  function layoutRing(){
    const w = gs[0].offsetWidth || 330; R = Math.round((w/2)/Math.tan(Math.PI/gs.length)*1.08);
    gs.forEach((g, i) => { g.style.transform = `translate(-50%,-50%) rotateY(${i*STEP}deg) translateZ(${R}px)`; });
    gsap.set(ring, {z:-R});
  }
  layoutRing(); addEventListener('resize', layoutRing);
  function shadeRing(){
    const ry = gsap.getProperty(ring, 'rotationY') || 0; let best = 0, bi = 0;
    gs.forEach((g, i) => { const a = ((i*STEP + ry) % 360 + 540) % 360 - 180, c = Math.cos(a*Math.PI/180);
      g.style.opacity = (.18 + .82*Math.max(0, c)).toFixed(3); if (c > best){ best = c; bi = i; } });
    gs.forEach((g, i) => g.classList.toggle('front', i === bi));
    gc.textContent = `Objective ${String(bi + 1).padStart(2,'0')} / ${gs.length}`;
  }
  const gtl = stage('#goals', 7.5, (tl, sec) => {
    ebIn(tl, sec, 0); heading(tl, sec, .02, .14);
    tl.from('#goals .hint', {opacity:0, y:20, duration:.04}, .15)
      .fromTo('.ring-stage', {rotationX:55, z:-500, opacity:0, transformPerspective:1400}, {rotationX:0, z:0, opacity:1, duration:.12}, .18)
      .fromTo(ring, {rotationY:0}, {rotationY:-(gs.length - 1)*STEP, duration:.66, ease:'none'}, .24);
  }, .25);
  gtl.eventCallback('onUpdate', shadeRing); shadeRing();
  gs.forEach((g, i) => g.addEventListener('click', () => {
    const st = gtl.scrollTrigger, q = .24 + .66*i/(gs.length - 1), y = st.start + (st.end - st.start)*q;
    lenis ? lenis.scrollTo(y, {duration:1.4}) : scrollTo({top:y, behavior:'smooth'});
  }));

  // 04 TEAMS · desktop ~5.5 screens: four team cards land on a 3D deck
  //          phones ~3 screens: the deck flies in once, then the cards are a swipe row
  const tc = $$('#tstack .tcard'), tstack = $('#tstack'), swipe = innerWidth < 760;
  if (swipe){
    tstack.classList.add('swipe');
    const hint = document.createElement('div'); hint.className = 'swipe-hint';
    hint.innerHTML = '<span>Swipe for all teams</span><b>01 / ' + String(tc.length).padStart(2, '0') + '</b>';
    tstack.after(hint);
    const cnt = hint.querySelector('b');
    tstack.addEventListener('scroll', () => {
      const i = Math.round(tstack.scrollLeft/(tc[0].offsetWidth + 14));
      cnt.textContent = String(Math.min(i + 1, tc.length)).padStart(2, '0') + ' / ' + String(tc.length).padStart(2, '0');
    }, {passive:true});
  }
  else gsap.set(tc.slice(1), {yPercent:140, rotation: i => i % 2 ? 5 : -5, rotationX:65, z:300, transformPerspective:1200});
  const ttl = stage('#teams', swipe ? 3 : 5.5, (tl, sec) => {
    ebIn(tl, sec, 0); heading(tl, sec, .02, .16);
    tl.from('#teams .status', {opacity:0, x:-30, duration:.06}, .19);
    if (swipe){
      tl.from(tstack, {z:-700, rotationX:50, opacity:0, transformPerspective:1000, duration:.18}, .22)
        .from('#teams .swipe-hint', {opacity:0, y:14, duration:.06}, .36);
      return;
    }
    tl.from(tc[0], {z:-900, rotationX:70, rotationY:-25, opacity:0, transformPerspective:1200, duration:.16}, .22);
    tc.slice(1).forEach((c, i) => {
      const at = .38 + i*.14;
      tl.fromTo(c, {yPercent:140, rotation: i % 2 ? 5 : -5, rotationX:65, z:300}, {yPercent:0, rotation:0, rotationX:0, z:0, duration:.13, immediateRender:false}, at)
        .to(tc.slice(0, i + 1), {z: k => -(i + 1 - k)*130, rotationX: k => (i + 1 - k)*6, y: k => -(i + 1 - k)*30, filter: lite ? 'none' : 'brightness(.86)', duration:.13}, at);
    });
  }, swipe ? .5 : .8);

  // 05 CTA · ~4 screens: the marquee lies flat like a floor, the sign-off flips up
  stage('#cta', 4, (tl, sec) => {
    tl.fromTo('#mq1', {xPercent:0, rotationX:22, transformPerspective:1200, transformOrigin:'50% 100%'}, {xPercent:-45, rotationX:0, duration:1, ease:'none'}, 0);
    ebIn(tl, sec, .1); heading(tl, sec, .12, .2);
    tl.from('#cta .cta .btn', {rotationX:-90, transformOrigin:'50% 0%', transformPerspective:700, opacity:0, stagger:.06, duration:.1, ease:'back.out(1.6)'}, .45);
  }, .6);
  const mg = $('#magnet');
  if (matchMedia('(pointer:fine)').matches){
    const mx = gsap.quickTo(mg, 'x', {duration:.4, ease:'power3'}), my = gsap.quickTo(mg, 'y', {duration:.4, ease:'power3'});
    mg.addEventListener('pointermove', e => { const r = mg.getBoundingClientRect(); mx((e.clientX - r.left - r.width/2)*.35); my((e.clientY - r.top - r.height/2)*.35); });
    mg.addEventListener('pointerleave', () => { mx(0); my(0); });
  }

  if (matchMedia('(hover:hover) and (pointer:fine)').matches){
    const hs = $$('main .h2, #heroH');
    const tx = gsap.quickTo(hs, 'rotationY', {duration:.8, ease:'power3'}), ty = gsap.quickTo(hs, 'rotationX', {duration:.8, ease:'power3'});
    gsap.set(hs, {transformPerspective:900});
    addEventListener('pointermove', e => { tx((e.clientX/innerWidth - .5)*18); ty(-(e.clientY/innerHeight - .5)*12); });
  }
  document.fonts && document.fonts.ready.then(() => { layoutRing(); ScrollTrigger.refresh(); });
}

BG.start();
(() => { if (reduce || !window.gsap || !window.ScrollTrigger) return; (document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve()).then(film); })();
})();
