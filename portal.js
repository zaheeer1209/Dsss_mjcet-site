/* DSSS Mainframe — loads the governing body from Supabase (members table),
   builds one scroll scene per designation, then starts the film (portal-film.js).
   If Supabase is not configured or returns nothing, the fallback list below is used. */

// [name, designation, department] — same list and order as before (display order: Chair first)
const membersFallback = [
  ["Shaik Zaheer Ahmed","Chair","Leadership"],["Salma Fatima","Vice Chair","Leadership"],
  ["Sadiya Fatima","Vice Chair","Leadership"],["Ruquiya Mannan","General Secretary","Administration"],
  ["Riham Mujtaba","Deputy General Secretary","Administration"],["Mir Sajjad Ali Razvi","Treasurer","Finance"],
  ["Syeda Rania Fatima","Chief Representative","Representation"],["Mohid Uddin","Chief Representative","Representation"],
  ["Syed Sohaib Sultan Razvi","Tech Captain","Technical"],["Tauqeer Ahmed Farhan","Tech Captain","Technical"],
  ["Moghal Asif Ahamad Baig","Advisor Communication and Collaboration","Advisory"],["Ghulam Waheed","Advisor Hackathon","Advisory"]
].map(([name, designation, department]) => ({ name, designation, department }));

const ICONS = {
  bolt:  '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  link:  '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  code:  '<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>',
  chat:  '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  key:   '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  book:  '<path d="M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z"/><path d="M12 6v14"/>',
  shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  star:  '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>',
};

// Each designation gets its own visual, icon, music key and description. Order matters (vice before chair, deputy before general).
const ROLES = [
  { test:/hack/i, key:'adv-hack', fx:'rain', icon:'bolt',
    desc:'Guides the society’s hackathon game. Spots the right competitions, helps form balanced teams, and mentors them from first idea to final pitch at events like Smart India Hackathon.' },
  { test:/commun|collab/i, key:'adv-comm', fx:'bubbles', icon:'link',
    desc:'Shapes how DSSS speaks and who it works with. Advises on the society’s public voice, collaborations with other clubs and chapters, and partnerships beyond campus.' },
  { test:/advis/i, key:'adv-comm', fx:'bubbles', icon:'link',
    desc:'Advises the governing body and brings experience and perspective to the society’s biggest decisions.' },
  { test:/tech/i, key:'tech', fx:'gears', icon:'code',
    desc:'Lead the technical side of DSSS. They design workshop and competition content, mentor members through projects and Kaggle sprints, and keep the club’s technical bar high.' },
  { test:/represent/i, key:'rep', fx:'ripples', icon:'chat',
    desc:'The bridge between members and the governing body. They gather feedback from students across every branch, represent their interests, and drive membership and outreach on campus.' },
  { test:/treasur|financ/i, key:'treas', fx:'coins', icon:'key',
    desc:'Keeps the society’s money in order. Plans event budgets, tracks every expense and sponsorship, and keeps the accounts transparent for the governing body and the department.' },
  { test:/deputy/i, key:'dgs', fx:'arrows', icon:'check',
    desc:'Works hand in hand with the General Secretary on documentation, approvals and event logistics, and keeps operations running smoothly when the calendar gets crowded.' },
  { test:/secretar/i, key:'gs', fx:'docs', icon:'book',
    desc:'Runs the society’s operations. Owns meeting minutes, official communication, permissions and records, and makes sure every decision the governing body takes turns into action.' },
  { test:/vice/i, key:'vc', fx:'bolts', icon:'shield',
    desc:'Share the leadership load with the Chair. They oversee the execom’s day-to-day work, keep events on schedule, and step in to lead the society whenever the Chair is away.' },
  { test:/chair/i, key:'chair', fx:'chair', icon:'star',
    desc:'Leads the society and sets its vision for the year. Chairs governing body meetings, represents DSSS to the department and the college, and drives its biggest bets.' },
];
const OTHER = { key:'gb', fx:'arrows', icon:'check', desc:'Part of the DSSS governing body for 2026–27.' };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const pad = n => String(n).padStart(2, '0');
const WORDS = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'];
const word = n => WORDS[n] || String(n);
const icon = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';

// "Advisor Hackathon" -> title "Advisor", domain "Hackathon"
function splitDesignation(d){
  const m = String(d).trim().match(/^(advis[oe]r)\s*[·:\-–—]?\s*(.+)$/i);
  return m ? { title:'Advisor', domain:m[2].trim() } : { title:String(d).trim(), domain:'' };
}

