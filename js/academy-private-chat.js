/* Haroon Academy private chat. Text is online; homework files remain on this device. */
(function(){
'use strict';
const cfg=window.SUPABASE_CONFIG||{};
const db=window.supabase?.createClient(cfg.url,cfg.anonKey);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role=document.body.dataset.chatRole;
let me=null, contacts=[], current=null, channel=null, refreshTimer=null;
const localDbName='haroon-academy-homework-local-v1';
function notice(msg,bad=false){const n=$('chatNotice');n.textContent=msg;n.className='notice '+(bad?'bad':'');}
function openLocalDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(localDbName,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function saveLocalFile(file){
 const id=crypto.randomUUID(), type=file.type||'application/octet-stream';
 let nativeUri=null, storedName=id+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
 const FS=window.Capacitor?.Plugins?.Filesystem;
 if(window.Capacitor?.isNativePlatform?.()&&FS){
   const data=await fileToBase64(file);
   await FS.writeFile({path:'AcademyHomework/'+storedName,data,directory:'DOCUMENTS',recursive:true});
   const uri=await FS.getUri({path:'AcademyHomework/'+storedName,directory:'DOCUMENTS'});
   nativeUri=uri.uri;
 }
 const item={id,name:file.name,type,size:file.size,createdAt:new Date().toISOString(),blob:file,nativeUri,nativePath:nativeUri?'AcademyHomework/'+storedName:null};
 const dbx=await openLocalDB();
 return new Promise((resolve,reject)=>{const tx=dbx.transaction('files','readwrite');tx.objectStore('files').put(item);tx.oncomplete=()=>resolve(item);tx.onerror=()=>reject(tx.error);});
}
async function listLocalFiles(){const dbx=await openLocalDB();return new Promise((resolve,reject)=>{const tx=dbx.transaction('files','readonly');const r=tx.objectStore('files').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));r.onerror=()=>reject(r.error);});}
async function deleteLocalFile(id){
 const all=await listLocalFiles(), item=all.find(x=>x.id===id);
 const FS=window.Capacitor?.Plugins?.Filesystem;
 if(item?.nativePath&&FS)try{await FS.deleteFile({path:item.nativePath,directory:'DOCUMENTS'});}catch(e){}
 const dbx=await openLocalDB();return new Promise((resolve,reject)=>{const tx=dbx.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
}
async function shareLocalFile(item){
  const file=new File([item.blob],item.name,{type:item.type});
  try{
    if(window.Capacitor?.isNativePlatform?.()){
      const FS=window.Capacitor?.Plugins?.Filesystem, Share=window.Capacitor?.Plugins?.Share;
      if(FS&&Share&&item.nativeUri){
        await Share.share({title:'Share Homework',text:'Homework for Haroon Ibn Rasheed Online Quran Academy',files:[item.nativeUri]});
        return;
      }
    }
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Share Homework'});return;}
    notice('Your browser does not support file sharing. Open the saved file and attach it manually in WhatsApp.',true);
  }catch(e){notice(e.message||'Could not open the share sheet.',true);}
}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});}
async function renderLocalFiles(){
 const host=$('localFiles');if(!host)return;
 try{const files=await listLocalFiles();host.innerHTML=files.length?files.map(f=>`<div class="file-row"><div class="file-icon">📎</div><div class="file-meta"><b>${esc(f.name)}</b><small>${(f.size/1024/1024).toFixed(2)} MB · ${new Date(f.createdAt).toLocaleString()}</small></div><button data-share="${f.id}" class="small-btn">Share</button><button data-delete="${f.id}" class="small-btn danger">Delete</button></div>`).join(''):'<p class="muted">No homework files saved on this device yet.</p>';
 host.querySelectorAll('[data-share]').forEach(b=>b.onclick=async()=>{const f=files.find(x=>x.id===b.dataset.share);if(f)await shareLocalFile(f);});
 host.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this file from this device?')){await deleteLocalFile(b.dataset.delete);await renderLocalFiles();}});
 }catch(e){host.textContent='Local file storage is unavailable in this browser.';}
}
async function loadContacts(){
 const r=await db.rpc('academy_private_contacts');if(r.error)throw r.error;
 contacts=r.data||[];
 const host=$('contactList');
 host.innerHTML=contacts.length?contacts.map(c=>`<button class="contact ${current?.user_id===c.user_id?'active':''}" data-user="${c.user_id}"><span class="avatar">${esc((c.display_name||'?').slice(0,1).toUpperCase())}</span><span class="contact-info"><b>${esc(c.display_name)}</b><small>${esc(c.user_role)}</small></span><span class="chev">›</span></button>`).join(''):'<p class="muted">No eligible contacts found. Ask Admin to confirm your account and teacher assignment.</p>';
 host.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>openContact(b.dataset.user));
}
async function openContact(uid){
 const c=contacts.find(x=>x.user_id===uid);if(!c)return;
 current=c;$('chatTitle').textContent=c.display_name;$('chatSubtitle').textContent=c.user_role==='teacher'?'Your assigned teacher':c.user_role==='admin'?'Academy Admin':'Assigned student';
 $('messageInput').disabled=false;$('sendButton').disabled=false;
 const r=await db.rpc('academy_open_private_conversation',{p_other_user:uid});
 if(r.error){notice(r.error.message,true);return;}
 if(channel){await db.removeChannel(channel);channel=null;}
 current.conversation_id=r.data;
 await loadMessages();
 channel=db.channel('academy-private-'+r.data).on('postgres_changes',{event:'*',schema:'public',table:'academy_private_messages',filter:'conversation_id=eq.'+r.data},()=>loadMessages()).subscribe();
 await db.rpc('academy_mark_private_read',{p_conversation:r.data});
 await loadContacts();
}
async function loadMessages(){
 if(!current?.conversation_id)return;
 const r=await db.from('academy_private_messages').select('id,sender_id,body,created_at,read_at').eq('conversation_id',current.conversation_id).order('created_at',{ascending:true}).limit(300);
 if(r.error){notice(r.error.message,true);return;}
 const host=$('messageList');
 host.innerHTML=(r.data||[]).map(m=>`<div class="bubble ${m.sender_id===me.id?'mine':'theirs'}"><div>${esc(m.body).replace(/\n/g,'<br>')}</div><small>${new Date(m.created_at).toLocaleString()}${m.sender_id===me.id?(m.read_at?' · Read':' · Sent'):''}</small></div>`).join('')||'<div class="empty-chat">No messages yet. Send the first message.</div>';
 host.scrollTop=host.scrollHeight;
 await db.rpc('academy_mark_private_read',{p_conversation:current.conversation_id});
}
async function sendMessage(){
 const body=$('messageInput').value.trim();if(!body||!current?.conversation_id)return;
 $('sendButton').disabled=true;
 const r=await db.from('academy_private_messages').insert({conversation_id:current.conversation_id,sender_id:me.id,body});
 $('sendButton').disabled=false;
 if(r.error){notice(r.error.message,true);return;}
 $('messageInput').value='';await loadMessages();
}
async function init(){
 if(!db){notice('Supabase configuration could not be loaded.',true);return;}
 const s=await db.auth.getSession();me=s.data?.session?.user;
 if(!me){location.href=role==='admin'?'../login.html':'../portal-login.html';return;}
 const p=await db.from('profiles').select('role,full_name').eq('id',me.id).single();
 if(p.error||p.data?.role!==role){notice('This page is not available for your account role.',true);return;}
 $('signedInAs').textContent=p.data.full_name||me.email||'Account';
 $('sendButton').onclick=sendMessage;
 $('messageForm').onsubmit=e=>{e.preventDefault();sendMessage();};
 $('messageInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}};
 if(role==='student'||role==='teacher'){
  $('homeworkPanel').hidden=false;
  if(role==='teacher') $('homeworkPanel').querySelector('h2').textContent='📎 Teaching files on this device';
  $('homeworkInput').onchange=async e=>{const files=[...e.target.files];for(const f of files){if(f.size>25*1024*1024){notice(f.name+' is larger than 25 MB and was skipped.',true);continue;}await saveLocalFile(f);}e.target.value='';await renderLocalFiles();notice('Homework saved on this device only. Use Share to send it through WhatsApp or another app.');};
  await renderLocalFiles();
 }
 try{await loadContacts();}catch(e){notice(e.message||'Could not load contacts. Run the supplied SQL in Supabase first.',true);}
 refreshTimer=setInterval(()=>{if(current)loadMessages();},8000);
}
window.addEventListener('beforeunload',()=>{if(channel)db.removeChannel(channel);if(refreshTimer)clearInterval(refreshTimer);});
init();
})();