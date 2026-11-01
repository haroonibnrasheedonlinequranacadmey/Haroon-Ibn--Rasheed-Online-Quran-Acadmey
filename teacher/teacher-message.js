(()=>{
  'use strict';
  const cfg=window.SUPABASE_CONFIG||{};
  const db=window.supabase?.createClient?.(cfg.url,cfg.anonKey);
  const fab=document.getElementById('teacherMessageFab');
  const panel=document.getElementById('teacherMessagePanel');
  const form=document.getElementById('teacherMessageForm');
  if(!fab||!panel||!form||!db)return;
  const subject=document.getElementById('teacherMessageSubject');
  const body=document.getElementById('teacherMessageBody');
  const status=document.getElementById('teacherMessageStatus');
  let audioCtx=null, lastAdminId=null, initialized=false;
  const close=()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')};
  const sound=()=>{try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=880;g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.16,audioCtx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.45);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.46);}catch(e){}}
  document.addEventListener('click',()=>{try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume();}catch(e){}},{once:true});
  fab.addEventListener('click',()=>{try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();}catch(e){} panel.classList.toggle('open');panel.setAttribute('aria-hidden',String(!panel.classList.contains('open')))});
  document.getElementById('teacherMessageClose')?.addEventListener('click',close);
  async function getThread(){return localStorage.getItem('teacher_message_thread')||'';}
  async function poll(){
    const thread=await getThread(); if(!thread)return;
    const r=await db.rpc('get_teacher_messages',{p_thread_id:thread}); if(r.error||!Array.isArray(r.data))return;
    const admins=r.data.filter(x=>String(x.sender_type||'').toLowerCase()==='admin');
    const latest=admins[admins.length-1];
    if(latest && initialized && latest.id!==lastAdminId){ sound(); status.textContent='New message from Admin.'; status.style.color='#15803d'; fab.classList.add('has-new'); setTimeout(()=>fab.classList.remove('has-new'),5000); }
    if(latest) lastAdminId=latest.id;
    initialized=true;
    const replies=admins.slice(-3).map(x=>`<div style="margin:7px 0;padding:8px 10px;border-radius:10px;background:#eef8ff"><strong>Admin</strong><br>${String(x.body||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</div>`).join('');
    let box=document.getElementById('teacherAdminReplies'); if(!box){box=document.createElement('div');box.id='teacherAdminReplies';box.style.marginTop='10px';form.appendChild(box);} box.innerHTML=replies;
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault(); const message=body.value.trim(); if(!message)return; status.textContent='Sending...';
    const u=await db.auth.getUser(); const user=u.data?.user; if(!user){status.textContent='Please login again.';return;}
    const p=await db.from('profiles').select('full_name').eq('id',user.id).maybeSingle(); const name=p.data?.full_name||user.user_metadata?.full_name||user.email||'Teacher';
    const thread=await getThread(); let result=null;
    if(thread){result=await db.rpc('add_teacher_message',{p_thread_id:thread,p_message:message}); if(result.error||result.data!==true){localStorage.removeItem('teacher_message_thread');result=null;}}
    if(!result) result=await db.rpc('create_teacher_conversation',{p_name:name,p_email:user.email||null,p_subject:subject.value.trim()||'Teacher Message',p_message:message});
    if(result.error){status.textContent=result.error.message;status.style.color='#b91c1c';return;}
    if(result.data?.id)localStorage.setItem('teacher_message_thread',result.data.id); body.value=''; status.textContent='Message sent to admin.'; status.style.color='#15803d'; poll();
  });
  poll(); setInterval(poll,10000);
})();