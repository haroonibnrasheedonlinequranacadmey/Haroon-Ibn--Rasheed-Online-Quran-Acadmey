
(function(){
 const cfg=window.SUPABASE_CONFIG||{}, box=document.getElementById('paymentMethodsPublic');
 if(!box||!window.supabase||!cfg.url||!cfg.anonKey)return;
 const db=window.supabase.createClient(cfg.url,cfg.anonKey);
 db.from('payment_methods').select('*').eq('enabled',true).order('sort_order',{ascending:true}).then(({data,error})=>{
   if(error){box.textContent='Payment options are available on request.';return}
   box.innerHTML=(data||[]).map(p=>`<div style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);padding:12px;border-radius:10px;margin:8px 0"><strong>${esc(p.name)}</strong><br><span>${esc(p.account_name||'')}</span>${p.account_number?`<br><span>${esc(p.account_number)}</span>`:''}${p.instructions?`<br><small>${esc(p.instructions)}</small>`:''}</div>`).join('')||'Payment options will be published here by the academy.';
 });
 function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
})();
