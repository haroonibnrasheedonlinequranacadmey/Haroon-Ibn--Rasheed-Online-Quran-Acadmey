(function(){
  'use strict';
  if(!window.supabase || !window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) return;
  const db=window.supabase.createClient(window.SUPABASE_CONFIG.url,window.SUPABASE_CONFIG.anonKey);
  window.ACADEMY_SETTINGS=window.ACADEMY_SETTINGS||{};
  let applied=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bool=(v,def=true)=>v===undefined?def:String(v).toLowerCase()==='true';
  const rootPrefix=()=>location.pathname.includes('/admin/')||location.pathname.includes('/teacher/')||location.pathname.includes('/student/')?'../':'';
  const urlFor=v=>{if(!v)return ''; if(/^https?:\/\//i.test(v)||v.startsWith('/'))return v; return rootPrefix()+String(v).replace(/^\.\//,'');};
  function hide(el){if(el)el.style.display='none';}
  function show(el){if(el)el.style.display='';}
  function textMatch(el,terms){const t=(el.textContent||'').trim().toLowerCase();return terms.some(x=>t.includes(x));}
  function apply(s){
    window.ACADEMY_SETTINGS=s||{};
    const name=s.academy_name||'Haroon Ibn Rasheed Online Quran Academy';
    document.querySelectorAll('[data-academy-name]').forEach(e=>e.textContent=name);
    document.querySelectorAll('[data-academy-email]').forEach(e=>e.textContent=s.email||'');
    document.querySelectorAll('[data-academy-phone]').forEach(e=>e.textContent=s.phone||s.whatsapp_number||'');
    if(s.website_title) document.title=s.website_title;
    document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').forEach(m=>{if(s.website_description)m.setAttribute('content',s.website_description)});
    if(s.logo_url){document.querySelectorAll('img[src*="hr-logo"],img[data-academy-logo]').forEach(i=>i.src=urlFor(s.logo_url));document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(i=>i.href=urlFor(s.favicon_url||s.logo_url));}
    const phone=String(s.whatsapp_number||'').replace(/\D/g,'');
    const waEnabled = location.pathname.includes('/student/')?bool(s.student_whatsapp_enabled):location.pathname.includes('/teacher/')?bool(s.teacher_whatsapp_enabled):bool(s.whatsapp_enabled);
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{if(!waEnabled){hide(a);return;} if(phone){a.href='https://wa.me/'+phone+(s.whatsapp_message?'?text='+encodeURIComponent(s.whatsapp_message):'');show(a);}});
    const old=document.querySelector('[data-academy-settings-whatsapp]');
    if(old) old.remove();
    if(waEnabled && bool(s.floating_whatsapp_enabled) && phone && !location.pathname.includes('/admin/')){
      const a=document.createElement('a');a.dataset.academySettingsWhatsapp='1';a.href='https://wa.me/'+phone+(s.whatsapp_message?'?text='+encodeURIComponent(s.whatsapp_message):'');a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','WhatsApp');a.title='WhatsApp: '+(s.phone||s.whatsapp_number);a.textContent='';
      a.innerHTML='<span style="font-size:29px;line-height:1">◔</span>';Object.assign(a.style,{position:'fixed',right:'18px',bottom:'18px',width:'58px',height:'58px',borderRadius:'50%',background:'#25D366',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',zIndex:'99999',boxShadow:'0 8px 25px rgba(0,0,0,.25)',textDecoration:'none',animation:'hrWhatsappPulse 1.8s infinite'});
      const st=document.createElement('style');st.textContent='@keyframes hrWhatsappPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}';document.head.appendChild(st);document.body.appendChild(a);
    }
    const social={facebook:s.facebook_url,instagram:s.instagram_url,youtube:s.youtube_url,tiktok:s.tiktok_url};
    Object.keys(social).forEach(k=>{document.querySelectorAll('a[href*="'+k+'"],a[aria-label*="'+k+'" i],a[title*="'+k+'" i]').forEach(a=>{if(social[k])a.href=social[k];if(!bool(s.social_icons_enabled))hide(a);});});
    if(!bool(s.social_icons_enabled)) document.querySelectorAll('[data-social-icons]').forEach(hide);
    document.querySelectorAll('footer,[data-footer]').forEach(f=>{if(location.pathname.includes('/student/')||location.pathname.includes('/teacher/')){const k=location.pathname.includes('/student/')?'student_footer_enabled':'teacher_footer_enabled';if(!bool(s[k]))hide(f);}else if(s.footer_enabled==='false')hide(f);});
    if(s.footer_text) document.querySelectorAll('[data-academy-footer]').forEach(e=>e.textContent=s.footer_text);
    const navRules={
      student:{student_schedule_enabled:['schedule.html'],student_attendance_enabled:['attendance.html'],student_fees_enabled:['fees.html'],student_lessons_enabled:['course.html','classes.html'],student_profile_edit:['profile.html'],student_messages_enabled:['teacher.html'],student_panel_enabled:[]},
      teacher:{teacher_students_enabled:['students.html'],teacher_class_enabled:['classes.html'],teacher_lessons_enabled:['courses.html'],teacher_schedule_enabled:['schedule.html'],teacher_attendance_enabled:['attendance.html'],teacher_leaves_enabled:['leaves.html'],teacher_salary_enabled:['salary.html'],teacher_profile_edit:['profile.html'],teacher_messages_enabled:['messages.html'],teacher_panel_enabled:[]},
      admin:{admin_panel_enabled:[]}
    };
    const section=location.pathname.includes('/student/')?'student':location.pathname.includes('/teacher/')?'teacher':location.pathname.includes('/admin/')?'admin':null;
    if(section){
      if(section==='admin' && !bool(s.admin_dashboard_stats)) document.querySelectorAll('[data-admin-stats]').forEach(hide);
      const panelKey=section+'_panel_enabled';
      if(!bool(s[panelKey]) && !location.pathname.endsWith('/settings.html') && !location.pathname.endsWith('/login.html')){location.href=section==='admin'?'login.html':'../portal-login.html';return;}
      const rules=navRules[section];Object.entries(rules).forEach(([key,files])=>{if(bool(s[key]))return;document.querySelectorAll('a[href]').forEach(a=>{const h=a.getAttribute('href')||'';if(files.some(f=>h.endsWith('/'+f)||h===f))hide(a);});});
      if(section==='student' && !bool(s.student_profile_edit)) document.querySelectorAll('a[href$="profile.html"]').forEach(hide);
      if(section==='teacher' && !bool(s.teacher_profile_edit)) document.querySelectorAll('a[href$="profile.html"]').forEach(hide);
      if(section==='teacher' && !bool(s.teacher_messages_enabled)) document.querySelectorAll('#teacherMessageFab,[href*="messages.html"],.teacher-message-fab').forEach(hide);
    }
    if(!bool(s.student_registration_enabled) && /register\.html$/i.test(location.pathname)){document.querySelectorAll('#register,form[action*="register"],#main-content form').forEach(hide);const m=document.getElementById('msg');if(m)m.textContent='Student registration is currently disabled by Academy Admin.';}
    if(!bool(s.free_trial_enabled) && !location.pathname.includes('/admin/')) document.querySelectorAll('a,button').forEach(e=>{if(textMatch(e,['free trial','start free trial']))hide(e);});
    if(s.maintenance_mode==='true' && !location.pathname.includes('/admin/') && !location.pathname.includes('/teacher/') && !location.pathname.includes('/student/') && !/portal-login|register/i.test(location.pathname)){
      if(!document.getElementById('academyMaintenanceOverlay')){const o=document.createElement('div');o.id='academyMaintenanceOverlay';o.innerHTML='<div><h2>'+esc(name)+'</h2><p>'+esc(s.maintenance_message||'Website is temporarily under maintenance. Please check back soon.')+'</p></div>';Object.assign(o.style,{position:'fixed',inset:'0',zIndex:'100000',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'25px'});o.firstElementChild.style.cssText='max-width:620px;font-family:Arial,sans-serif';document.body.appendChild(o);}
    }
    if(s.primary_color)document.documentElement.style.setProperty('--academy-primary',s.primary_color);if(s.secondary_color)document.documentElement.style.setProperty('--academy-secondary',s.secondary_color);
    if(s.theme_mode==='dark')document.documentElement.dataset.academyTheme='dark';
    applied=true;
    window.dispatchEvent(new CustomEvent('academy-settings-ready',{detail:s}));
  }
  async function load(){try{const r=await db.from('site_settings').select('setting_key,setting_value');if(!r.error)apply((r.data||[]).reduce((o,x)=>(o[x.setting_key]=x.setting_value,o),{}));}catch(e){console.warn('Academy settings unavailable',e)}}
  window.academySettingsReady=()=>applied?Promise.resolve(window.ACADEMY_SETTINGS):new Promise(resolve=>window.addEventListener('academy-settings-ready',()=>resolve(window.ACADEMY_SETTINGS),{once:true}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
