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
      const ctx=await teacherContext(); setHeader(ctx); const map=await studentMap(ctx);
      const r=await db.from('teacher_class_sessions').select('id,schedule_id,teacher_id,student_id,class_date,status,started_at,completed_at,student_joined_at,class,test,session,session_timezone').in('teacher_id',ctx.ids).order('class_date',{ascending:false}).limit(200);
      if(r.error) throw r.error; const sessions=r.data||[];
      const total=document.getElementById('attTotal'), present=document.getElementById('attPresent'), absent=document.getElementById('attAbsent'), rate=document.getElementById('attRate');
      const p=sessions.filter(x=>String(x.status||'').toLowerCase()==='present').length, a=sessions.filter(x=>String(x.status||'').toLowerCase()==='absent').length;
      if(total) total.textContent=sessions.length; if(present) present.textContent=p; if(absent) absent.textContent=a; if(rate) rate.textContent=(p+a?Math.round(p/(p+a)*100):0)+'%';
      if(!sessions.length){rows.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px">No attendance records found yet.</td></tr>';return;}
      rows.innerHTML=sessions.map(x=>{const st=map.get(String(x.student_id));const status=String(x.status||'Scheduled').toLowerCase();const badge=status==='present'?'present':status==='absent'?'absent':'scheduled';return `<tr><td>${fmtDate(x.class_date)}</td><td>${fmtTime(x.started_at||'')}</td><td><strong>${esc(st?.full_name||'Student')}</strong><br><small>${esc(st?.phone||st?.email||'')}</small></td><td>${esc(st?.course||'—')}</td><td><span class="att-badge ${badge}">${esc(x.status||'Scheduled')}</span></td><td><div class="att-mark-wrap"><button type="button" class="att-mark-btn present teacher-mark-att" data-id="${esc(x.id)}" data-status="present">Present</button><button type="button" class="att-mark-btn absent teacher-mark-att" data-id="${esc(x.id)}" data-status="absent">Absent</button></div></td><td>${esc(x.class||x.session||'—')}</td></tr>`;}).join('');
      rows.querySelectorAll('.teacher-mark-att').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;const rr=await db.from('teacher_class_sessions').update({status:btn.dataset.status}).eq('id',btn.dataset.id).in('teacher_id',ctx.ids);btn.disabled=false;if(rr.error) alert(rr.error.message);else loadAttendance();}));
    }catch(e){rows.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:28px;color:#991b1b">${esc(e.message||'Unable to load attendance.')}</td></tr>`;}
  }

  async function loadLeaves(){
    if(!document.getElementById('leaveRows') || document.body.dataset.page!=='teacher-leaves') return;
    const rows=document.getElementById('leaveRows');
    const setStat=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    try{
      const ctx=await teacherContext(); setHeader(ctx);
      const teacherId=ctx.teacher?.id||ctx.user.id;
      const r=await db.from('teacher_leaves').select('id,teacher_id,start_date,end_date,reason,status,admin_note,created_at').eq('teacher_id',teacherId).order('created_at',{ascending:false});
      if(r.error) throw r.error; const data=r.data||[];
      setStat('leaveTotal',data.length); setStat('leavePending',data.filter(x=>String(x.status||'pending').toLowerCase()==='pending').length); setStat('leaveApproved',data.filter(x=>String(x.status||'').toLowerCase()==='approved').length); setStat('leaveRejected',data.filter(x=>String(x.status||'').toLowerCase()==='rejected').length);
      if(!data.length){rows.innerHTML='<tr><td colspan="5" style="text-align:center;padding:28px">No leave requests yet. Submit your first request above.</td></tr>';return;}
      rows.innerHTML=data.map(x=>{const st=String(x.status||'pending').toLowerCase();return `<tr><td>${fmtDate(x.start_date)}</td><td>${fmtDate(x.end_date)}</td><td class="leave-reason">${esc(x.reason||'—')}${x.admin_note?`<br><small><strong>Admin:</strong> ${esc(x.admin_note)}</small>`:''}</td><td><span class="leave-badge ${esc(st)}">${esc(x.status||'Pending')}</span></td><td>${fmtDate(x.created_at)}</td></tr>`;}).join('');
    }catch(e){rows.innerHTML=`<tr><td colspan="5" style="text-align:center;padding:28px;color:#991b1b">${esc(e.message||'Unable to load leave requests. Run the supplied SQL first.')}</td></tr>`;}
  }

  async function initLeavesForm(){
    const form=document.getElementById('leaveForm'); if(!form) return;
    form.addEventListener('submit',async e=>{
      e.preventDefault(); const btn=form.querySelector('button[type="submit"]'), msg=document.getElementById('leaveStatusMsg'); const fd=new FormData(form); const start=fd.get('start_date'), end=fd.get('end_date'), reason=String(fd.get('reason')||'').trim();
      if(end<start){msg.textContent='End date cannot be before start date.';msg.style.color='#b91c1c';return;}
      btn.disabled=true; msg.textContent='Submitting…'; msg.style.color='#64748b';
      try{const ctx=await teacherContext(); const teacherId=ctx.teacher?.id||ctx.user.id; const r=await db.from('teacher_leaves').insert({teacher_id:teacherId,start_date:start,end_date:end,reason,status:'pending'}); if(r.error) throw r.error; form.reset(); msg.textContent='Leave request submitted successfully.';msg.style.color='#15803d'; await loadLeaves();}
      catch(err){msg.textContent=err.message||'Unable to submit leave request.';msg.style.color='#b91c1c';} finally{btn.disabled=false;}
    });
  }

  const fieldDefs=[
    ['full_name','Full Name'],['email','Email'],['phone','Phone'],['whatsapp','WhatsApp'],['qualification','Qualification'],['specialization','Specialization'],['experience','Experience'],['subjects','Subjects'],['country','Country'],['city','City'],['timezone','Timezone'],['joining_date','Joining Date'],['status','Status'],['bio','About / Bio']
  ];
  function renderProfile(ctx){
    const main=document.querySelector('#main-content'); if(!main||document.body.dataset.page!=='teacher-profile') return;
    const t=ctx.teacher||{}; const u=ctx.user||{};
    const val=(...keys)=>{for(const k of keys){if(t[k]!==undefined&&t[k]!==null&&String(t[k]).trim()!=='') return t[k]; if(u.user_metadata?.[k]!==undefined&&u.user_metadata?.[k]!==null&&String(u.user_metadata[k]).trim()!=='') return u.user_metadata[k];}return '';};
    const name=val('full_name','name')||u.email||'Teacher';
    const email=t.email||u.email||'';
    const phone=val('phone','phone_number'); const wa=val('whatsapp','whatsapp_number')||phone;
    const qualification=val('qualification','education')||'Not added yet';
    const specialization=val('specialization','speciality')||'Quran Teaching';
    const experience=val('experience','years_experience')||'Not added yet';
    const country=val('country')||''; const city=val('city')||''; const location=[country,city].filter(Boolean).join(' – ')||'Not added yet';
    const timezone=val('timezone','time_zone')||'Asia/Karachi';
    const joined=val('joining_date','joined_at','created_at');
    const status=val('status','account_status')||'Active';
    const bio=val('bio','about','about_me')||'Dedicated Quran teacher committed to providing professional and personalized online Quran education.';
    const photo=val('avatar_url','profile_image','photo_url','image_url','image')||'';
    const subjectsRaw=val('subjects','subject','teaching_subjects');
    const subjects=Array.isArray(subjectsRaw)?subjectsRaw:(String(subjectsRaw||'Quran, Tajweed, Arabic').split(/[,|]/).map(s=>s.trim()).filter(Boolean));
    const escA=v=>esc(v);
    const fmtJoined=joined?fmtDate(joined):'Not added yet';
    const photoHtml=photo?`<img class="profile-photo" src="${escA(photo)}" alt="${escA(name)} profile photo" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`:'<div class="profile-photo" style="display:none"></div>';
    const placeholder=`<div class="profile-photo-placeholder" ${photo?'style="display:none"':''}>${escA(String(name).charAt(0).toUpperCase())}</div>`;
    const subjectHtml=subjects.map(s=>`<span class="profile-chip">${escA(s)}</span>`).join('');
    main.innerHTML=`
      <div class="profile-page-wrap">
        <section class="profile-titlebar">
          <div class="profile-title-left"><div class="profile-title-icon">👤</div><div><h1>My Profile</h1><p>View and update your profile information</p></div></div>
          <div class="profile-motto">Teach • Guide • <b>Inspire</b></div>
        </section>
        <div class="profile-layout">
          <section class="profile-panel">
            <div class="profile-panel-head">✎ &nbsp; Profile Information</div>
            <div class="profile-panel-body">
              <form id="teacherProfileEdit">
                <div class="profile-form-grid">
                  <div class="profile-field"><label>Full Name *</label><input id="tpFullName" value="${escA(name)}" required></div>
                  <div class="profile-field"><label>Email Address *</label><input value="${escA(email)}" disabled></div>
                  <div class="profile-field"><label>Phone Number *</label><input id="tpPhone" value="${escA(phone)}"></div>
                  <div class="profile-field"><label>WhatsApp Number</label><input id="tpWhatsapp" value="${escA(wa)}"></div>
                  <div class="profile-field"><label>Qualification</label><input id="tpQualification" value="${escA(qualification==='Not added yet'?'':qualification)}" placeholder="e.g. Master in Islamic Studies"></div>
                  <div class="profile-field"><label>Specialization</label><select id="tpSpecialization"><option ${specialization==='Quran Teaching'?'selected':''}>Quran Teaching</option><option ${specialization==='Tajweed'?'selected':''}>Tajweed</option><option ${specialization==='Hifz'?'selected':''}>Hifz / Memorization</option><option ${specialization==='Arabic'?'selected':''}>Arabic</option><option ${specialization==='Islamic Studies'?'selected':''}>Islamic Studies</option></select></div>
                  <div class="profile-field"><label>Experience</label><input id="tpExperience" value="${escA(experience==='Not added yet'?'':experience)}" placeholder="e.g. 5+ Years"></div>
                  <div class="profile-field"><label>Subjects</label><input id="tpSubjects" value="${escA(subjects.join(', '))}" placeholder="Quran, Tajweed, Arabic"></div>
                  <div class="profile-field"><label>Country</label><input id="tpCountry" value="${escA(country)}" placeholder="Pakistan"></div>
                  <div class="profile-field"><label>City</label><input id="tpCity" value="${escA(city)}" placeholder="Lahore"></div>
                  <div class="profile-field"><label>Timezone</label><input id="tpTimezone" value="${escA(timezone)}"></div>
                  <div class="profile-field"><label>Joining Date</label><input value="${escA(fmtJoined)}" disabled></div>
                  <div class="profile-field"><label>Profile Image URL</label><input id="tpPhoto" value="${escA(photo)}" placeholder="https://..."></div>
                  <div class="profile-field"><label>Status</label><input value="${escA(status)}" disabled></div>
                  <div class="profile-field full"><label>About Me</label><textarea id="tpBio" rows="5" placeholder="Tell students about your teaching experience...">${escA(bio)}</textarea></div>
                </div>
                <button class="profile-save" type="submit">💾 Update Profile</button><span id="tpSaveStatus" class="profile-status"></span>
              </form>
            </div>
          </section>
          <aside class="profile-panel profile-summary">
            <div class="profile-panel-head">👤 &nbsp; Your Profile</div>
            <div class="profile-panel-body">
              ${photoHtml}${placeholder}
              <h2>${escA(name)}</h2><div class="active-badge">✓ ${escA(status==='Active'?'Active Teacher':status)}</div>
              <div class="summary-list">
                <div class="summary-item"><i>✉</i><div><strong>${escA(email||'Not added')}</strong></div></div>
                <div class="summary-item"><i>☎</i><div><strong>${escA(phone||'Not added')}</strong></div></div>
                <div class="summary-item"><i>🎓</i><div><strong>${escA(qualification)}</strong></div></div>
                <div class="summary-item"><i>⭐</i><div><strong>${escA(specialization)}</strong></div></div>
                <div class="summary-item"><i>📍</i><div><strong>${escA(location)}</strong></div></div>
                <div class="summary-item"><i>◷</i><div><strong>${escA(timezone)}</strong></div></div>
                <div class="summary-item"><i>📅</i><div><strong>Joined: ${escA(fmtJoined)}</strong></div></div>
                <div class="summary-item"><i>📚</i><div>${subjectHtml}</div></div>
              </div>
              <a class="profile-save" style="display:inline-flex;text-decoration:none;margin-top:14px" href="https://wa.me/923189842581" target="_blank" rel="noopener">💬 Send us a Message</a>
            </div>
          </aside>
        </div>
      </div>`;
    document.getElementById('teacherProfileEdit').addEventListener('submit',async e=>{
      e.preventDefault(); const statusEl=document.getElementById('tpSaveStatus'); statusEl.textContent='Saving…';
      const vals={full_name:document.getElementById('tpFullName').value.trim(),phone:document.getElementById('tpPhone').value.trim(),whatsapp:document.getElementById('tpWhatsapp').value.trim(),qualification:document.getElementById('tpQualification').value.trim(),specialization:document.getElementById('tpSpecialization').value.trim(),experience:document.getElementById('tpExperience').value.trim(),subjects:document.getElementById('tpSubjects').value.trim(),country:document.getElementById('tpCountry').value.trim(),city:document.getElementById('tpCity').value.trim(),timezone:document.getElementById('tpTimezone').value.trim(),bio:document.getElementById('tpBio').value.trim(),avatar_url:document.getElementById('tpPhoto').value.trim()};
      const payload={}; Object.keys(vals).forEach(k=>{if(Object.prototype.hasOwnProperty.call(t,k)) payload[k]=vals[k];}); if(t.id) payload.full_name=vals.full_name;
      let err=null; if(t.id){const rr=await db.from('teachers').update(payload).eq('id',t.id);err=rr.error;} else {const rr=await db.from('profiles').update({full_name:vals.full_name}).eq('id',u.id);err=rr.error;}
      if(err){statusEl.textContent=err.message;statusEl.style.color='#b91c1c';}else{statusEl.textContent='Profile saved successfully.';statusEl.style.color='#15803d';ctx.teacher=Object.assign({},t,payload);setHeader(ctx);renderProfile(ctx);}
    });
  }

  async function init(){
    try{
      const ctx=await teacherContext(); setHeader(ctx);
      await loadStudents(); await loadClasses(); await loadAttendance(); await loadLeaves(); await initLeavesForm(); renderProfile(ctx);
    }catch(e){console.warn('Teacher data enhancement:',e);}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
