(function(){
  'use strict';
  const db = window.academyDB || (window.supabase && window.SUPABASE_CONFIG ? window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey) : null);
  if(!db) return;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmtDate = v => { if(!v) return '—'; const d=new Date(v); return isNaN(d)?esc(v):d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); };
  const fmtTime = v => { if(!v) return '—'; const s=String(v); const m=s.match(/^(\d{1,2}):(\d{2})/); if(!m) return esc(s); let h=+m[1], ap=h>=12?'PM':'AM'; h=h%12||12; return `${h}:${m[2]} ${ap}`; };
  const getUser = async()=>{ const r=await db.auth.getUser(); if(r.error) throw r.error; if(!r.data.user) throw new Error('Teacher login required.'); return r.data.user; };

  async function teacherContext(){
    const user=await getUser();
    let teacher=null;
    try{
      let r=await db.from('teachers').select('*').eq('id',user.id).maybeSingle();
      if(!r.error && r.data) teacher=r.data;
      if(!teacher){
        r=await db.from('teachers').select('*').eq('account_id',user.id).maybeSingle();
        if(!r.error && r.data) teacher=r.data;
      }
    }catch(e){}
    return {user, teacher, ids:[user.id, teacher?.id].filter(Boolean)};
  }

  async function studentMap(ctx){
    const map=new Map();
    const ids=ctx.ids;
    for(const tid of ids){
      const r=await db.from('students').select('id,user_id,account_id,full_name,father_name,email,phone,course,status,teacher_id,timezone').eq('teacher_id',tid);
      if(!r.error) (r.data||[]).forEach(s=>{
        [s.id,s.user_id,s.account_id].filter(Boolean).forEach(k=>map.set(String(k),s));
      });
    }
    return map;
  }

  async function schedules(ctx){
    const rows=[]; const seen=new Set();
    for(const tid of ctx.ids){
      const r=await db.from('class_schedules').select('id,teacher_id,student_id,course,class_days,class_time,duration_minutes,google_meet_url,classroom_code,active,schedule_timezone').eq('teacher_id',tid).order('class_time',{ascending:true});
      if(!r.error) (r.data||[]).forEach(x=>{ if(!seen.has(x.id)){seen.add(x.id);rows.push(x);} });
    }
    return rows;
  }

  function setHeader(ctx){
    const name=String(ctx.teacher?.full_name || ctx.teacher?.name || ctx.user.user_metadata?.full_name || ctx.user.email || 'Teacher');
    document.querySelectorAll('.teacher-profile-btn span').forEach(x=>x.textContent=name);
    document.querySelectorAll('.teacher-brand-name').forEach(x=>x.textContent=name);
    const p=document.querySelector('.teacher-profile-btn'); if(p) p.setAttribute('title',name);
  }

  async function loadStudents(){
    if(!document.getElementById('studentRows')) return;
    const rows=document.getElementById('studentRows');
    rows.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px">Loading your students…</td></tr>';
    try{
      const ctx=await teacherContext(); setHeader(ctx); const map=await studentMap(ctx); const data=Array.from(new Map(Array.from(map.values()).map(s=>[String(s.id||s.user_id||s.account_id),s])).values());
      if(!data.length){rows.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px">No students are currently assigned to you.</td></tr>';return;}
      const sch=await schedules(ctx); const counts={}; sch.forEach(x=>{if(x.student_id) counts[String(x.student_id)]=(counts[String(x.student_id)]||0)+1;});
      rows.innerHTML=data.sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||''))).map(s=>`<tr><td><strong>${esc(s.full_name||'Student')}</strong></td><td>${esc(s.father_name||'—')}</td><td>${esc(s.email||'—')}</td><td>${esc(s.phone||'—')}</td><td>${esc(s.course||'—')}</td><td><strong>${esc(s.status||'Active')}</strong></td><td>${counts[String(s.id)]||counts[String(s.user_id)]||0} class${(counts[String(s.id)]||counts[String(s.user_id)]||0)==1?'':'es'}</td></tr>`).join('');
    }catch(e){rows.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:28px;color:#991b1b">${esc(e.message||'Unable to load students.')}</td></tr>`;}
  }

  async function loadClasses(){
    if(!document.getElementById('classRows') || document.body.dataset.page!=='teacher-classes') return;
    const rows=document.getElementById('classRows'); rows.innerHTML='<tr><td colspan="8" style="text-align:center;padding:28px">Loading your classes…</td></tr>';
    try{
      const ctx=await teacherContext(); setHeader(ctx); const map=await studentMap(ctx); const sch=await schedules(ctx);
      if(!sch.length){rows.innerHTML='<tr><td colspan="8" style="text-align:center;padding:28px">No classes are assigned to you yet.</td></tr>';return;}
      const ids=sch.map(x=>x.id); let sessions=[];
      if(ids.length){ const r=await db.from('teacher_class_sessions').select('id,schedule_id,teacher_id,student_id,class_date,status,started_at,completed_at,student_joined_at,class,test,session,session_timezone').in('schedule_id',ids).order('class_date',{ascending:false}); if(!r.error) sessions=r.data||[]; }
      const sm=new Map(sessions.map(x=>[String(x.schedule_id),x]));
      rows.innerHTML=sch.map(s=>{const st=map.get(String(s.student_id));const sess=sm.get(String(s.id));const meeting=s.google_meet_url?`<a class="btn-small" href="${esc(s.google_meet_url)}" target="_blank" rel="noopener">Join Class</a>`:'—';const att=sess?.status||'Scheduled';return `<tr><td>${esc(s.class_days||'—')}</td><td>${fmtTime(s.class_time)}${s.duration_minutes?`<br><small>${esc(s.duration_minutes)} min</small>`:''}</td><td><strong>${esc(st?.full_name||'Student')}</strong><br><small>${esc(st?.phone||st?.email||'')}</small></td><td>${esc(s.course||st?.course||'—')}</td><td>${esc(att)}</td><td>${meeting}</td><td>${esc(sess?.student_joined_at?'Joined':'Not joined')}</td><td><button class="btn-small teacher-class-details" data-sid="${esc(s.id)}" type="button">Details</button></td></tr>`;}).join('');
      rows.querySelectorAll('.teacher-class-details').forEach(btn=>btn.addEventListener('click',()=>{const s=sch.find(x=>String(x.id)===btn.dataset.sid);const st=map.get(String(s.student_id));alert(`Student: ${st?.full_name||'Student'}\nCourse: ${s.course||st?.course||'—'}\nDays: ${s.class_days||'—'}\nTime: ${fmtTime(s.class_time)}\nDuration: ${s.duration_minutes||'—'} minutes\nTimezone: ${s.schedule_timezone||st?.timezone||'—'}`);}));
    }catch(e){rows.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:28px;color:#991b1b">${esc(e.message||'Unable to load classes.')}</td></tr>`;}
  }

  async function loadAttendance(){
    if(!document.getElementById('classRows') || document.body.dataset.page!=='teacher-attendance') return;
    const rows=document.getElementById('classRows'); rows.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px">Loading attendance…</td></tr>';
    try{
      const ctx=await teacherContext(); setHeader(ctx); const map=await studentMap(ctx); const r=await db.from('teacher_class_sessions').select('id,schedule_id,teacher_id,student_id,class_date,status,started_at,completed_at,student_joined_at,class,test,session,session_timezone').in('teacher_id',ctx.ids).order('class_date',{ascending:false}).limit(200);
      if(r.error) throw r.error; const sessions=r.data||[];
      if(!sessions.length){rows.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px">No attendance records found yet.</td></tr>';return;}
      rows.innerHTML=sessions.map(x=>{const st=map.get(String(x.student_id));const status=x.status||'Scheduled';return `<tr><td>${fmtDate(x.class_date)}</td><td>${fmtTime(x.started_at||'')}</td><td><strong>${esc(st?.full_name||'Student')}</strong><br><small>${esc(st?.phone||st?.email||'')}</small></td><td>${esc(st?.course||'—')}</td><td><strong>${esc(status)}</strong></td><td><button type="button" class="btn-small teacher-mark-att" data-id="${esc(x.id)}" data-status="present">Present</button> <button type="button" class="btn-small teacher-mark-att" data-id="${esc(x.id)}" data-status="absent">Absent</button></td><td>${esc(x.class||x.session||'—')}</td></tr>`;}).join('');
      rows.querySelectorAll('.teacher-mark-att').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;const rr=await db.from('teacher_class_sessions').update({status:btn.dataset.status}).eq('id',btn.dataset.id).in('teacher_id',ctx.ids);btn.disabled=false;if(rr.error) alert(rr.error.message);else loadAttendance();}));
    }catch(e){rows.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:28px;color:#991b1b">${esc(e.message||'Unable to load attendance.')}</td></tr>`;}
  }

  const fieldDefs=[
    ['full_name','Full Name'],['email','Email'],['phone','Phone'],['whatsapp','WhatsApp'],['qualification','Qualification'],['specialization','Specialization'],['experience','Experience'],['subjects','Subjects'],['country','Country'],['city','City'],['timezone','Timezone'],['joining_date','Joining Date'],['status','Status'],['bio','About / Bio']
  ];
  function renderProfile(ctx){
    const main=document.querySelector('#main-content'); if(!main||document.body.dataset.page!=='teacher-profile') return;
    const t=ctx.teacher||{}; const u=ctx.user; const photo=t.avatar_url||t.profile_image||t.photo_url||t.image_url||t.image||u.user_metadata?.avatar_url||''; const name=t.full_name||t.name||u.user_metadata?.full_name||u.email||'Teacher';
    const cards=fieldDefs.map(([k,label])=>{let v=t[k]; if(k==='email') v=v||u.email; if(v==null||v==='') return ''; return `<div class="teacher-profile-field"><span>${esc(label)}</span><strong>${esc(v)}</strong></div>`;}).join('');
    main.innerHTML=`<section class="card teacher-profile-card"><div class="teacher-profile-hero"><div class="teacher-avatar-wrap">${photo?`<img src="${esc(photo)}" alt="${esc(name)}">`:`<div class="teacher-avatar-placeholder">${esc(name.charAt(0).toUpperCase())}</div>`}</div><div><h1>${esc(name)}</h1><p>Teacher Profile • Haroon Ibn Rasheed Online Quran Academy</p><a class="btn-small" href="https://wa.me/923189842581" target="_blank" rel="noopener">WhatsApp Academy</a></div></div><div class="teacher-profile-grid">${cards||'<p>No additional teacher profile details have been added yet.</p>'}</div><form id="teacherProfileEdit" class="teacher-profile-edit"><h2>Update Profile</h2><div class="profile-edit-grid"><label>Full Name<input id="tpFullName" value="${esc(name)}" required></label><label>Phone<input id="tpPhone" value="${esc(t.phone||'')}"></label><label>Qualification<input id="tpQualification" value="${esc(t.qualification||'')}"></label><label>Specialization<input id="tpSpecialization" value="${esc(t.specialization||'')}"></label><label>Experience<input id="tpExperience" value="${esc(t.experience||'')}"></label><label>Profile Image URL<input id="tpPhoto" value="${esc(photo)}"></label><label class="full">About / Bio<textarea id="tpBio" rows="4">${esc(t.bio||'')}</textarea></label></div><button class="btn-small" type="submit">Save Profile</button><span id="tpSaveStatus"></span></form></section>`;
    document.getElementById('teacherProfileEdit').addEventListener('submit',async e=>{e.preventDefault();const status=document.getElementById('tpSaveStatus');status.textContent='Saving…';const vals={full_name:document.getElementById('tpFullName').value.trim(),phone:document.getElementById('tpPhone').value.trim(),qualification:document.getElementById('tpQualification').value.trim(),specialization:document.getElementById('tpSpecialization').value.trim(),experience:document.getElementById('tpExperience').value.trim(),bio:document.getElementById('tpBio').value.trim(),avatar_url:document.getElementById('tpPhoto').value.trim(),profile_image:document.getElementById('tpPhoto').value.trim(),photo_url:document.getElementById('tpPhoto').value.trim(),image_url:document.getElementById('tpPhoto').value.trim()};
      const payload={}; Object.keys(vals).forEach(k=>{if(Object.prototype.hasOwnProperty.call(t,k)) payload[k]=vals[k];}); if(t.id) payload.full_name=vals.full_name;
      let err=null; if(t.id){const rr=await db.from('teachers').update(payload).eq('id',t.id);err=rr.error;} else {const rr=await db.from('profiles').update({full_name:vals.full_name}).eq('id',u.id);err=rr.error;}
      if(err){status.textContent=err.message;status.style.color='#b91c1c';}else{status.textContent='Profile saved successfully.';status.style.color='#15803d';ctx.teacher=Object.assign({},t,payload);setHeader(ctx);}
    });
  }

  async function init(){
    try{
      const ctx=await teacherContext(); setHeader(ctx);
      await loadStudents(); await loadClasses(); await loadAttendance(); renderProfile(ctx);
    }catch(e){console.warn('Teacher data enhancement:',e);}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
