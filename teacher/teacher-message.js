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
  const close=()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')};
  fab.addEventListener('click',()=>{panel.classList.toggle('open');panel.setAttribute('aria-hidden',String(!panel.classList.contains('open')))});
  document.getElementById('teacherMessageClose')?.addEventListener('click',close);
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const message=body.value.trim(); if(!message)return;
    status.textContent='Sending...';
    const u=await db.auth.getUser();
    const user=u.data?.user;
    if(!user){status.textContent='Please login again.';return;}
    const p=await db.from('profiles').select('full_name').eq('id',user.id).single();
    const name=p.data?.full_name||user.email||'Teacher';
    const thread=localStorage.getItem('teacher_message_thread')||'';
    let result;
    if(thread){
      result=await db.rpc('add_teacher_message',{p_thread_id:thread,p_message:message});
      if(result.error||result.data!==true){localStorage.removeItem('teacher_message_thread');result=null;}
    }
    if(!result) result=await db.rpc('create_teacher_conversation',{p_name:name,p_email:user.email||null,p_subject:subject.value.trim()||'Teacher Message',p_message:message});
    if(result.error){status.textContent=result.error.message;return;}
    if(result.data?.id)localStorage.setItem('teacher_message_thread',result.data.id);
    body.value=''; status.textContent='Message sent to admin.';
  });
})();
