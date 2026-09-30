(()=>{
"use strict";

const cfg = window.SUPABASE_CONFIG || {};
const db = window.supabase?.createClient(cfg.url,cfg.anonKey);

window.academyDB = db;

const esc = v =>
  String(v ?? '').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));

const page = document.body.dataset.page;

async function session(){

  const r = await db.auth.getSession();

  if(!r.data.session){

    location.href =
      location.pathname.includes('/teacher/') ||
      location.pathname.includes('/student/')
      ? '../portal-login.html'
      : 'login.html';

    return null;
  }

  return r.data.session;
}


async function profile(uid){

  const r = await db
    .from('profiles')
    .select('*')
    .eq('id',uid)
    .single();

  return r.data;
}


async function guard(role){

  const s = await session();

  if(!s) return;

  const p = await profile(s.user.id);

  if(!p || p.role !== role){

    location.href = '../portal-login.html';

    return;
  }

  document
    .querySelectorAll('[data-name]')
    .forEach(x=>{
      x.textContent = p.full_name || s.user.email;
    });

  return {s,p};
}


window.portalLogout = async()=>{

  await db.auth.signOut();

  location.href =
    page === 'admin'
    ? 'login.html'
    : '../portal-login.html';
};


const set = (id,v)=>{

  const e = document.getElementById(id);

  if(e) e.innerHTML = v;
};


function rowEmpty(cols,msg='No records found.'){

  return `
    <tr>
      <td colspan="${cols}" class="empty">
        ${esc(msg)}
      </td>
    </tr>
  `;
}


/* =========================
   DATE / TIME
========================= */

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];


function todayISO(){

  const d = new Date();

  const y = d.getFullYear();

  const m = String(d.getMonth()+1).padStart(2,'0');

  const day = String(d.getDate()).padStart(2,'0');

  return `${y}-${m}-${day}`;
}


function todayName(){

  return DAYS[new Date().getDay()];
}


function prettyDate(){

  return new Date().toLocaleDateString(
    'en-US',
    {
      weekday:'long',
      year:'numeric',
      month:'long',
      day:'numeric'
    }
  );
}


function timeToMinutes(t){

  if(!t) return 0;

  const p = String(t).split(':');

  return (+p[0] * 60) + (+p[1] || 0);
}


function formatTime12(t){

  if(!t) return '';

  const p = String(t).split(':');

  let h = +p[0];

  const m = p[1] || '00';

  const a = h >= 12 ? 'PM' : 'AM';

  h = h % 12 || 12;

  return `${String(h).padStart(2,'0')}:${m} ${a}`;
}


function normalizeDays(value){

  if(Array.isArray(value)){

    return value
      .map(x=>String(x).trim())
      .filter(Boolean);
  }

  if(typeof value === 'string'){

    let v = value.trim();

    if(!v) return [];

    /*
      Supports:
      Monday
      Monday,Wednesday
      Monday, Wednesday
      ["Monday","Wednesday"]
    */

    if(v.startsWith('[')){

      try{

        const parsed = JSON.parse(v);

        if(Array.isArray(parsed))
          return parsed.map(x=>String(x).trim());

      }catch(e){}
    }

    return v
      .split(',')
      .map(x=>x.trim())
      .filter(Boolean);
  }

  return [];
}


function isToday(schedule){

  const today = todayName();

  return normalizeDays(schedule.class_days)
    .some(day =>
      String(day).toLowerCase() === today.toLowerCase()
    );
}


/* =========================
   SESSION STATUS
========================= */

function statusClass(status){

  return `status-${String(status || 'upcoming')
    .toLowerCase()
    .replace(/\s+/g,'_')}`;
}


function statusText(status){

  return String(status || 'upcoming')
    .replace('_',' ')
    .replace(/\b\w/g,x=>x.toUpperCase());
}


function nowMinutes(){

  const d = new Date();

  return d.getHours()*60 + d.getMinutes();
}


function getAutomaticStatus(schedule, savedStatus){

  if(savedStatus)
    return savedStatus;

  const start = timeToMinutes(schedule.class_time);

  const end =
    start + (+schedule.duration_minutes || 30);

  const now = nowMinutes();

  if(now < start)
    return 'upcoming';

  if(now >= start && now < end)
    return 'active';

  return 'late';
}


/* =========================
   TEACHER SESSIONS
========================= */

async function getTodaySessions(teacherId){

  const date = todayISO();

  const r = await db
    .from('teacher_class_sessions')
    .select('*')
    .eq('teacher_id',teacherId)
    .eq('class_date',date);

  return r.data || [];
}