async function fetchMembers(){
  const configured = window.DSSS_SUPABASE_URL && window.DSSS_SUPABASE_ANON_KEY && !String(window.DSSS_SUPABASE_URL).startsWith('YOUR_') && window.supabase;
  if (!configured) return null;
  try {
    const sb = window.supabase.createClient(window.DSSS_SUPABASE_URL, window.DSSS_SUPABASE_ANON_KEY);
    const query = sb.from('members').select('*').order('display_order', {ascending:true}).order('id', {ascending:true});
    const timeout = new Promise(resolve => setTimeout(() => resolve({ data:null, error:'timeout' }), 6000));
    const { data, error } = await Promise.race([query, timeout]);
    if (error || !data?.length) return null;
    return data.filter(x => x.name && x.designation).map(x => ({
      name:x.name, designation:x.designation, department:x.department || '', photo:safeUrl(x.photo_url), bio:x.bio || ''
    }));
  } catch (e) { console.warn('Mainframe: using fallback members', e); return null; }
}

function groupByDesignation(rows){
  const groups = [], byKey = new Map();
  rows.forEach(m => {
    const k = m.designation.trim().toLowerCase();
    if (!byKey.has(k)){
      const role = ROLES.find(r => r.test.test(m.designation)) || OTHER;
      const g = { ...splitDesignation(m.designation), role, members:[] };
      byKey.set(k, g); groups.push(g);
    }
    byKey.get(k).members.push(m);
  });
  return groups;
}

function plate(m, n){
  const dept = esc(m.department || '');
  return `<div class="plate${m.photo ? ' has-ph' : ''}">
    <i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br brr"></i>
    ${m.photo ? `<img class="pl-ph" src="${esc(m.photo)}" alt="" loading="lazy">` : ''}
    ${dept ? `<span class="pl-lab">${dept}</span>` : ''}
    <b class="pl-name dec" data-text="${esc(m.name)}">${esc(m.name)}</b>
    ${m.bio ? `<span class="pl-bio">${esc(m.bio)}</span>` : ''}
  </div>`;
}

function render(rows){
  const groups = groupByDesignation(rows);
  const scenes = groups.slice().reverse(); // advisors first, Chair last
  const total = scenes.length;

  // numbers in the hero and manifest
  document.getElementById('heroPeople').textContent = `${word(rows.length)} ${rows.length === 1 ? 'person' : 'people'}`;
  document.getElementById('heroRoles').textContent = `${word(total)} designation${total === 1 ? '' : 's'}`;
  const sm = document.getElementById('statMembers'), sr = document.getElementById('statRoles');
  sm.dataset.to = rows.length; sm.textContent = pad(rows.length);
  sr.dataset.to = total; sr.textContent = pad(total);
  document.getElementById('deshLabel').textContent = `Designations 01 → ${pad(total)}`;

  // member numbers follow the reveal order
  let n = 1;
  document.getElementById('stage').innerHTML = scenes.map((g, i) => {
    const dark = g.role.key === 'chair' ? ' dark' : '';
    const hud = `${pad(i + 1)} · ${g.title.toUpperCase()}` + (g.domain ? ` · ${g.domain.toUpperCase()}` : '');
    const fs = Math.min(17, 165/Math.max(g.title.length, 1)).toFixed(1);
    const plates = g.members.map(m => plate(m, n++)).join('');
    return `<section class="panel${dark}" id="role-${i + 1}" data-fx="${g.role.fx}" data-key="${g.role.key}" data-hud="${esc(hud)}" aria-label="${esc(g.title)}" style="--fs:${fs}vw">
      <div class="beam l" aria-hidden="true"></div><div class="beam r" aria-hidden="true"></div>
      <div class="ghost" aria-hidden="true">${pad(i + 1)}</div>
      <div class="p-grid">
        <div class="p-copy">
          <div class="rc-top">${icon(g.role.icon)}<div class="idx"><span>Designation ${pad(i + 1)}</span><span>/ ${pad(total)}</span></div></div>
          <div class="eb">Governing Body 2026–27</div>
          <h2 class="rtitle">${esc(g.title)}</h2>
          ${g.domain ? `<div class="domain">${esc(g.domain)}</div>` : ''}
          <p class="desc">${esc(g.role.desc)}</p>
        </div>
        <div class="p-names"><div class="plates n${Math.min(g.members.length, 2)}">${plates}</div></div>
      </div>
    </section>`;
  }).join('\n');

  // roster in the table's own order (Chair first)
  document.getElementById('roster').innerHTML = groups.flatMap(g => g.members.map(m => {
    const role = g.title + (g.domain ? ` · ${g.domain}` : '');
    const pic = m.photo ? `<img class="ph" src="${esc(m.photo)}" alt="" loading="lazy">` : icon(g.role.icon);
    return `<div class="mcard${g.role.key === 'chair' ? ' lead' : ''}">${pic}<span class="m-role">${esc(role)}</span><b>${esc(m.name)}</b></div>`;
  })).join('\n');
}

(async () => {
  const rows = (await fetchMembers()) || membersFallback;
  render(rows);
  window.DSSSFilm.start();
})();
