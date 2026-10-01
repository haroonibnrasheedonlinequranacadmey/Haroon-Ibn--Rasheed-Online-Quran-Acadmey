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


/* =========================
   SESSION
========================= */

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


/* =========================
   PROFILE
========================= */

async function profile(uid){

  const r = await db
    .from('profiles')
    .select('*')
    .eq('id',uid)
    .single();

  return r.data;
}


/* =========================
   GUARD
========================= */

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

      x.textContent =
        p.full_name ||
        s.user.email;

    });

  return {s,p};
}


/* =========================
   LOGOUT
========================= */

window.portalLogout = async()=>{

  await db.auth.signOut();

  location.href =
    page === 'admin'
    ? 'login.html'
    : '../portal-login.html';
};


/* =========================
   HELPERS
========================= */

const set = (id,v)=>{

  const e =
    document.getElementById(id);

  if(e)
    e.innerHTML = v;
};


function rowEmpty(
  cols,
  msg='No records found.'
){

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

  const y =
    d.getFullYear();

  const m =
    String(d.getMonth()+1)
      .padStart(2,'0');

  const day =
    String(d.getDate())
      .padStart(2,'0');

  return `${y}-${m}-${day}`;
}


function todayName(){

  return DAYS[
    new Date().getDay()
  ];
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

  const p =
    String(t).split(':');

  return (
    (+p[0] * 60) +
    (+p[1] || 0)
  );
}


function formatTime12(t){

  if(!t) return '';

  const p =
    String(t).split(':');

  let h = +p[0];

  const m =
    p[1] || '00';

  const a =
    h >= 12 ? 'PM' : 'AM';

  h =
    h % 12 || 12;

  return `${String(h).padStart(2,'0')}:${m} ${a}`;
}


