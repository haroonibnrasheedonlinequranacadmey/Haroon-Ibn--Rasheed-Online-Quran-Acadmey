(function(){
 const cfg=window.SUPABASE_CONFIG||{};
 const ready=window.supabase && cfg.url && !cfg.url.includes('YOUR-PROJECT') && cfg.anonKey && !cfg.anonKey.includes('YOUR_');
 if(!ready){window.db=null;return;}
 const db=window.supabase.createClient(cfg.url,cfg.anonKey); window.db=db;
 window.escapeHtml=function(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));};
 window.showMsg=function(id,text,type='ok'){const e=document.getElementById(id);if(!e)return;e.textContent=text;e.className='msg show '+type;};
 window.logout=async function(){await db.auth.signOut();location.href='login.html';};
 async function guard(){const {data:{session}}=await db.auth.getSession();if(!session){location.href='login.html';return null;}const {data:p,error}=await db.from('profiles').select('role,full_name').eq('id',session.user.id).single();if(error||!p||p.role!=='admin'){await db.auth.signOut();location.href='login.html';return null;}document.querySelectorAll('[data-admin-name]').forEach(e=>e.textContent=p.full_name||session.user.email);return {session,p};}
 window.adminGuard=guard;
})();