async function ensureTodaySession(schedule,teacherId){

  const date = todayISO();

  const existing = await db
    .from('teacher_class_sessions')
    .select('*')
    .eq('schedule_id',schedule.id)
    .eq('class_date',date)
    .maybeSingle();

  if(existing.data)
    return existing.data;

  const initial = getAutomaticStatus(schedule,null);

  /*
    If today's class time has already passed,
    initially show Late.
  */

  const insert = await db
    .from('teacher_class_sessions')
    .insert({
      schedule_id:schedule.id,
      teacher_id:teacherId,
      student_id:schedule.student_id,
      class_date:date,
      status:initial
    })
    .select()
    .single();

  return insert.data || null;
}


/* =========================
   TEACHER DASHBOARD
========================= */

async function loadTeacherDashboard(g){

  const uid = g.s.user.id;

  set('dashboardDate',prettyDate());


  /* LOAD ADMIN SAVED SCHEDULES */

  const scheduleResult = await db
    .from('class_schedules')
    .select(`
      id,
      teacher_id,
      student_id,
      course,
      class_days,
      class_time,
      duration_minutes,
      google_meet_url,
      classroom_code,
      active
    `)
    .eq('teacher_id',uid)
    .eq('active',true)
    .order('class_time',{ascending:true});


  if(scheduleResult.error){

    set(
      'todayClassRows',
      rowEmpty(
        6,
        scheduleResult.error.message
      )
    );

    return;
  }


  const schedules = scheduleResult.data || [];


  /* STUDENTS */

  const studentIds = [
    ...new Set(
      schedules
        .map(x=>x.student_id)
        .filter(Boolean)
    )
  ];


  let students = [];

  if(studentIds.length){

    const sr = await db
      .from('students')
      .select('id,full_name,teacher_id,status')
      .in('id',studentIds);

    students = sr.data || [];
  }


  const studentMap = {};

  students.forEach(s=>{
    studentMap[s.id] = s;
  });


  /* TODAY'S SCHEDULES */

  const todaySchedules =
    schedules.filter(isToday);


  /* CREATE TODAY SESSION RECORDS */

  const todaySessions = [];

  for(const schedule of todaySchedules){

    const s =
      await ensureTodaySession(schedule,uid);

    if(s)
      todaySessions.push(s);
  }


  const sessionMap = {};

  todaySessions.forEach(s=>{
    sessionMap[s.schedule_id] = s;
  });


  /* TOTAL CLASSES */

  set(
    'totalClasses',
    schedules.length
  );


  /* CLASS RATE */

  const completed =
    todaySessions.filter(
      x=>x.status === 'completed'
    ).length;

  const totalToday = todaySchedules.length;

  const rate =
    totalToday
      ? Math.round((completed / totalToday) * 100)
      : 0;

  set('classRate',rate+'%');


  /* LATE */

  const late =
    todaySessions.filter(
      x=>x.status === 'late'
    ).length;

  set('lateClasses',late);


  /* LEFT CLASSES */

  const left =
    todaySessions.filter(
      x=>x.status === 'upcoming'
    ).length;

  set('leftClasses',left);


  /* SALARY */

  const salaryResult = await db
    .from('teacher_salaries')
    .select('amount,currency')
    .eq('teacher_id',uid);

  const salaryRows =
    salaryResult.data || [];

  let totalSalary = 0;
  let currency = '';

  salaryRows.forEach(x=>{

    totalSalary += Number(x.amount || 0);

    if(!currency && x.currency)
      currency = x.currency;
  });

  set(
    'totalSalary',
    `${currency ? esc(currency)+' ' : ''}${totalSalary}`
  );


  /* REMINDERS */

  let reminderCount = 0;

  const notificationResult = await db
    .from('notifications')
    .select('id')
    .eq('user_id',uid);

  if(!notificationResult.error)
    reminderCount =
      (notificationResult.data || []).length;

  set(
    'reminderCount',
    reminderCount
  );


  /* TODAY SUMMARY */

  set(
    'todaySummary',
    todaySchedules.length
      ? `${todaySchedules.length} class${todaySchedules.length===1?'':'es'} scheduled for today.`
      : 'No classes scheduled for today.'
  );


  /* TODAY TABLE */

  if(!todaySchedules.length){

    set(
      'todayClassRows',
      `
      <tr>
        <td colspan="6" class="today-empty">
          No classes scheduled for today.
        </td>
      </tr>
      `
    );

  }else{

    set(
      'todayClassRows',
      todaySchedules.map(schedule=>{

        const student =
          studentMap[schedule.student_id];

        const session =
          sessionMap[schedule.id];

        const status =
          session?.status ||
          getAutomaticStatus(schedule,null);

        const classroomUrl =
          schedule.classroom_code
          ? `https://haroonibnrasheedonlinequranacadmey.github.io/haroon-quran-classroom/?code=${encodeURIComponent(schedule.classroom_code)}`
          : '';


        let actions = '';


        if(status === 'upcoming' || status === 'late'){

          actions += `
            <button
              onclick="teacherStartClass('${esc(schedule.id)}')">
              Start Class
            </button>
          `;
        }


        if(schedule.google_meet_url){

          actions += `
            <a
              href="${esc(schedule.google_meet_url)}"
              target="_blank"
              rel="noopener">
              Join Class
            </a>
          `;
        }


        if(classroomUrl){

          actions += `
            <a
              href="${esc(classroomUrl)}"
              target="_blank"
              rel="noopener">
              Google Classroom
            </a>
          `;
        }


        if(status === 'active'){

          actions += `
            <button
              class="danger-action"
              onclick="teacherEndClass('${esc(schedule.id)}')">
              End Class
            </button>
          `;
        }


        actions += `
          <button
            onclick="teacherCopyLink('${esc(schedule.google_meet_url || classroomUrl || '')}')">
            Copy Link
          </button>
        `;


        return `
        <tr>

          <td>
            ${esc(formatTime12(schedule.class_time))}
          </td>

          <td>
            ${esc(student?.full_name || schedule.student_id || '—')}
          </td>

          <td>
            ${esc(schedule.course || '—')}
          </td>

          <td>
            ${esc(schedule.duration_minutes || 30)} min
          </td>

          <td>
            <span class="pill ${statusClass(status)}">
              ${esc(statusText(status))}
            </span>
          </td>

          <td>

            <div class="action-group">
              ${actions}
            </div>

          </td>

        </tr>
        `;

      }).join('')
    );
  }


  /* EXISTING MY CLASSES */

  set(
    'classRows',
    schedules.map(schedule=>{

      const student =
        studentMap[schedule.student_id];

      const session =
        sessionMap[schedule.id];

      const status =
        session?.status ||
        getAutomaticStatus(schedule,null);


      return `
      <tr>

        <td>
          ${esc(todayName())}
        </td>

        <td>
          ${esc(formatTime12(schedule.class_time))}
        </td>

        <td>
          ${esc(student?.full_name || schedule.student_id || '')}
        </td>

        <td>
          ${esc(schedule.course || '')}
        </td>

        <td>
          <span class="pill ${statusClass(status)}">
            ${esc(statusText(status))}
          </span>
        </td>

        <td>
          ${
            schedule.google_meet_url
            ? `
              <a
                class="btn-small"
                target="_blank"
                rel="noopener"
                href="${esc(schedule.google_meet_url)}">
                Join
              </a>
            `
            : '—'
          }
        </td>

        <td>
          <select
            onchange="markAttendance('${esc(schedule.id)}','${esc(schedule.student_id)}',this.value)">
            <option value="">Mark</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
        </td>

        <td>

          ${
            status !== 'active'
            ? `
              <button
                class="btn-small"
                onclick="teacherStartClass('${esc(schedule.id)}')">
                Start
              </button>
            `
            : `
              <button
                class="btn-small"
                onclick="teacherEndClass('${esc(schedule.id)}')">
                Complete
              </button>
            `
          }

        </td>

      </tr>
      `;

    }).join('') || rowEmpty(8)
  );
}


