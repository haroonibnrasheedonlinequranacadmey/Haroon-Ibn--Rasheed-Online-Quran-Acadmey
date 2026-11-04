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

 function enhanceAdminShell(){
   if(document.body.classList.contains('login-page')) return;
   if(document.querySelector('.admin-topbar')) return;
   const bar=document.createElement('header');
   bar.className='admin-topbar';
   bar.innerHTML=`<a class="admin-brand" href="dashboard.html"><img src="../assets/hr-logo-round.png" alt="Haroon Ibn Rasheed Online Quran Academy"><span><strong>Haroon Ibn Rasheed</strong><small>Online Quran Academy • Admin</small></span></a><div class="admin-top-actions"><a href="dashboard.html">⌂ Dashboard</a><a href="../index.html" target="_blank" rel="noopener">🌐 Website</a><button type="button" onclick="logout()" class="logout">↪ Logout</button></div>`;
   document.body.prepend(bar);
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhanceAdminShell); else enhanceAdminShell();
})();

/* Floating messages: Admin only; loader does not modify Student/Public pages. */
(function(){if(!document.querySelector('script[data-floating-messages]')){const s=document.createElement('script');s.src='../js/floating-messages.js';s.dataset.floatingMessages='1';document.head.appendChild(s)}})();
