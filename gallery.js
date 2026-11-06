/* DSSS gallery: built-in event albums (photos + reel) and, when Supabase is connected, the published `gallery` table. */
const grid = document.getElementById("galleryGrid"), dbAlbum = document.getElementById("dbAlbum");
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}

/* ---- albums: fill each photo button, then a lightbox with prev / next / swipe / keys ---- */
const photos = [...document.querySelectorAll(".photos .ph")];
photos.forEach(b => {
  const src = `media/data-rescue/dr-${b.dataset.n}.jpg`, cap = b.dataset.cap;
  b.innerHTML = `<img src="${src}" alt="${esc(cap)}" loading="lazy" decoding="async"><span>${esc(cap)}</span>`;
  b.setAttribute("aria-label", `Open photo: ${cap}`);
});
const lb = document.getElementById("lightbox"), lbImg = document.getElementById("lbImg"), lbCap = document.getElementById("lbCap");
let at = 0;
function show(i){
  at = (i + photos.length) % photos.length;
  const b = photos[at]; lbImg.src = `media/data-rescue/dr-${b.dataset.n}.jpg`; lbImg.alt = b.dataset.cap;
  lbCap.textContent = `${b.dataset.cap}  ·  ${at + 1} / ${photos.length}`;
}
photos.forEach((b, i) => b.addEventListener("click", () => { show(i); lb.showModal ? lb.showModal() : lb.setAttribute("open", ""); }));
document.getElementById("lbClose").addEventListener("click", () => lb.close());
document.getElementById("lbPrev").addEventListener("click", () => show(at - 1));
document.getElementById("lbNext").addEventListener("click", () => show(at + 1));
lb.addEventListener("click", e => { if (e.target === lb) lb.close(); });
lb.addEventListener("keydown", e => { if (e.key === "ArrowRight") show(at + 1); if (e.key === "ArrowLeft") show(at - 1); });
let tx = null;
lb.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive:true});
lb.addEventListener("touchend", e => { if (tx == null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 40) show(at + (d < 0 ? 1 : -1)); tx = null; });

/* ---- database album: only shown once Supabase is configured and has entries ---- */
async function loadGallery(){
  if (!window.DSSS_SUPABASE_URL || window.DSSS_SUPABASE_URL.startsWith("YOUR_") || !window.supabase) return;
  try{
    const sb = window.supabase.createClient(window.DSSS_SUPABASE_URL, window.DSSS_SUPABASE_ANON_KEY);
    const {data, error} = await sb.from("gallery").select("*").order("created_at", {ascending:false});
    if (error) throw error;
    if (!data?.length) return;
    grid.innerHTML = data.map(x => `<article class="gallery-card"><img src="${esc(x.image_url)}" alt="${esc(x.title)}" loading="lazy"><div><h3>${esc(x.title)}</h3>${x.description ? `<p>${esc(x.description)}</p>` : ""}${x.event_name ? `<p>${esc(x.event_name)}</p>` : ""}</div></article>`).join("");
    dbAlbum.hidden = false;
  }catch(e){ console.error(e); }
}
loadGallery();