/* =========================
   START CLASS
========================= */

window.teacherStartClass = async(scheduleId)=>{

  const g = await guard('teacher');

  if(!g) return;

  const uid = g.s.user.id;

  const today = todayISO();


  const r = await db
    .from('teacher_class_sessions')
    .upsert(
      {
        schedule_id:scheduleId,
        teacher_id:uid,
        class_date:today,
        status:'active',
        started_at:new Date().toISOString(),
        student_id:null
      },
      {
        onConflict:'schedule_id,class_date'
      }
    );


  /*
    student_id is required by the table.
    If the first request fails because of that,
    load the schedule and retry with its student.
  */

  if(r.error){

    const sr = await db
      .from('class_schedules')
      .select('student_id')
      .eq('id',scheduleId)
      .eq('teacher_id',uid)
      .single();

    if(sr.data){

      const retry = await db
        .from('teacher_class_sessions')
        .upsert(
          {
            schedule_id:scheduleId,
            teacher_id:uid,
            student_id:sr.data.student_id,
            class_date:today,
            status:'active',
            started_at:new Date().toISOString()
          },
          {
            onConflict:'schedule_id,class_date'
          }
        );

      if(retry.error){

        alert(retry.error.message);
        return;
      }

    }else{

      alert(r.error.message);
      return;
    }
  }

  location.reload();
};


