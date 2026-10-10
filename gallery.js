
const grid=document.getElementById("galleryGrid");
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
async function loadGallery(){
 if(!window.DSSS_SUPABASE_URL||window.DSSS_SUPABASE_URL.startsWith("YOUR_")){
  grid.innerHTML='<div class="empty">Supabase configuration is not connected yet.</div>';return;
 }
 try{
  const sb=window.supabase.createClient(window.DSSS_SUPABASE_URL,window.DSSS_SUPABASE_ANON_KEY);
  const {data,error}=await sb.from("gallery").select("*").order("created_at",{ascending:false});
  if(error)throw error;
  if(!data?.length){grid.innerHTML='<div class="empty">No gallery entries published yet.</div>';return;}
  grid.innerHTML=data.map(x=>`<article class="gallery-card"><img src="${esc(x.image_url)}" alt="${esc(x.title)}" loading="lazy"><div><h3>${esc(x.title)}</h3>${x.description?`<p>${esc(x.description)}</p>`:""}${x.event_name?`<p>${esc(x.event_name)}</p>`:""}</div></article>`).join("");
 }catch(e){grid.innerHTML='<div class="empty">Gallery could not be loaded right now.</div>';console.error(e)}
}
loadGallery();
