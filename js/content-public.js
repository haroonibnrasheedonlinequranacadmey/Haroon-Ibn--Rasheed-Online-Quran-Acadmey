
(function(){
 const cfg=window.SUPABASE_CONFIG||{};
 if(!window.supabase||!cfg.url||!cfg.anonKey)return;
 const db=window.supabase.createClient(cfg.url,cfg.anonKey);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const a=document.getElementById('articlesPublic'),t=document.getElementById('testimonialsPublic');
 if(a)db.from('articles').select('*').eq('published',true).order('created_at',{ascending:false}).then(({data})=>{
   if(!data?.length){a.innerHTML='<div class="card"><div class="card-body"><h3>Articles coming soon</h3><p>The academy will publish useful Quran learning articles here.</p></div></div>';return}
   a.innerHTML=data.map(x=>`<article class="card">${x.image_url?`<img src="${esc(x.image_url)}" alt="">`:''}<div class="card-body"><h3>${esc(x.title)}</h3><p>${esc(x.excerpt||x.body||'')}</p></div></article>`).join('');
 });
 if(t)db.from('testimonials').select('*').eq('active',true).order('created_at',{ascending:false}).then(({data})=>{
   if(!data?.length){t.innerHTML='<div class="card"><div class="card-body"><h3>Reviews coming soon</h3><p>Student and family reviews will appear here.</p></div></div>';return}
   t.innerHTML=data.map(x=>`<article class="card"><div class="card-body"><h3>${'★'.repeat(Number(x.rating||5))}</h3><p>${esc(x.review)}</p><strong>${esc(x.student_name)}</strong></div></article>`).join('');
 });
})();