/* =========================
   END CLASS
========================= */

window.teacherEndClass = async(scheduleId)=>{

  const g = await guard('teacher');

  if(!g) return;

  const r = await db
    .from('teacher_class_sessions')
    .update({
      status:'completed',
      completed_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    })
    .eq('schedule_id',scheduleId)
    .eq('teacher_id',g.s.user.id)
    .eq('class_date',todayISO());

  if(r.error){

    alert(r.error.message);
    return;
  }

  location.reload();
};


/* =========================
   COPY LINK
========================= */

window.teacherCopyLink = async(link)=>{

  if(!link){

    alert('No class link saved by Admin.');
    return;
  }

  try{

    await navigator.clipboard.writeText(link);

    alert('Class link copied.');

  }catch(e){

    prompt('Copy this class link:',link);
  }
};


/* =========================
   ATTENDANCE
========================= */

window.markAttendance = async(
  scheduleId,
  student,
  status
)=>{

  if(!status) return;

  const g = await guard('teacher');

  if(!g) return;


  const r = await db
    .from('attendance')
    .upsert(
      {
        schedule_id:scheduleId,
        student_id:student,
        teacher_id:g.s.user.id,
        status
      },
      {
        onConflict:'schedule_id,student_id'
      }
    );


  if(r.error)
    alert(r.error.message);
};


/* =========================
   TEACHER DATA
========================= */

async function teacherData(){

  const g = await guard('teacher');

  if(!g) return;


  if(
    page === 'teacher-dashboard'
  ){

    await loadTeacherDashboard(g);

    return;
  }


  const uid = g.s.user.id;


  /* SCHEDULE */

  if(
    page === 'teacher-schedule'
  ){

    const r = await db
      .from('class_schedules')
      .select(`
        id,
        teacher_id,
        student_id,
        course,
        class_days,
        class_time,
        duration_minutes,
        active
      `)
      .eq('teacher_id',uid)
      .eq('active',true)
      .order('class_time',{ascending:true});


    const data = r.data || [];


    const studentIds = [
      ...new Set(
        data.map(x=>x.student_id)
      )
    ];


    let studentMap = {};

    if(studentIds.length){

      const sr = await db
        .from('students')
        .select('id,full_name')
        .in('id',studentIds);

      (sr.data || []).forEach(s=>{
        studentMap[s.id] = s;
      });
    }


    /*
      Schedule page intentionally has
      NO Meet/Classroom buttons.
    */

    set(
      'scheduleRows',
      data.map(x=>`

        <tr>

          <td>
            ${esc(
              normalizeDays(x.class_days).join(', ')
            )}
          </td>

          <td>
            ${esc(
              studentMap[x.student_id]?.full_name ||
              x.student_id
            )}
          </td>

          <td>
            ${esc(x.course || '—')}
          </td>

          <td>
            ${esc(formatTime12(x.class_time))}
          </td>

          <td>
            ${esc(x.duration_minutes || 30)} min
          </td>

          <td>
            <span class="pill">
              Active
            </span>
          </td>

        </tr>

      `).join('') || rowEmpty(6)
    );

    return;
  }


  /* STUDENTS */

  if(page === 'teacher-students'){

    const r = await db
      .from('class_schedules')
      .select('student_id')
      .eq('teacher_id',uid)
      .eq('active',true);


    const ids = [
      ...new Set(
        (r.data || []).map(x=>x.student_id)
      )
    ];


    if(!ids.length){

      set('studentRows',rowEmpty(3));
      return;
    }


    const sr = await db
      .from('students')
      .select('id,full_name,status')
      .in('id',ids);


    set(
      'studentRows',
      (sr.data || []).map(x=>`

        <tr>
          <td>${esc(x.full_name)}</td>
          <td>${esc(x.status || 'Active')}</td>
          <td>${esc(x.id)}</td>
        </tr>

      `).join('') || rowEmpty(3)
    );

    return;
  }


  /* COURSES */

  if(page === 'teacher-courses'){

    const r = await db
      .from('class_schedules')
      .select('course')
      .eq('teacher_id',uid)
      .eq('active',true);


    const courses = [
      ...new Set(
        (r.data || [])
          .map(x=>x.course)
          .filter(Boolean)
      )
    ];


    set(
      'courseRows',
      courses.map(x=>`

        <tr>
          <td>${esc(x)}</td>
        </tr>

      `).join('') || rowEmpty(1)
    );

    return;
  }


  /* LEAVES */

  if(page === 'teacher-leaves'){

    const r = await db
      .from('leaves')
      .select('*')
      .eq('user_id',uid)
      .order('created_at',{ascending:false});


    set(
      'leaveRows',
      (r.data || []).map(x=>`

        <tr>
          <td>${esc(x.start_date)}</td>
          <td>${esc(x.end_date)}</td>
          <td>${esc(x.reason)}</td>
          <td>
            <span class="pill">
              ${esc(x.status)}
            </span>
          </td>
        </tr>

      `).join('') || rowEmpty(4)
    );


    document
      .getElementById('leaveForm')
      ?.addEventListener('submit',async e=>{

        e.preventDefault();

        const f = new FormData(e.target);

        const r = await db
          .from('leaves')
          .insert({
            user_id:uid,
            role:'teacher',
            start_date:f.get('start_date'),
            end_date:f.get('end_date'),
            reason:f.get('reason')
          });


        if(r.error)
          alert(r.error.message);
        else
          location.reload();

      });

    return;
  }


  /* SALARY */

  if(page === 'teacher-salary'){

    const r = await db
      .from('teacher_salaries')
      .select('*')
      .eq('teacher_id',uid)
      .order('salary_month',{ascending:false});


    set(
      'salaryRows',
      (r.data || []).map(x=>`

        <tr>
          <td>${esc(x.salary_month)}</td>
          <td>${esc(x.amount)} ${esc(x.currency)}</td>
          <td>
            <span class="pill">
              ${esc(x.status)}
            </span>
          </td>
          <td>${esc(x.paid_at || '')}</td>
        </tr>

      `).join('') || rowEmpty(4)
    );

    return;
  }


  /* PROFILE */

  if(page === 'teacher-profile'){

    set(
      'profileName',
      esc(g.p.full_name || '')
    );

    set(
      'profileEmail',
      esc(g.s.user.email || '')
    );


    document
      .getElementById('profileForm')
      ?.addEventListener('submit',async e=>{

        e.preventDefault();

        const f = new FormData(e.target);

        const r = await db.rpc(
          'update_my_profile',
          {
            p_full_name:f.get('full_name')
          }
        );


        if(r.error)
          alert(r.error.message);
        else
          alert('Profile updated.');

      });

  }

}


