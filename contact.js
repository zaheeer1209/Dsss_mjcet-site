/* DSSS homepage — query form. No server: it composes the message and hands it to WhatsApp or the visitor's email app. */
(() => {
  const f = document.getElementById('queryForm'); if (!f) return;
  const WA = '919705166760', MAIL = 'chair@dsssmjcet.com', err = document.getElementById('qErr');
  let via = 'wa';
  f.querySelectorAll('button[type=submit]').forEach(b => b.addEventListener('click', () => { via = b.dataset.via; }));
  f.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(f), name = (d.get('name') || '').trim(), who = d.get('who'), topic = d.get('topic'), msg = (d.get('msg') || '').trim(), reach = (d.get('reach') || '').trim();
    const miss = [!name && 'your name', !who && 'who you are', !topic && 'what it is about', !msg && 'your question'].filter(Boolean);
    if (miss.length){ err.textContent = 'Please add ' + miss.join(', ') + '.'; (f.querySelector(!name ? '#qName' : !who ? '[name=who]' : !topic ? '[name=topic]' : '#qMsg')).focus(); return; }
    err.textContent = '';
    const body = `Hi DSSS,\n\n${msg}\n\nName: ${name}\nI am: ${who}\nAbout: ${topic}` + (reach ? `\nReach me at: ${reach}` : '') + `\n\n(sent from dsssmjcet.com)`;
    const url = via === 'mail'
      ? `mailto:${MAIL}?subject=${encodeURIComponent('DSSS query: ' + topic + ' (' + name + ')')}&body=${encodeURIComponent(body)}`
      : `https://wa.me/${WA}?text=${encodeURIComponent(body)}`;
    via === 'mail' ? (location.href = url) : window.open(url, '_blank', 'noopener');
  });
  // a light reveal when the section scrolls in (the form never moves while you type)
  if (window.gsap && window.ScrollTrigger && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    gsap.from('#contact .ct-info > *, #contact .ct-form', {y: 40, opacity: 0, stagger: .08, duration: .7, ease: 'power3.out', scrollTrigger: {trigger: '#contact', start: 'top 75%', once: true}});
  }
})();
