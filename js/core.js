
(function(){
 const cfg=window.SUPABASE_CONFIG||{};
 if(!window.supabase||!cfg.url||!cfg.anonKey){console.error('Supabase config missing');return}
 window.db=window.supabase.createClient(cfg.url,cfg.anonKey);
 window.$=s=>document.querySelector(s);
 window.esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
 window.msg=(t,type='ok')=>{let e=$('#msg');if(e){e.hidden=false;e.className='msg '+type;e.textContent=t;setTimeout(()=>e.hidden=true,5000)}};
 window.logout=async()=>{await db.auth.signOut();location.href='../admin/login.html'};
 window.sessionUser=async()=>{let r=await db.auth.getSession();return r.data.session?.user||null};
 window.requireRole=async role=>{
   const u=await sessionUser();
   if(!u){location.href='../admin/login.html';return null}
   const r=await db.from('profiles').select('*').eq('id',u.id).single();
   if(r.error||!r.data||r.data.role!==role){location.href='../admin/login.html';return null}
   return {user:u,profile:r.data};
 };
})();
