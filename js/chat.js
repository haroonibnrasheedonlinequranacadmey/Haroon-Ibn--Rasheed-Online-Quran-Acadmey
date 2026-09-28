
(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  const ready=window.supabase && cfg.url && cfg.anonKey && !cfg.url.includes('YOUR-PROJECT');
  const fab=document.getElementById('academyChatFab'), panel=document.getElementById('academyChatPanel');
  if(!fab||!panel) return;
  const client=ready?window.supabase.createClient(cfg.url,cfg.anonKey):null;
  let thread=localStorage.getItem('academy_chat_thread')||'';
  let token=localStorage.getItem('academy_chat_token')||'';
  const $=id=>document.getElementById(id);
  fab.addEventListener('click',()=>{panel.classList.toggle('open');panel.setAttribute('aria-hidden',String(!panel.classList.contains('open')));if(panel.classList.contains('open')) loadReplies();});
  window.closeAcademyChat=()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')};
  function status(t,err=false){$('chatStatus').textContent=t;$('chatStatus').style.color=err?'#b42318':'#0b7187'}
  function render(rows){$('academyChatMessages').innerHTML=(rows||[]).map(x=>`<div class="chat-bubble ${x.sender_type==='admin'?'admin':''}">${escapeHtml(x.body)}</div>`).join('')||'<div class="muted">Start a conversation with the academy.</div>'}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  async function loadReplies(){
    if(!client||!thread||!token) return;
    const {data,error}=await client.rpc('get_public_messages',{p_thread_id:thread,p_token:token});
    if(!error) render(data);
  }
  $('academyChatForm').addEventListener('submit',async e=>{
    e.preventDefault();
    if(!client){status('Please configure Supabase first.',true);return}
    const payload={p_name:$('chatName').value.trim(),p_email:$('chatEmail').value.trim()||null,p_subject:$('chatSubject').value.trim()||'General Inquiry',p_message:$('chatBody').value.trim()};
    if(!payload.p_message)return;
    status('Sending...');
    let result;
    if(!thread||!token) result=await client.rpc('create_public_conversation',payload);
    else result=await client.rpc('add_public_message',{p_thread_id:thread,p_token:token,p_message:payload.p_message});
    if(result.error){status(result.error.message,true);return}
    if(result.data?.id){thread=result.data.id;token=result.data.token;localStorage.setItem('academy_chat_thread',thread);localStorage.setItem('academy_chat_token',token)}
    $('chatBody').value='';status('Message sent. You can return here to see the admin reply.');await loadReplies();
  });
})();