/* =========================
   STUDENT DATA
========================= */

async function studentData(){

  const g = await guard('student');

  if(!g) return;

  const uid = g.s.user.id;


  if(
    page === 'student-dashboard' ||
    page === 'student-schedule' ||
    page === 'student-classes'
  ){

    const [
      e,
      s,
      a,
      p,
      n,
      c
    ] = await Promise.all([

      db
        .from('student_enrollments')
        .select('*,courses(title)')
        .eq('student_id',uid),

      db
        .from('class_schedules')
        .select(`
          *,
          teacher:profiles!class_schedules_teacher_id_fkey(full_name)
        `)
        .eq('student_id',uid)
        .eq('active',true)
        .order('class_time'),

      db
        .from('attendance')
        .select('status')
        .eq('student_id',uid),

      db
        .from('student_payments')
        .select('*')
        .eq('student_id',uid)
        .order('created_at',{ascending:false}),

      db
        .from('notifications')
        .select('*')
        .eq('user_id',uid)
        .order('created_at',{ascending:false}),

      db
        .from('certificates')
        .select('*,courses(title)')
        .eq('student_id',uid)

    ]);


    set(
      'courseCount',
      e.data?.length || 0
    );


    set(
      'classCount',
      s.data?.length || 0
    );


    set(
      'attendanceRate',
      a.data?.length
      ? Math.round(
          a.data.filter(
            x=>x.status==='present'
          ).length /
          a.data.length * 100
        ) + '%'
      : '—'
    );


    set(
      'paymentRows',
      (p.data || []).map(x=>`

        <tr>
          <td>${esc(x.amount)} ${esc(x.currency || '')}</td>
          <td>${esc(x.method)}</td>
          <td>${esc(x.status)}</td>
          <td>${esc(x.created_at?.slice(0,10))}</td>
        </tr>

      `).join('') || rowEmpty(4)
    );


    set(
      'scheduleRows',
      (s.data || []).map(x=>`

        <tr>
          <td>${esc(x.class_days)}</td>
          <td>${esc(formatTime12(x.class_time))}</td>
          <td>${esc(x.course || '')}</td>
          <td>${esc(x.teacher?.full_name || '')}</td>
          <td>${x.google_meet_url
            ? `<a class="btn-small" target="_blank" href="${esc(x.google_meet_url)}">Join</a>`
            : '—'}
          </td>
          <td>${x.active ? 'Active' : 'Inactive'}</td>
        </tr>

      `).join('') || rowEmpty(6)
    );


    set(
      'courseRows',
      (e.data || []).map(x=>`

        <tr>
          <td>${esc(x.courses?.title || '')}</td>
          <td>${esc(x.status)}</td>
          <td>${x.progress || 0}%</td>
        </tr>

      `).join('') || rowEmpty(3)
    );


    set(
      'notificationRows',
      (n.data || []).map(x=>`

        <div class="card">
          <b>${esc(x.title)}</b>
          <p>${esc(x.body)}</p>
        </div>

      `).join('') ||
      '<p class="empty">No notifications.</p>'
    );


    set(
      'certRows',
      (c.data || []).map(x=>`

        <tr>
          <td>${esc(x.courses?.title || '')}</td>
          <td>${esc(x.certificate_no || '')}</td>
          <td>${esc(x.issued_at || '')}</td>
        </tr>

      `).join('') || rowEmpty(3)
    );

    return;
  }


  if(page === 'student-attendance'){

    const r = await db
      .from('attendance')
      .select(`
        *,
        class_schedules(
          class_days,
          class_time,
          duration_minutes,
          course
        )
      `)
      .eq('student_id',uid)
      .order('created_at',{ascending:false});


    set(
      'attendanceRows',
      (r.data || []).map(x=>`

        <tr>
          <td>${esc(x.class_schedules?.class_days || '')}</td>
          <td>${esc(x.class_schedules?.course || '')}</td>
          <td>${esc(x.status)}</td>
          <td>${esc(x.notes || '')}</td>
        </tr>

      `).join('') || rowEmpty(4)
    );

    return;
  }


  if(page === 'student-fees'){

    const r = await db
      .from('student_payments')
      .select('*')
      .eq('student_id',uid)
      .order('created_at',{ascending:false});


    set(
      'paymentRows',
      (r.data || []).map(x=>`

        <tr>
          <td>${esc(x.amount)} ${esc(x.currency || '')}</td>
          <td>${esc(x.method)}</td>
          <td>${esc(x.status)}</td>
          <td>${esc(x.reference || '')}</td>
          <td>${esc(x.created_at?.slice(0,10))}</td>
        </tr>

      `).join('') || rowEmpty(5)
    );

    return;
  }


  if(page === 'student-leaves'){

    const r = await db
      .from('leaves')
      .select('*')
      .eq('user_id',uid)
      .order('created_at',{ascending:false});


    set(
      'leaveRows',
      (r.data || []).map(x=>`

        <tr>
          <td>${esc(x.start_date)}</td>
          <td>${esc(x.end_date)}</td>
          <td>${esc(x.reason)}</td>
          <td>${esc(x.status)}</td>
        </tr>

      `).join('') || rowEmpty(4)
    );


    document
      .getElementById('leaveForm')
      ?.addEventListener('submit',async e=>{

        e.preventDefault();

        const f = new FormData(e.target);

        const r = await db
          .from('leaves')
          .insert({
            user_id:uid,
            role:'student',
            start_date:f.get('start_date'),
            end_date:f.get('end_date'),
            reason:f.get('reason')
          });


        if(r.error)
          alert(r.error.message);
        else
          location.reload();

      });

  }


  if(page === 'student-profile'){

    set(
      'profileName',
      esc(g.p.full_name || '')
    );

    set(
      'profileEmail',
      esc(g.s.user.email || '')
    );


    document
      .getElementById('profileForm')
      ?.addEventListener('submit',async e=>{

        e.preventDefault();

        const f = new FormData(e.target);

        const r = await db.rpc(
          'update_my_profile',
          {
            p_full_name:f.get('full_name')
          }
        );


        if(r.error)
          alert(r.error.message);
        else
          alert('Profile updated.');

      });

  }

}


/* =========================
   START APP
========================= */

if(page?.startsWith('teacher-'))
  teacherData();

if(page?.startsWith('student-'))
  studentData();

})();
