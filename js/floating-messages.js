(function(){
  'use strict';
  if(window.__HR_FLOATING_MESSAGES__) return;
  window.__HR_FLOATING_MESSAGES__=true;

  const script=document.currentScript;
  const assetUrl=new URL('../assets/message-helper.png',script.src).href;
  const cssUrl=new URL('../css/floating-messages.css',script.src).href;
  if(!document.querySelector('link[data-hr-floating-css]')){
    const link=document.createElement('link'); link.rel='stylesheet'; link.href=cssUrl; link.dataset.hrFloatingCss='1'; document.head.appendChild(link);
  }

  function boot(){
    if(!window.supabase || !window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) return;
    let db;
    try{ db=window.supabase.createClient(window.SUPABASE_CONFIG.url,window.SUPABASE_CONFIG.anonKey); }catch(e){ return; }

    const fab=document.createElement('button');
    fab.className='hr-message-fab'; fab.type='button'; fab.title='Messages'; fab.setAttribute('aria-label','Open messages');
    fab.innerHTML='<img alt="Academy message assistant" src="'+assetUrl+'"><span class="hr-message-badge">0</span><span class="hr-message-dot"></span>';

    const modal=document.createElement('section'); modal.className='hr-message-modal';
    modal.innerHTML='<div class="hr-message-head"><div><strong>Academy Messages</strong><small>Admin / Teacher notifications</small></div><button class="hr-message-close" type="button" aria-label="Close">×</button></div><div class="hr-message-list"><div class="hr-message-empty">Loading messages…</div></div><div class="hr-message-foot">Click the floating assistant anytime to view your messages.</div>';
    document.body.appendChild(fab); document.body.appendChild(modal);

    const badge=fab.querySelector('.hr-message-badge'), list=modal.querySelector('.hr-message-list');
    let uid=null,lastUnread=null,dragging=false,moved=false,startX=0,startY=0,origX=0,origY=0,settings={admin_message_sound:'true',admin_auto_open_messages:'false',notification_sound_volume:'80'};

    function setBadge(n){badge.textContent=String(n);badge.style.display=n>0?'block':'none'}
    function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
    function time(v){try{return new Date(v).toLocaleString()}catch{return ''}}
    function sound(){
      if(String(settings.admin_message_sound)==='false')return;
      try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(740,c.currentTime);o.frequency.exponentialRampToValueAtTime(1040,c.currentTime+.16);g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(Math.max(.03,Math.min(.45,(Number(settings.notification_sound_volume)||80)/100*.22)),c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.42);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.43)}catch(e){}
    }
    async function loadSettings(){try{const r=await db.from('site_settings').select('setting_key,setting_value').in('setting_key',['admin_message_sound','admin_auto_open_messages','notification_sound_volume']);if(!r.error)(r.data||[]).forEach(x=>settings[x.setting_key]=x.setting_value);}catch(e){}}
    async function session(){try{const r=await db.auth.getSession();return r.data?.session||null}catch(e){return null}}
    async function load(open){
      const s=await session(); if(!s){fab.style.display='none';modal.classList.remove('open');return}
      uid=s.user.id; fab.style.display='block';
      const r=await db.from('notifications').select('id,title,body,read_at,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(50);
      if(r.error){list.innerHTML='<div class="hr-message-empty">Messages are unavailable right now.</div>';return}
      const rows=r.data||[], unread=rows.filter(x=>!x.read_at).length;
      if(lastUnread!==null && unread>lastUnread){sound();if(String(settings.admin_auto_open_messages)==='true')modal.classList.add('open');}
      lastUnread=unread; setBadge(unread);
      list.innerHTML=rows.length?rows.map(n=>'<article class="hr-message-item"><h4>'+esc(n.title||'Message from Admin')+'</h4><p>'+esc(n.body||'')+'</p><time>'+esc(time(n.created_at))+(n.read_at?'':' · Unread')+'</time></article>').join(''):'<div class="hr-message-empty">No messages yet.</div>';
      if(open){modal.classList.add('open'); if(unread){await db.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',uid).is('read_at',null); setBadge(0); lastUnread=0; list.querySelectorAll('time').forEach(t=>t.textContent=t.textContent.replace(' · Unread','')); }}
    }
    fab.addEventListener('click',e=>{if(moved){moved=false;return}load(true)});
    modal.querySelector('.hr-message-close').addEventListener('click',()=>modal.classList.remove('open'));

    // Mouse + touch dragging. The widget stays inside the viewport.
    function point(e){return e.touches?e.touches[0]:e}
    function down(e){dragging=true;moved=false;const p=point(e);startX=p.clientX;startY=p.clientY;const r=fab.getBoundingClientRect();origX=r.left;origY=r.top;fab.classList.add('dragging');if(e.cancelable)e.preventDefault()}
    function move(e){if(!dragging)return;const p=point(e),dx=p.clientX-startX,dy=p.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;let x=origX+dx,y=origY+dy;x=Math.max(5,Math.min(window.innerWidth-fab.offsetWidth-5,x));y=Math.max(5,Math.min(window.innerHeight-fab.offsetHeight-5,y));fab.style.left=x+'px';fab.style.top=y+'px';fab.style.right='auto';fab.style.bottom='auto';if(e.cancelable)e.preventDefault()}
    function up(){if(!dragging)return;dragging=false;fab.classList.remove('dragging')}
    fab.addEventListener('mousedown',down);window.addEventListener('mousemove',move,{passive:false});window.addEventListener('mouseup',up);
    fab.addEventListener('touchstart',down,{passive:false});window.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',up);

    loadSettings().then(()=>{load(false);setInterval(()=>load(false),15000);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