function normalizeDays(value){

  if(Array.isArray(value)){

    return value
      .map(x=>String(x).trim())
      .filter(Boolean);
  }


  if(typeof value === 'string'){

    let v =
      value.trim();

    if(!v)
      return [];


    if(v.startsWith('[')){

      try{

        const parsed =
          JSON.parse(v);

        if(Array.isArray(parsed)){

          return parsed
            .map(x=>String(x).trim());
        }

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

  const today =
    todayName();

  return normalizeDays(
    schedule.class_days
  ).some(day =>
    String(day).toLowerCase() ===
    today.toLowerCase()
  );
}


/* =========================
   STATUS
========================= */

function statusClass(status){

  return `status-${String(
    status || 'upcoming'
  )
    .toLowerCase()
    .replace(/\s+/g,'_')}`;
}


function statusText(status){

  const map = {

    upcoming:'Upcoming',
    active:'Active',
    student_joined:'Student Joined',
    completed:'Completed',
    absent:'Absent',
    late:'Late',
    on_leave:'On Leave',
    cancelled:'Cancelled'

  };

  return map[status] || 'Upcoming';
}


function nowMinutes(){

  const d = new Date();

  return (
    d.getHours()*60 +
    d.getMinutes()
  );
}


/* =========================
   TEACHER ACTIVATION
========================= */

function canTeacherActivate(schedule){

  const start =
    timeToMinutes(
      schedule.class_time
    );

  const end =
    start +
    (+schedule.duration_minutes || 30);

  const now =
    nowMinutes();

  return (
    now >= start - 5 &&
    now < end
  );
}


function getAutomaticStatus(
  schedule,
  savedStatus
){

  if(savedStatus)
    return savedStatus;

  const start =
    timeToMinutes(
      schedule.class_time
    );

  const end =
    start +
    (+schedule.duration_minutes || 30);

  const now =
    nowMinutes();

  if(now < start - 5)
    return 'upcoming';

  if(now < end)
    return 'upcoming';

  return 'late';
}


/* =========================
   TEACHER SESSION
========================= */

async function getTodaySessions(
  teacherId
){

  const date =
    todayISO();

  const r =
    await db
      .from('teacher_class_sessions')
      .select('*')
      .eq('teacher_id',teacherId)
      .eq('class_date',date);

  return r.data || [];
}


async function ensureTodaySession(
  schedule,
  teacherId
){

  const date =
    todayISO();

  const existing =
    await db
      .from('teacher_class_sessions')
      .select('*')
      .eq('schedule_id',schedule.id)
      .eq('class_date',date)
      .maybeSingle();

  if(existing.data)
    return existing.data;


  const initial =
    getAutomaticStatus(
      schedule,
      null
    );


  const insert =
    await db
      .from('teacher_class_sessions')
      .insert({

        schedule_id:
          schedule.id,

        teacher_id:
          teacherId,

        student_id:
          schedule.student_id,

        class_date:
          date,

        status:
          initial

      })
      .select()
      .single();


  return insert.data || null;
}


/* =========================
   TEACHER DASHBOARD
========================= */

async function loadTeacherDashboard(g){

  const uid =
    g.s.user.id;

  set(
    'dashboardDate',
    prettyDate()
  );


  const scheduleResult =
    await db
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
      .order('class_time',{
        ascending:true
      });


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


  const schedules =
    scheduleResult.data || [];


  /* =========================
     STUDENT NAMES
========================= */

  const studentIds = [
    ...new Set(
      schedules
        .map(x=>x.student_id)
        .filter(Boolean)
    )
  ];


  let students = [];


  if(studentIds.length){

    const sr =
      await db
        .from('students')
        .select(
          'id,full_name,teacher_id,status'
        )
        .in('id',studentIds);


    if(!sr.error)
      students =
        sr.data || [];
  }


  const studentMap = {};


  students.forEach(s=>{
    studentMap[s.id] = s;
  });


  /* =========================
     TODAY
========================= */

  const todaySchedules =
    schedules.filter(isToday);


  const todaySessions = [];


  for(
    const schedule
    of todaySchedules
  ){

    const s =
      await ensureTodaySession(
        schedule,
        uid
      );

    if(s)
      todaySessions.push(s);
  }


  const sessionMap = {};


  todaySessions.forEach(s=>{
    sessionMap[s.schedule_id] = s;
  });


  /* =========================
     SUMMARY
========================= */

  set(
    'totalClasses',
    schedules.length
  );


  const completed =
    todaySessions.filter(
      x=>x.status === 'completed'
    ).length;


  const totalToday =
    todaySchedules.length;


  const rate =
    totalToday
      ? Math.round(
          completed /
          totalToday *
          100
        )
      : 0;


  set(
    'classRate',
    rate + '%'
  );


  const late =
    todaySessions.filter(
      x=>x.status === 'late'
    ).length;


  set(
    'lateClasses',
    late
  );


  const left =
    todaySessions.filter(
      x=>x.status === 'upcoming'
    ).length;


  set(
    'leftClasses',
    left
  );


  /* =========================
     SALARY
========================= */

  const salaryResult =
    await db
      .from('teacher_salaries')
      .select('amount,currency')
      .eq('teacher_id',uid);


  const salaryRows =
    salaryResult.data || [];


  let totalSalary = 0;
  let currency = '';


  salaryRows.forEach(x=>{

    totalSalary +=
      Number(x.amount || 0);

    if(!currency && x.currency)
      currency = x.currency;

  });


  set(
    'totalSalary',
    `${
      currency
        ? esc(currency)+' '
        : ''
    }${totalSalary}`
  );


  /* =========================
     REMINDERS
========================= */

  const notificationResult =
    await db
      .from('notifications')
      .select('id')
      .eq('user_id',uid);


  const reminderCount =
    !notificationResult.error
      ? (
          notificationResult.data || []
        ).length
      : 0;


  set(
    'reminderCount',
    reminderCount
  );


  set(
    'todaySummary',
    todaySchedules.length
      ? `${todaySchedules.length} class${todaySchedules.length===1?'':'es'} scheduled for today.`
      : 'No classes scheduled for today.'
  );


  /* =========================
     TODAY CLASSES
========================= */

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

    return;
  }


  set(
    'todayClassRows',

    todaySchedules.map(
      schedule=>{

        const student =
          studentMap[
            schedule.student_id
          ];


        const session =
          sessionMap[
            schedule.id
          ];


        const status =
          session?.status ||
          getAutomaticStatus(
            schedule,
            null
          );


        const studentName =
          student?.full_name ||
          'Student';


        let actions = '';


        if(
          (
            status === 'upcoming' ||
            status === 'late'
          ) &&
          canTeacherActivate(schedule)
        ){

          actions += `
            <button
              onclick="teacherStartClass('${esc(schedule.id)}')">
              Active Class
            </button>
          `;

        }else if(
          status === 'upcoming' &&
          !canTeacherActivate(schedule)
        ){

          actions += `
            <button disabled>
              Active at 5 min before
            </button>
          `;
        }


        /* GOOGLE MEET */

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


        /* CLASSROOM */

        const classroomUrl =
          schedule.classroom_code
          ? `https://haroonibnrasheedonlinequranacadmey.github.io/haroon-quran-classroom/?code=${encodeURIComponent(schedule.classroom_code)}`
          : '';


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


        /* ACTIVE ACTIONS */

        if(
          status === 'active' ||
          status === 'student_joined'
        ){

          actions += `
            <button
              class="danger-action"
              onclick="teacherEndClass('${esc(schedule.id)}')">
              End Class
            </button>
          `;


          actions += `
            <button
              class="absent-action"
              onclick="teacherMarkAbsent('${esc(schedule.id)}')">
              Mark Absent
            </button>
          `;
        }


        if(status === 'completed'){

          actions += `
            <span class="action-done">
              Class Completed
            </span>
          `;
        }


        if(status === 'absent'){

          actions += `
            <span class="action-absent">
              Student Absent
            </span>
          `;
        }


        return `
        <tr class="class-row ${statusClass(status)}">

          <td>
            <strong>
              ${esc(
                formatTime12(
                  schedule.class_time
                )
              )}
            </strong>
          </td>

          <td>
            <strong>
              ${esc(studentName)}
            </strong>
          </td>

          <td>
            ${esc(
              schedule.course || '—'
            )}
          </td>

          <td>
            ${esc(
              schedule.duration_minutes || 30
            )} min
          </td>

          <td>
            <span class="pill ${statusClass(status)}">
              ${esc(
                statusText(status)
              )}
            </span>
          </td>

          <td>
            <div class="action-group">
              ${actions}
            </div>
          </td>

        </tr>
        `;

      }
    ).join('')
  );
}


/* =========================
   TEACHER START CLASS
========================= */

window.teacherStartClass =
async(scheduleId)=>{

  const g =
    await guard('teacher');

  if(!g) return;


  const uid =
    g.s.user.id;


  const sr =
    await db
      .from('class_schedules')
      .select(`
        id,
        teacher_id,
        student_id,
        class_time,
        duration_minutes,
        active
      `)
      .eq('id',scheduleId)
      .eq('teacher_id',uid)
      .eq('active',true)
      .single();


  if(sr.error || !sr.data){

    alert(
      'Class schedule not found.'
    );

    return;
  }


  const schedule =
    sr.data;


  if(!canTeacherActivate(schedule)){

    alert(
      'Class can be activated only 5 minutes before the scheduled time.'
    );

    return;
  }


  const today =
    todayISO();

  const now =
    new Date().toISOString();


  const existing =
    await db
      .from('teacher_class_sessions')
      .select('id,status')
      .eq('schedule_id',scheduleId)
      .eq('teacher_id',uid)
      .eq('class_date',today)
      .maybeSingle();


  if(existing.error){

    alert(
      existing.error.message
    );

    return;
  }


  let result;


  if(existing.data){

    result =
      await db
        .from('teacher_class_sessions')
        .update({

          status:'active',

          started_at:now,

          updated_at:now

        })
        .eq(
          'id',
          existing.data.id
        )
        .eq(
          'teacher_id',
          uid
        );

  }else{

    result =
      await db
        .from('teacher_class_sessions')
        .insert({

          schedule_id:
            scheduleId,

          teacher_id:
            uid,

          student_id:
            schedule.student_id,

          class_date:
            today,

          status:
            'active',

          started_at:
            now,

          updated_at:
            now

        });
  }


  if(result.error){

    alert(
      result.error.message
    );

    return;
  }


  location.reload();
};


/* =========================
   TEACHER END CLASS
========================= */

window.teacherEndClass =
async(scheduleId)=>{

  const g =
    await guard('teacher');

  if(!g) return;


  const r =
    await db
      .from('teacher_class_sessions')
      .update({

        status:'completed',

        completed_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString()

      })
      .eq(
        'schedule_id',
        scheduleId
      )
      .eq(
        'teacher_id',
        g.s.user.id
      )
      .eq(
        'class_date',
        todayISO()
      );


  if(r.error){

    alert(
      r.error.message
    );

    return;
  }


  location.reload();
};


/* =========================
   TEACHER MARK ABSENT
========================= */

window.teacherMarkAbsent =
async(scheduleId)=>{

  const g =
    await guard('teacher');

  if(!g) return;


  if(
    !confirm(
      'Mark this student absent for today’s class?'
    )
  )
    return;


  const today =
    todayISO();


  const existing =
    await db
      .from('teacher_class_sessions')
      .select('id')
      .eq(
        'schedule_id',
        scheduleId
      )
      .eq(
        'teacher_id',
        g.s.user.id
      )
      .eq(
        'class_date',
        today
      )
      .maybeSingle();


  if(existing.error){

    alert(
      existing.error.message
    );

    return;
  }


  let r;


  if(existing.data){

    r =
      await db
        .from('teacher_class_sessions')
        .update({

          status:'absent',

          updated_at:
            new Date().toISOString()

        })
        .eq(
          'id',
          existing.data.id
        )
        .eq(
          'teacher_id',
          g.s.user.id
        );

  }else{

    const sr =
      await db
        .from('class_schedules')
        .select('student_id')
        .eq(
          'id',
          scheduleId
        )
        .eq(
          'teacher_id',
          g.s.user.id
        )
        .single();


    if(sr.error || !sr.data){

      alert(
        'Class schedule not found.'
      );

      return;
    }


    r =
      await db
        .from('teacher_class_sessions')
        .insert({

          schedule_id:
            scheduleId,

          teacher_id:
            g.s.user.id,

          student_id:
            sr.data.student_id,

          class_date:
            today,

          status:
            'absent',

          updated_at:
            new Date().toISOString()

        });
  }


  if(r.error){

    alert(
      r.error.message
    );

    return;
  }


  location.reload();
};


/* =========================
   TEACHER DATA
========================= */

async function teacherData(){

  const g =
    await guard('teacher');

  if(!g) return;


  /* =========================
     DASHBOARD
========================= */

  if(page === 'teacher-dashboard'){

    await loadTeacherDashboard(g);


    setInterval(
      async()=>{

        const current =
          await db.auth.getSession();

        if(
          !current.data.session
        )
          return;


        await loadTeacherDashboard({

          s:
            current.data.session,

          p:
            g.p

        });

      },
      15000
    );

    return;
  }


  const uid =
    g.s.user.id;


  /* =========================
     TEACHER SCHEDULE
========================= */

  if(page === 'teacher-schedule'){

    const r =
      await db
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
        .order(
          'class_time',
          {ascending:true}
        );


    const data =
      r.data || [];


    const studentIds = [
      ...new Set(
        data.map(
          x=>x.student_id
        )
      )
    ];


    let studentMap = {};


    if(studentIds.length){

      const sr =
        await db
          .from('students')
          .select(
            'id,full_name'
          )
          .in(
            'id',
            studentIds
          );


      (sr.data || [])
        .forEach(s=>{
          studentMap[s.id] = s;
        });
    }


    set(
      'scheduleRows',

      data.map(x=>`

        <tr>

          <td>
            ${esc(
              normalizeDays(
                x.class_days
              ).join(', ')
            )}
          </td>

          <td>
            ${esc(
              studentMap[
                x.student_id
              ]?.full_name ||
              'Student'
            )}
          </td>

          <td>
            ${esc(
              x.course || '—'
            )}
          </td>

          <td>
            ${esc(
              formatTime12(
                x.class_time
              )
            )}
          </td>

          <td>
            ${esc(
              x.duration_minutes || 30
            )} min
          </td>

          <td>
            <span class="pill">
              Active
            </span>
          </td>

        </tr>

      `).join('') ||
      rowEmpty(6)
    );

    return;
  }


  /* =========================
     TEACHER STUDENTS
========================= */

  if(page === 'teacher-students'){

    const r =
      await db
        .from('class_schedules')
        .select(
          'student_id'
        )
        .eq(
          'teacher_id',
          uid
        )
        .eq(
          'active',
          true
        );


    const ids = [
      ...new Set(
        (r.data || [])
          .map(
            x=>x.student_id
          )
      )
    ];


    if(!ids.length){

      set(
        'studentRows',
        rowEmpty(3)
      );

      return;
    }


    const sr =
      await db
        .from('students')
        .select(
          'id,full_name,status'
        )
        .in(
          'id',
          ids
        );


    set(
      'studentRows',

      (sr.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(x.full_name)}
            </td>

            <td>
              ${esc(
                x.status || 'Active'
              )}
            </td>

            <td>
              ${esc(x.id)}
            </td>

          </tr>

        `).join('') ||
        rowEmpty(3)
    );

    return;
  }


  /* =========================
     TEACHER COURSES
========================= */

  if(page === 'teacher-courses'){

    const r =
      await db
        .from('class_schedules')
        .select('course')
        .eq(
          'teacher_id',
          uid
        )
        .eq(
          'active',
          true
        );


    const courses = [
      ...new Set(
        (r.data || [])
          .map(
            x=>x.course
          )
          .filter(Boolean)
      )
    ];


    set(
      'courseRows',

      courses.map(x=>`

        <tr>
          <td>
            ${esc(x)}
          </td>
        </tr>

      `).join('') ||
      rowEmpty(1)
    );

    return;
  }


  /* =========================
     TEACHER LEAVES
========================= */

  if(page === 'teacher-leaves'){

    const r =
      await db
        .from('leaves')
        .select('*')
        .eq(
          'user_id',
          uid
        )
        .order(
          'created_at',
          {ascending:false}
        );


    set(
      'leaveRows',

      (r.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(x.start_date)}
            </td>

            <td>
              ${esc(x.end_date)}
            </td>

            <td>
              ${esc(x.reason)}
            </td>

            <td>
              <span class="pill">
                ${esc(x.status)}
              </span>
            </td>

          </tr>

        `).join('') ||
        rowEmpty(4)
    );


    document
      .getElementById('leaveForm')
      ?.addEventListener(
        'submit',
        async e=>{

          e.preventDefault();


          const f =
            new FormData(
              e.target
            );


          const r =
            await db
              .from('leaves')
              .insert({

                user_id:
                  uid,

                role:
                  'teacher',

                start_date:
                  f.get(
                    'start_date'
                  ),

                end_date:
                  f.get(
                    'end_date'
                  ),

                reason:
                  f.get(
                    'reason'
                  )

              });


          if(r.error)
            alert(
              r.error.message
            );
          else
            location.reload();

        }
      );

    return;
  }


  /* =========================
     TEACHER SALARY
========================= */

  if(page === 'teacher-salary'){

    const r =
      await db
        .from('teacher_salaries')
        .select('*')
        .eq(
          'teacher_id',
          uid
        )
        .order(
          'salary_month',
          {ascending:false}
        );


    set(
      'salaryRows',

      (r.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(x.salary_month)}
            </td>

            <td>
              ${esc(x.amount)}
              ${esc(x.currency)}
            </td>

            <td>
              <span class="pill">
                ${esc(x.status)}
              </span>
            </td>

            <td>
              ${esc(
                x.paid_at || ''
              )}
            </td>

          </tr>

        `).join('') ||
        rowEmpty(4)
    );

    return;
  }


  /* =========================
     TEACHER PROFILE
========================= */

  if(page === 'teacher-profile'){

    set(
      'profileName',
      esc(
        g.p.full_name || ''
      )
    );


    set(
      'profileEmail',
      esc(
        g.s.user.email || ''
      )
    );


    document
      .getElementById('profileForm')
      ?.addEventListener(
        'submit',
        async e=>{

          e.preventDefault();


          const f =
            new FormData(
              e.target
            );


          const r =
            await db.rpc(
              'update_my_profile',
              {
                p_full_name:
                  f.get(
                    'full_name'
                  )
              }
            );


          if(r.error)
            alert(
              r.error.message
            );
          else
            alert(
              'Profile updated.'
            );

        }
      );
  }
}


/* =====================================================
   FIND CURRENT STUDENT
===================================================== */

async function getCurrentStudent(){

  const g =
    await guard('student');

  if(!g)
    return null;


  const uid =
    g.s.user.id;


  /*
    IMPORTANT:

    Auth user ID is NOT the same as students.id.

    Correct relation:

    auth.users.id
          ↓
    students.user_id
          ↓
    students.id
          ↓
    class_schedules.student_id
  */


  const r =
    await db
      .from('students')
      .select(`
        id,
        user_id,
        full_name,
        status
      `)
      .eq(
        'user_id',
        uid
      )
      .maybeSingle();


  if(r.error){

    console.error(
      'Student lookup error:',
      r.error
    );

    return null;
  }


  if(!r.data){

    console.error(
      'No student record linked with this login.'
    );

    return null;
  }


  return {
    authUserId:uid,
    student:r.data,
    guard:g
  };
}


/* =========================
   STUDENT JOIN CLASS
========================= */

window.studentJoinClass =
async(scheduleId,meetUrl)=>{

  const current =
    await getCurrentStudent();


  if(!current){

    alert(
      'Your student account is not linked with this login.'
    );

    return;
  }


  const studentId =
    current.student.id;


  const today =
    todayISO();


  const now =
    new Date().toISOString();


  /* FIND TODAY SESSION */

  const existing =
    await db
      .from('teacher_class_sessions')
      .select(
        'id,status'
      )
      .eq(
        'schedule_id',
        scheduleId
      )
      .eq(
        'student_id',
        studentId
      )
      .eq(
        'class_date',
        today
      )
      .maybeSingle();


  if(existing.error){

    alert(
      existing.error.message
    );

    return;
  }


  if(!existing.data){

    alert(
      'Teacher has not activated this class yet.'
    );

    return;
  }


  /* UPDATE STUDENT JOIN */

  const r =
    await db
      .from('teacher_class_sessions')
      .update({

        status:
          'student_joined',

        student_joining_at:
          now,

        updated_at:
          now

      })
      .eq(
        'id',
        existing.data.id
      )
      .eq(
        'student_id',
        studentId
      );


  if(r.error){

    alert(
      r.error.message
    );

    return;
  }


  /* OPEN GOOGLE MEET */

  if(meetUrl){

    window.open(
      meetUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }

};


/* =====================================================
   STUDENT DATA
===================================================== */

async function studentData(){

  const current =
    await getCurrentStudent();


  if(!current)
    return;


  const g =
    current.guard;


  const uid =
    current.authUserId;


  const student =
    current.student;


  const studentId =
    student.id;


  /*
    Display student name everywhere.
  */

  document
    .querySelectorAll('[data-name]')
    .forEach(x=>{

      x.textContent =
        student.full_name ||
        g.p.full_name ||
        g.s.user.email;

    });


  /* ===================================================
     DASHBOARD / SCHEDULE / CLASSES
  =================================================== */

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

      /* COURSES */

      db
        .from('student_enrollments')
        .select(
          '*,courses(title)'
        )
        .eq(
          'student_id',
          studentId
        ),


      /* SCHEDULE */

      db
        .from('class_schedules')
        .select(`
          *,
          teacher:profiles!class_schedules_teacher_id_fkey(full_name)
        `)
        .eq(
          'student_id',
          studentId
        )
        .eq(
          'active',
          true
        )
        .order(
          'class_time'
        ),


      /* ATTENDANCE */

      db
        .from('attendance')
        .select('status')
        .eq(
          'student_id',
          studentId
        ),


      /* PAYMENTS */

      db
        .from('student_payments')
        .select('*')
        .eq(
          'student_id',
          studentId
        )
        .order(
          'created_at',
          {ascending:false}
        ),


      /* NOTIFICATIONS */

      db
        .from('notifications')
        .select('*')
        .eq(
          'user_id',
          uid
        )
        .order(
          'created_at',
          {ascending:false}
        ),


      /* CERTIFICATES */

      db
        .from('certificates')
        .select(
          '*,courses(title)'
        )
        .eq(
          'student_id',
          studentId
        )
        .order(
          'issued_at',
          {ascending:false}
        )

    ]);


    /* ERROR LOGS */

    if(e.error)
      console.error(
        'Enrollments:',
        e.error
      );

    if(s.error)
      console.error(
        'Schedules:',
        s.error
      );

    if(a.error)
      console.error(
        'Attendance:',
        a.error
      );

    if(p.error)
      console.error(
        'Payments:',
        p.error
      );

    if(n.error)
      console.error(
        'Notifications:',
        n.error
      );

    if(c.error)
      console.error(
        'Certificates:',
        c.error
      );


    /* COURSE COUNT */

    set(
      'courseCount',
      e.data?.length || 0
    );


    /* CLASS COUNT */

    set(
      'classCount',
      s.data?.length || 0
    );


    /* ATTENDANCE */

    set(
      'attendanceRate',

      a.data?.length
      ? Math.round(
          a.data.filter(
            x=>x.status === 'present'
          ).length /
          a.data.length *
          100
        ) + '%'

      : '—'
    );


    /* =========================
       PAYMENT ROWS
    ========================= */

    set(
      'paymentRows',

      (p.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(x.amount)}
              ${esc(
                x.currency || ''
              )}
            </td>

            <td>
              ${esc(
                x.method
              )}
            </td>

            <td>
              ${esc(
                x.status
              )}
            </td>

            <td>
              ${esc(
                x.created_at?.slice(0,10)
              )}
            </td>

          </tr>

        `).join('') ||
        rowEmpty(4)
    );


    /* =================================================
       STUDENT SCHEDULE + JOIN BUTTON
    ================================================= */

    set(
      'scheduleRows',

      (s.data || [])
        .map(x=>{

          const meetUrl =
            x.google_meet_url ||
            '';


          const joinButton =
            meetUrl
            ? `
              <a
                class="btn-small"
                href="#"
                onclick="studentJoinClass(
                  ${JSON.stringify(x.id)},
                  ${JSON.stringify(meetUrl)}
                );return false;">
                Join
              </a>
            `
            : '—';


          return `
          <tr>

            <td>
              ${esc(
                normalizeDays(
                  x.class_days
                ).join(', ')
              )}
            </td>

            <td>
              ${esc(
                formatTime12(
                  x.class_time
                )
              )}
            </td>

            <td>
              ${esc(
                x.course || ''
              )}
            </td>

            <td>
              ${esc(
                x.teacher?.full_name ||
                ''
              )}
            </td>

            <td>
              ${joinButton}
            </td>

            <td>
              ${
                x.active
                ? 'Active'
                : 'Inactive'
              }
            </td>

          </tr>
          `;

        }).join('') ||
        rowEmpty(6)
    );


    /* =========================
       COURSES
    ========================= */

    set(
      'courseRows',

      (e.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(
                x.courses?.title || ''
              )}
            </td>

            <td>
              ${esc(
                x.status
              )}
            </td>

            <td>
              ${x.progress || 0}%
            </td>

          </tr>

        `).join('') ||
        rowEmpty(3)
    );


    /* =========================
       NOTIFICATIONS
    ========================= */

    set(
      'notificationRows',

      (n.data || [])
        .map(x=>`

          <div class="card">

            <b>
              ${esc(x.title)}
            </b>

            <p>
              ${esc(x.body)}
            </p>

          </div>

        `).join('') ||

      '<p class="empty">No notifications.</p>'
    );


    /* =========================
       CERTIFICATES
    ========================= */

    set(
      'certRows',

      (c.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(
                x.courses?.title || ''
              )}
            </td>

            <td>
              ${esc(
                x.certificate_no || ''
              )}
            </td>

            <td>
              ${esc(
                x.issued_at || ''
              )}
            </td>

          </tr>

        `).join('') ||
        rowEmpty(3)
    );


    return;
  }


  /* ===================================================
     STUDENT ATTENDANCE
  =================================================== */

  if(page === 'student-attendance'){

    const r =
      await db
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
        .eq(
          'student_id',
          studentId
        )
        .order(
          'created_at',
          {ascending:false}
        );


    if(r.error){

      set(
        'attendanceRows',
        rowEmpty(
          4,
          r.error.message
        )
      );

      return;
    }


    set(
      'attendanceRows',

      (r.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(
                normalizeDays(
                  x.class_schedules?.class_days
                ).join(', ')
              )}
            </td>

            <td>
              ${esc(
                x.class_schedules?.course ||
                ''
              )}
            </td>

            <td>
              ${esc(
                x.status
              )}
            </td>

            <td>
              ${esc(
                x.notes || ''
              )}
            </td>

          </tr>

        `).join('') ||
        rowEmpty(4)
    );

    return;
  }


  /* ===================================================
     STUDENT FEES
  =================================================== */

  if(page === 'student-fees'){

    const r =
      await db
        .from('student_payments')
        .select('*')
        .eq(
          'student_id',
          studentId
        )
        .order(
          'created_at',
          {ascending:false}
        );


    if(r.error){

      set(
        'paymentRows',
        rowEmpty(
          5,
          r.error.message
        )
      );

      return;
    }


    set(
      'paymentRows',

      (r.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(x.amount)}
              ${esc(
                x.currency || ''
              )}
            </td>

            <td>
              ${esc(
                x.method
              )}
            </td>

            <td>
              ${esc(
                x.status
              )}
            </td>

            <td>
              ${esc(
                x.reference || ''
              )}
            </td>

            <td>
              ${esc(
                x.created_at?.slice(0,10)
              )}
            </td>

          </tr>

        `).join('') ||
        rowEmpty(5)
    );

    return;
  }


  /* ===================================================
     STUDENT LEAVES
  =================================================== */

  if(page === 'student-leaves'){

    const r =
      await db
        .from('leaves')
        .select('*')
        .eq(
          'user_id',
          uid
        )
        .order(
          'created_at',
          {ascending:false}
        );


    set(
      'leaveRows',

      (r.data || [])
        .map(x=>`

          <tr>

            <td>
              ${esc(
                x.start_date
              )}
            </td>

            <td>
              ${esc(
                x.end_date
              )}
            </td>

            <td>
              ${esc(
                x.reason
              )}
            </td>

            <td>
              ${esc(
                x.status
              )}
            </td>

          </tr>

        `).join('') ||
        rowEmpty(4)
    );


    document
      .getElementById('leaveForm')
      ?.addEventListener(
        'submit',
        async e=>{

          e.preventDefault();


          const f =
            new FormData(
              e.target
            );


          const r =
            await db
              .from('leaves')
              .insert({

                user_id:
                  uid,

                role:
                  'student',

                start_date:
                  f.get(
                    'start_date'
                  ),

                end_date:
                  f.get(
                    'end_date'
                  ),

                reason:
                  f.get(
                    'reason'
                  )

              });


          if(r.error)
            alert(
              r.error.message
            );
          else
            location.reload();

        }
      );

  }


  /* ===================================================
     STUDENT PROFILE
  =================================================== */

  if(page === 'student-profile'){

    set(
      'profileName',
      esc(
        student.full_name ||
        g.p.full_name ||
        ''
      )
    );


    set(
      'profileEmail',
      esc(
        g.s.user.email || ''
      )
    );


    document
      .getElementById('profileForm')
      ?.addEventListener(
        'submit',
        async e=>{

          e.preventDefault();


          const f =
            new FormData(
              e.target
            );


          const r =
            await db.rpc(
              'update_my_profile',
              {
                p_full_name:
                  f.get(
                    'full_name'
                  )
              }
            );


          if(r.error)
            alert(
              r.error.message
            );
          else
            alert(
              'Profile updated.'
            );

        }
      );
  }
}


/* =========================
   START APP
========================= */

if(
  page?.startsWith('teacher-')
)
  teacherData();


if(
  page?.startsWith('student-')
)
  studentData();

})();
