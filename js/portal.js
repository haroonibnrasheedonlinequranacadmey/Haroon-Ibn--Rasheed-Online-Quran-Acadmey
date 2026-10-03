(()=>{

"use strict";


/* =====================================================
   SUPABASE
===================================================== */

const cfg = window.SUPABASE_CONFIG || {};
const db = window.supabase?.createClient(cfg.url,cfg.anonKey);

window.academyDB = db;


/* =====================================================
   GLOBAL TIMEZONE
===================================================== */

/*
  Admin schedules are created in Pakistan time.

  Teacher/student timezones come automatically
  from their database records.

  IANA timezone names are used so DST and
  all supported countries are handled correctly.
*/

const DEFAULT_TIMEZONE = "Asia/Karachi";

const LUXON =
  window.luxon?.DateTime
    ? window.luxon
    : null;


window.ACADEMY_DEFAULT_TIMEZONE =
  DEFAULT_TIMEZONE;


/* =====================================================
   ESCAPE
===================================================== */

const esc = v =>
  String(v ?? '').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));


/* =====================================================
   PAGE DETECTION
   -----------------------------------------------------
   The URL is the source of truth for portal type.
   This prevents a wrong/missing data-page value from
   making a Teacher page run Student code.
===================================================== */

function detectPortalPage(){

  const bodyPage =
    String(
      document.body?.dataset?.page || ''
    ).trim().toLowerCase();

  const path =
    String(
      window.location.pathname || ''
    ).toLowerCase();

  const file =
    path
      .split('/')
      .pop()
      .replace(/\.html$/,'')
      .trim();

  const inTeacher =
    path.includes('/teacher/');

  const inStudent =
    path.includes('/student/');

  if(inTeacher){

    const teacherPages = {
      dashboard:'teacher-dashboard',
      students:'teacher-students',
      classes:'teacher-classes',
      schedule:'teacher-schedule',
      attendance:'teacher-attendance',
      courses:'teacher-courses',
      leaves:'teacher-leaves',
      salary:'teacher-salary',
      profile:'teacher-profile'
    };

    return (
      teacherPages[file] ||
      (
        bodyPage.startsWith('teacher-')
          ? bodyPage
          : 'teacher-' + file
      );
  }

  if(inStudent){

    const studentPages = {
      dashboard:'student-dashboard',
      students:'student-students',
      classes:'student-classes',
      schedule:'student-schedule',
      attendance:'student-attendance',
      courses:'student-courses',
      leaves:'student-leaves',
      profile:'student-profile'
    };

    return (
      studentPages[file] ||
      (
        bodyPage.startsWith('student-')
          ? bodyPage
          : 'student-' + file
      );
  }

  return bodyPage;
}

const page = detectPortalPage();


/* =====================================================
   SESSION
===================================================== */

async function session(){

  const r =
    await db.auth.getSession();

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


/* =====================================================
   PROFILE
===================================================== */

async function profile(uid){

  const r =
    await db
      .from('profiles')
      .select('*')
      .eq('id',uid)
      .single();

  return r.data;
}


/* =====================================================
   GUARD
===================================================== */

async function guard(role){

  const s =
    await session();

  if(!s) return;

  const p =
    await profile(s.user.id);

  const actualRole =
    String(
      p?.role || ''
    ).trim().toLowerCase();

  const requiredRole =
    String(
      role || ''
    ).trim().toLowerCase();

  if(!p || actualRole !== requiredRole){

    console.error(
      'Portal role mismatch:',
      {
        requiredRole,
        actualRole,
        page,
        userId:s.user.id
      }
    );

    location.href =
      '../portal-login.html';

    return;
  }

  document
    .querySelectorAll('[data-name]')
    .forEach(x=>{

      x.textContent =
        p.full_name ||
        s.user.email;

    });

  return {
    s,
    p
  };
}


/* =====================================================
   LOGOUT
===================================================== */

window.portalLogout =
async()=>{

  await db.auth.signOut();

  location.href =
    page === 'admin'
    ? 'login.html'
    : '../portal-login.html';
};


/* =====================================================
   HELPERS
===================================================== */

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


/* =====================================================
   DATE / TIME
===================================================== */

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

  const d =
    new Date();

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

  return new Date()
    .toLocaleDateString(
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

  let h =
    +p[0];

  const m =
    p[1] || '00';

  const a =
    h >= 12
    ? 'PM'
    : 'AM';

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


/* =====================================================
   TIMEZONE HELPERS
===================================================== */

function safeTimezone(zone){

  if(!zone)
    return DEFAULT_TIMEZONE;

  if(!LUXON)
    return DEFAULT_TIMEZONE;

  try{

    const test =
      LUXON.DateTime.now()
        .setZone(zone);

    if(test.isValid)
      return zone;

  }catch(e){}

  return DEFAULT_TIMEZONE;
}


function getNowInZone(zone){

  if(!LUXON)
    return new Date();

  return LUXON.DateTime
    .now()
    .setZone(
      safeTimezone(zone)
    );
}


function isoDateInZone(zone){

  if(!LUXON)
    return todayISO();

  return getNowInZone(zone)
    .toFormat('yyyy-MM-dd');
}


function weekdayInZone(zone){

  if(!LUXON)
    return todayName();

  return getNowInZone(zone)
    .toFormat('cccc');
}


function scheduleDateTime(
  date,
  time,
  scheduleTimezone
){

  if(!LUXON)
    return null;

  const zone =
    safeTimezone(
      scheduleTimezone ||
      DEFAULT_TIMEZONE
    );

  const dt =
    LUXON.DateTime.fromISO(
      `${date}T${time}`,
      {
        zone
      }
    );

  return dt.isValid
    ? dt
    : null;
}


/*
  Convert one scheduled occurrence from
  the admin/base timezone into the viewer timezone.
*/

function convertScheduleOccurrence(
  date,
  time,
  scheduleTimezone,
  viewerTimezone
){

  const source =
    scheduleDateTime(
      date,
      time,
      scheduleTimezone
    );

  if(!source)
    return null;

  const targetZone =
    safeTimezone(
      viewerTimezone ||
      DEFAULT_TIMEZONE
    );

  return source.setZone(
    targetZone
  );
}


window.convertScheduleOccurrence =
  convertScheduleOccurrence;


/*
  Find the base/schedule date which produces
  the requested viewer date.

  We check nearby dates because a class can
  move to the previous/next day after timezone
  conversion.
*/

function findOccurrenceForViewerDate(
  schedule,
  viewerDate,
  viewerTimezone
){

  const days =
    normalizeDays(
      schedule.class_days
    ).map(x=>x.toLowerCase());

  if(!days.length)
    return null;


  const baseZone =
    schedule.schedule_timezone ||
    DEFAULT_TIMEZONE;


  const target =
    LUXON
      ? LUXON.DateTime.fromISO(
          viewerDate,
          {
            zone:safeTimezone(
              viewerTimezone ||
              DEFAULT_TIMEZONE
            )
          }
        )
      : null;


  if(!target)
    return null;


  /*
    Check 3 days before through 3 days after.
    This safely handles date rollover.
  */

  for(let offset=-3; offset<=3; offset++){

    const baseDate =
      target
        .setZone(
          safeTimezone(baseZone)
        )
        .plus({
          days:offset
        })
        .toFormat(
          'yyyy-MM-dd'
        );


    const baseDt =
      LUXON.DateTime.fromISO(
        `${baseDate}T${schedule.class_time}`,
        {
          zone:safeTimezone(baseZone)
        }
      );


    if(!baseDt.isValid)
      continue;


    const baseDay =
      baseDt.toFormat('cccc')
        .toLowerCase();


    if(!days.includes(baseDay))
      continue;


    const converted =
      baseDt.setZone(
        safeTimezone(
          viewerTimezone ||
          DEFAULT_TIMEZONE
        )
      );


    if(
      converted.toFormat(
        'yyyy-MM-dd'
      ) === viewerDate
    ){

      return {
        baseDate,
        baseDateTime:baseDt,
        viewerDateTime:converted
      };
    }
  }


  return null;
}


window.findOccurrenceForViewerDate =
  findOccurrenceForViewerDate;


/*
  Get today's occurrence for a viewer.
*/

function getTodayOccurrence(
  schedule,
  viewerTimezone
){

  const date =
    isoDateInZone(
      viewerTimezone
    );

  return findOccurrenceForViewerDate(
    schedule,
    date,
    viewerTimezone
  );
}


window.getTodayOccurrence =
  getTodayOccurrence;


/*
  Format a scheduled occurrence for
  the viewer's timezone.
*/

function formatOccurrenceTime(
  occurrence
){

  if(!occurrence)
    return '';

  return occurrence
    .viewerDateTime
    .toFormat('h:mm a');
}


function formatOccurrenceDate(
  occurrence
){

  if(!occurrence)
    return '';

  return occurrence
    .viewerDateTime
    .toFormat(
      'EEE, dd LLL yyyy'
    );
}


/*
  Get viewer's current date/time.
*/

function viewerNow(timezone){

  return getNowInZone(
    timezone ||
    DEFAULT_TIMEZONE
  );
}


/* =====================================================
   TEACHER TIMEZONE
===================================================== */

async function getTeacherTimezone(
  teacherId
){

  const r =
    await db
      .from('teachers')
      .select('timezone')
      .eq('id',teacherId)
      .maybeSingle();

  if(
    r.data?.timezone
  )
    return safeTimezone(
      r.data.timezone
    );


  return DEFAULT_TIMEZONE;
}


/* =====================================================
   STUDENT TIMEZONE
===================================================== */

async function getStudentTimezone(
  studentId
){

  const r =
    await db
      .from('students')
      .select('timezone')
      .eq('id',studentId)
      .maybeSingle();

  if(
    r.data?.timezone
  )
    return safeTimezone(
      r.data.timezone
    );


  return DEFAULT_TIMEZONE;
}


/* =====================================================
   IS TODAY
===================================================== */

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


/*
  Timezone-aware today check.

  This is used by teacher/student portals.
*/

function isViewerToday(
  schedule,
  viewerTimezone
){

  return !!getTodayOccurrence(
    schedule,
    viewerTimezone
  );
}


/* =====================================================
   STATUS
===================================================== */

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

  return map[
    status
  ] || 'Upcoming';
}


/* =====================================================
   TEACHER CURRENT TIME
===================================================== */

function nowMinutes(){

  const d =
    new Date();

  return (
    d.getHours()*60 +
    d.getMinutes()
  );
}


/*
  Timezone-aware current minutes.
*/

function nowMinutesInZone(
  timezone
){

  const dt =
    viewerNow(timezone);

  return (
    dt.hour * 60 +
    dt.minute
  );
}


/* =====================================================
   TEACHER ACTIVATION
===================================================== */

function canTeacherActivate(
  schedule,
  teacherTimezone
){

  const timezone =
    safeTimezone(
      teacherTimezone ||
      schedule.teacher_timezone ||
      DEFAULT_TIMEZONE
    );


  /*
    Find today's occurrence in the teacher's
    timezone.
  */

  const occurrence =
    getTodayOccurrence(
      schedule,
      timezone
    );


  if(!occurrence)
    return false;


  const now =
    viewerNow(timezone);


  const start =
    occurrence.viewerDateTime;


  const duration =
    +schedule.duration_minutes ||
    30;


  const end =
    start.plus({
      minutes:duration
    });


  return (
    now >= start.minus({
      minutes:5
    }) &&
    now < end
  );
}


/* =====================================================
   AUTOMATIC STATUS
===================================================== */

function getAutomaticStatus(
  schedule,
  savedStatus,
  viewerTimezone
){

  if(savedStatus)
    return savedStatus;


  const timezone =
    safeTimezone(
      viewerTimezone ||
      schedule.teacher_timezone ||
      DEFAULT_TIMEZONE
    );


  const occurrence =
    getTodayOccurrence(
      schedule,
      timezone
    );


  if(!occurrence)
    return 'upcoming';


  const now =
    viewerNow(timezone);


  const start =
    occurrence.viewerDateTime;


  const end =
    start.plus({
      minutes:
        +schedule.duration_minutes ||
        30
    });


  if(
    now <
    start.minus({
      minutes:5
    })
  )
    return 'upcoming';


  if(now < end)
    return 'upcoming';


  return 'late';
}


/* =====================================================
   TEACHER SESSION
===================================================== */

async function getTodaySessions(
  teacherId,
  teacherTimezone
){

  const date =
    isoDateInZone(
      teacherTimezone
    );


  /*
    Sessions store class_date in the
    admin/base schedule timezone.

    We therefore find today's viewer
    occurrence first, then query using
    its base date.
  */

  const scheduleResult =
    await db
      .from('class_schedules')
      .select(`
        id,
        class_days,
        class_time,
        schedule_timezone
      `)
      .eq(
        'teacher_id',
        teacherId
      )
      .eq(
        'active',
        true
      );


  if(scheduleResult.error)
    return [];


  const baseDates = {};


  (scheduleResult.data || [])
    .forEach(schedule=>{

      const occurrence =
        findOccurrenceForViewerDate(
          schedule,
          date,
          teacherTimezone
        );


      if(occurrence){

        baseDates[
          occurrence.baseDate
        ] = true;
      }

    });


  const dates =
    Object.keys(baseDates);


  if(!dates.length)
    return [];


  const results = [];


  for(
    const baseDate
    of dates
  ){

    const r =
      await db
        .from('teacher_class_sessions')
        .select('*')
        .eq(
          'teacher_id',
          teacherId
        )
        .eq(
          'class_date',
          baseDate
        );


    if(!r.error)
      results.push(
        ...(r.data || [])
      );
  }


  return results;
}


/* =====================================================
   ENSURE TODAY SESSION
===================================================== */

async function ensureTodaySession(
  schedule,
  teacherId,
  teacherTimezone
){

  const occurrence =
    getTodayOccurrence(
      schedule,
      teacherTimezone
    );


  if(!occurrence)
    return null;


  const baseDate =
    occurrence.baseDate;


  const existing =
    await db
      .from('teacher_class_sessions')
      .select('*')
      .eq(
        'schedule_id',
        schedule.id
      )
      .eq(
        'teacher_id',
        teacherId
      )
      .eq(
        'class_date',
        baseDate
      )
      .maybeSingle();


  if(existing.data)
    return existing.data;


  const initial =
    getAutomaticStatus(
      schedule,
      null,
      teacherTimezone
    );


  /*
    scheduled_at is stored as an absolute
    timestamp when the column exists.
  */

  const scheduledAt =
    occurrence
      .baseDateTime
      .toUTC()
      .toISO();


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
          baseDate,

        status:
          initial,

        session_timezone:
          teacherTimezone,

        scheduled_at:
          scheduledAt

      })
      .select()
      .single();


  return insert.data || null;
}


/* =====================================================
   TEACHER DASHBOARD
===================================================== */

async function loadTeacherDashboard(g){

  const uid =
    g.s.user.id;


  /* =========================
     TEACHER TIMEZONE
  ========================= */

  const teacherTimezone =
    await getTeacherTimezone(
      uid
    );


  window.currentTeacherTimezone =
    teacherTimezone;

  window.teacherTimezone =
    teacherTimezone;

  localStorage.setItem(
    'teacher_timezone',
    teacherTimezone
  );


  document.dispatchEvent(
    new CustomEvent(
      'teacherTimezoneReady',
      {
        detail:{
          timezone:
            teacherTimezone
        }
      }
    )
  );


  /*
    Teacher dashboard date is now
    teacher-local date.
  */

  const teacherNow =
    viewerNow(
      teacherTimezone
    );


  set(
    'dashboardDate',
    teacherNow.toLocaleString(
      {
        weekday:'long',
        year:'numeric',
        month:'long',
        day:'numeric'
      }
    )
  );


  /* =========================
     SCHEDULES
  ========================= */

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
        active,
        schedule_timezone
      `)
      .eq(
        'teacher_id',
        uid
      )
      .eq(
        'active',
        true
      )
      .order(
        'class_time',
        {
          ascending:true
        }
      );


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


  schedules.forEach(
    x=>{
      x.teacher_timezone =
        teacherTimezone;
    }
  );


  /* =========================
     STUDENT NAMES
  ========================= */

  const studentIds = [
    ...new Set(
      schedules
        .map(
          x=>x.student_id
        )
        .filter(Boolean)
    )
  ];


  let students = [];


  if(studentIds.length){

    const sr =
      await db
        .from('students')
        .select(
          'id,full_name,teacher_id,status,timezone'
        )
        .in(
          'id',
          studentIds
        );


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
    schedules.filter(
      schedule =>
        isViewerToday(
          schedule,
          teacherTimezone
        )
    );


  const todaySessions = [];


  for(
    const schedule
    of todaySchedules
  ){

    const s =
      await ensureTodaySession(
        schedule,
        uid,
        teacherTimezone
      );


    if(s)
      todaySessions.push(s);
``
     const sessionMap = {};

  todaySessions.forEach(
    s=>{
      sessionMap[
        s.schedule_id
      ] = s;
    }
  );


  /* =========================
     TODAY TABLE
  ========================= */

  const rows =
    todaySchedules.map(
      schedule=>{

        const student =
          studentMap[
            schedule.student_id
          ];

        const session =
          sessionMap[
            schedule.id
          ] || null;


        const occurrence =
          getTodayOccurrence(
            schedule,
            teacherTimezone
          );


        const status =
          getAutomaticStatus(
            schedule,
            session?.status,
            teacherTimezone
          );


        const meet =
          schedule.google_meet_url ||
          '';


        const classroom =
          classroomUrl(
            schedule
          );


        const studentName =
          student?.full_name ||
          'Student';


        const course =
          schedule.course ||
          'Quran';


        const duration =
          Number(
            schedule.duration_minutes ||
            30
          );


        const time =
          formatOccurrenceTime(
            occurrence
          );


        return `
          <tr
            data-schedule-id="${esc(schedule.id)}"
          >

            <td>
              <strong>
                ${esc(studentName)}
              </strong>
            </td>

            <td>
              ${esc(course)}
            </td>

            <td>
              ${esc(time)}
            </td>

            <td>
              ${esc(duration)} min
            </td>

            <td>
              <span
                class="class-status ${statusClass(status)}"
              >
                ${esc(statusText(status))}
              </span>
            </td>

            <td>

              ${
                meet
                ? `
                  <a
                    href="${esc(meet)}"
                    target="_blank"
                    rel="noopener"
                    class="join-class-btn"
                  >
                    Join Meet
                  </a>
                `
                : ''
              }

              ${
                classroom
                ? `
                  <a
                    href="${esc(classroom)}"
                    target="_blank"
                    rel="noopener"
                    class="join-class-btn"
                  >
                    Classroom
                  </a>
                `
                : ''
              }

            </td>

          </tr>
        `;

      }
    ).join('');


  set(
    'todayClassRows',
    rows ||
    rowEmpty(
      6,
      'No classes scheduled for today.'
    )
  );


  /* =========================
     SUMMARY COUNTERS
  ========================= */

  const totalClasses =
    todaySchedules.length;


  let activeClasses = 0;
  let lateClasses = 0;
  let completedClasses = 0;
  let upcomingClasses = 0;


  todaySchedules.forEach(
    schedule=>{

      const session =
        sessionMap[
          schedule.id
        ];


      const status =
        session?.status ||
        getAutomaticStatus(
          schedule,
          null,
          teacherTimezone
        );


      if(status === 'active')
        activeClasses++;


      if(status === 'late')
        lateClasses++;


      if(status === 'completed')
        completedClasses++;


      if(status === 'upcoming')
        upcomingClasses++;

    }
  );


  const classRate =
    totalClasses
      ? Math.round(
          (
            completedClasses /
            totalClasses
          ) * 100
        )
      : 0;


  set(
    'totalClasses',
    totalClasses
  );


  set(
    'activeClasses',
    activeClasses
  );


  set(
    'lateClasses',
    lateClasses
  );


  set(
    'upcomingClasses',
    upcomingClasses
  );


  set(
    'completedClasses',
    completedClasses
  );


  set(
    'classRate',
    `${classRate}%`
  );


  set(
    'todayClassCount',
    totalClasses
  );


  set(
    'todayClassesCount',
    totalClasses
  );


  /* =========================
     DASHBOARD MESSAGE
  ========================= */

  const message =
    totalClasses
      ? `${totalClasses} class${
          totalClasses === 1
            ? ''
            : 'es'
        } scheduled for today.`
      : 'No classes scheduled for today.';


  set(
    'todayClassesMessage',
    esc(message)
  );


  /* =========================
     SALARY
  ========================= */

  const salaryResult =
    await db
      .from('teacher_salaries')
      .select(
        'amount,currency'
      )
      .eq(
        'teacher_id',
        uid
      )
      .order(
        'created_at',
        {
          ascending:false
        }
      )
      .limit(1)
      .maybeSingle();


  if(
    !salaryResult.error &&
    salaryResult.data
  ){

    const amount =
      salaryResult.data.amount;

    const currency =
      salaryResult.data.currency ||
      'USD';


    set(
      'salaryAmount',
      `${currency} ${amount}`
    );

  }


  /* =========================
     NOTIFICATIONS
  ========================= */

  const notificationResult =
    await db
      .from('notifications')
      .select(
        'id'
      )
      .eq(
        'user_id',
        uid
      )
      .eq(
        'read',
        false
      );


  if(!notificationResult.error){

    set(
      'notificationCount',
      notificationResult.data?.length ||
      0
    );

  }


  /* =========================
     TIMEZONE DISPLAY
  ========================= */

  document
    .querySelectorAll(
      '[data-teacher-timezone]'
    )
    .forEach(
      el=>{
        el.textContent =
          teacherTimezone;
      }
    );


  document
    .querySelectorAll(
      '[data-current-time]'
    )
    .forEach(
      el=>{

        el.textContent =
          teacherNow.toFormat(
            'h:mm a'
          );

      }
    );


  /* =========================
     CLASS ACTIONS
  ========================= */

  document
    .querySelectorAll(
      '[data-start-class]'
    )
    .forEach(
      button=>{

        button.addEventListener(
          'click',
          async()=>{

            const scheduleId =
              button.dataset.startClass;


            const schedule =
              schedules.find(
                x =>
                  String(x.id) ===
                  String(scheduleId)
              );


            if(!schedule)
              return;


            const occurrence =
              getTodayOccurrence(
                schedule,
                teacherTimezone
              );


            if(!occurrence){

              alert(
                'This class is not scheduled for today.'
              );

              return;
            }


            const sessionResult =
              await db
                .from(
                  'teacher_class_sessions'
                )
                .upsert(
                  {
                    schedule_id:
                      schedule.id,

                    teacher_id:
                      uid,

                    student_id:
                      schedule.student_id,

                    class_date:
                      occurrence.baseDate,

                    session_timezone:
                      teacherTimezone,

                    scheduled_at:
                      occurrence
                        .baseDateTime
                        .toUTC()
                        .toISO(),

                    status:
                      'active',

                    started_at:
                      new Date()
                        .toISOString()
                  },
                  {
                    onConflict:
                      'schedule_id,class_date'
                  }
                )
                .select()
                .single();


            if(sessionResult.error){

              alert(
                sessionResult.error.message
              );

              return;
            }


            button.disabled =
              true;

            button.textContent =
              'Class Started';


            await loadTeacherDashboard(
              g
            );

          }
        );

      }
    );


  /* =========================
     END CLASS
  ========================= */

  document
    .querySelectorAll(
      '[data-end-class]'
    )
    .forEach(
      button=>{

        button.addEventListener(
          'click',
          async()=>{

            const scheduleId =
              button.dataset.endClass;


            const schedule =
              schedules.find(
                x =>
                  String(x.id) ===
                  String(scheduleId)
              );


            if(!schedule)
              return;


            const occurrence =
              getTodayOccurrence(
                schedule,
                teacherTimezone
              );


            if(!occurrence)
              return;


            const result =
              await db
                .from(
                  'teacher_class_sessions'
                )
                .update(
                  {
                    status:
                      'completed',

                    completed_at:
                      new Date()
                        .toISOString()
                  }
                )
                .eq(
                  'schedule_id',
                  schedule.id
                )
                .eq(
                  'class_date',
                  occurrence.baseDate
                )
                .eq(
                  'teacher_id',
                  uid
                );


            if(result.error){

              alert(
                result.error.message
              );

              return;
            }


            await loadTeacherDashboard(
              g
            );

          }
        );

      }
    );


  /* =========================
     JOIN CLASS
  ========================= */

  document
    .querySelectorAll(
      '[data-join-meet]'
    )
    .forEach(
      button=>{

        button.addEventListener(
          'click',
          ()=>{

            const url =
              button.dataset.joinMeet;

            if(url)
              window.open(
                url,
                '_blank',
                'noopener'
              );

          }
        );

      }
    );


  /* =========================
     COPY LINK
  ========================= */

  document
    .querySelectorAll(
      '[data-copy-link]'
    )
    .forEach(
      button=>{

        button.addEventListener(
          'click',
          async()=>{

            const value =
              button.dataset.copyLink;

            const ok =
              await copyText(
                value
              );


            if(ok){

              const old =
                button.textContent;

              button.textContent =
                'Copied';

              setTimeout(
                ()=>{
                  button.textContent =
                    old;
                },
                1200
              );

            }

          }
        );

      }
    );

}


/* =====================================================
   CLASSROOM URL
===================================================== */

function classroomUrl(schedule){

  if(
    !schedule ||
    !schedule.classroom_code
  )
    return '';


  return (
    'https://haroonibnrasheedonlinequranacadmey.github.io/' +
    'haroon-quran-classroom/?code=' +
    encodeURIComponent(
      schedule.classroom_code
    )
  );

}


/* =====================================================
   TEACHER STUDENTS
===================================================== */

async function teacherStudents(g){

  const uid =
    g.s.user.id;


  const result =
    await db
      .from('students')
      .select(`
        id,
        full_name,
        email,
        phone,
        status,
        teacher_id,
        timezone
      `)
      .eq(
        'teacher_id',
        uid
      )
      .order(
        'full_name',
        {
          ascending:true
        }
      );


  if(result.error){

    set(
      'studentsRows',
      rowEmpty(
        6,
        result.error.message
      )
    );

    return;
  }


  const students =
    result.data || [];


  if(!students.length){

    set(
      'studentsRows',
      rowEmpty(
        6,
        'No students assigned.'
      )
    );

    return;
  }


  set(
    'studentsRows',
    students.map(
      student=>`

        <tr>

          <td>
            ${esc(
              student.full_name ||
              'Student'
            )}
          </td>

          <td>
            ${esc(
              student.email || ''
            )}
          </td>

          <td>
            ${esc(
              student.phone || ''
            )}
          </td>

          <td>
            ${esc(
              student.timezone ||
              DEFAULT_TIMEZONE
            )}
          </td>

          <td>
            <span
              class="status-badge"
            >
              ${esc(
                student.status ||
                'active'
              )}
            </span>
          </td>

          <td>
            <a
              href="teacher-student.html?id=${encodeURIComponent(student.id)}"
            >
              View
            </a>
          </td>

        </tr>

      `
    ).join('')
  );

}


/* =====================================================
   TEACHER MY CLASSES
===================================================== */

async function teacherClasses(g){

  const uid =
    g.s.user.id;


  const teacherTimezone =
    await getTeacherTimezone(
      uid
    );


  const result =
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
        active,
        schedule_timezone
      `)
      .eq(
        'teacher_id',
        uid
      )
      .eq(
        'active',
        true
      )
      .order(
        'class_time',
        {
          ascending:true
        }
      );


  if(result.error){

    set(
      'classesRows',
      rowEmpty(
        7,
        result.error.message
      )
    );

    return;
  }


  const schedules =
    result.data || [];


  const ids =
    [
      ...new Set(
        schedules
          .map(
            x=>x.student_id
          )
          .filter(Boolean)
      )
    ];


  let studentMap = {};


  if(ids.length){

    const sr =
      await db
        .from('students')
        .select(
          'id,full_name,timezone'
        )
        .in(
          'id',
          ids
        );


    if(!sr.error){

      (sr.data || [])
        .forEach(
          s=>{
            studentMap[s.id] =
              s;
          }
        );

    }
  }


  if(!schedules.length){

    set(
      'classesRows',
      rowEmpty(
        7,
        'No classes found.'
      )
    );

    return;
  }


  set(
    'classesRows',
    schedules.map(
      schedule=>{

        const student =
          studentMap[
            schedule.student_id
          ];


        const occurrence =
          getTodayOccurrence(
            schedule,
            teacherTimezone
          );


        const days =
          normalizeDays(
            schedule.class_days
          ).join(', ');


        const meet =
          schedule.google_meet_url ||
          '';


        const classroom =
          classroomUrl(
            schedule
          );


        return `

          <tr>

            <td>
              ${esc(
                student?.full_name ||
                'Student'
              )}
            </td>

            <td>
              ${esc(
                schedule.course ||
                'Quran'
              )}
            </td>

            <td>
              ${esc(days)}
            </td>

            <td>
              ${esc(
                formatTime12(
                  schedule.class_time
                )
              )}
            </td>

            <td>
              ${esc(
                schedule.duration_minutes ||
                30
              )} min
            </td>

            <td>

              ${
                meet
                ? `
                  <a
                    href="${esc(meet)}"
                    target="_blank"
                    rel="noopener"
                  >
                    Join
                  </a>
                `
                : ''
              }

              ${
                classroom
                ? `
                  <a
                    href="${esc(classroom)}"
                    target="_blank"
                    rel="noopener"
                  >
                    Classroom
                  </a>
                `
                : ''
              }

            </td>

            <td>

              <button
                type="button"
                data-start-class="${esc(schedule.id)}"
              >
                Start
              </button>

              <button
                type="button"
                data-end-class="${esc(schedule.id)}"
              >
                Complete
              </button>

            </td>

          </tr>

        `;

      }
    ).join('')
  );


  /*
    Re-use dashboard actions for
    Start / Complete buttons when
    the page provides them.
  */

  document
    .querySelectorAll(
      '[data-start-class]'
    )
    .forEach(
      button=>{

        button.onclick =
          async()=>{

            const id =
              button.dataset.startClass;


            const schedule =
              schedules.find(
                x =>
                  String(x.id) ===
                  String(id)
              );


            if(!schedule)
              return;


            const occurrence =
              getTodayOccurrence(
                schedule,
                teacherTimezone
              );


            if(!occurrence){

              alert(
                'This class is not scheduled for today.'
              );

              return;
            }


            const result =
              await db
                .from(
                  'teacher_class_sessions'
                )
                .upsert(
                  {
                    schedule_id:
                      schedule.id,

                    teacher_id:
                      uid,

                    student_id:
                      schedule.student_id,

                    class_date:
                      occurrence.baseDate,

                    session_timezone:
                      teacherTimezone,

                    scheduled_at:
                      occurrence
                        .baseDateTime
                        .toUTC()
                        .toISO(),

                    status:
                      'active',

                    started_at:
                      new Date()
                        .toISOString()
                  },
                  {
                    onConflict:
                      'schedule_id,class_date'
                  }
                );


            if(result.error){

              alert(
                result.error.message
              );

              return;
            }


            button.textContent =
              'Started';

          };

      }
    );


  document
    .querySelectorAll(
      '[data-end-class]'
    )
    .forEach(
      button=>{

        button.onclick =
          async()=>{

            const id =
              button.dataset.endClass;


            const schedule =
              schedules.find(
                x =>
                  String(x.id) ===
                  String(id)
              );


            if(!schedule)
              return;


            const occurrence =
              getTodayOccurrence(
                schedule,
                teacherTimezone
              );


            if(!occurrence)
              return;


            const result =
              await db
                .from(
                  'teacher_class_sessions'
                )
                .update(
                  {
                    status:
                      'completed',

                    completed_at:
                      new Date()
                        .toISOString()
                  }
                )
                .eq(
                  'schedule_id',
                  schedule.id
                )
                .eq(
                  'teacher_id',
                  uid
                )
                .eq(
                  'class_date',
                  occurrence.baseDate
                );


            if(result.error){

              alert(
                result.error.message
              );

              return;
            }


            button.textContent =
              'Completed';

          };

      }
    );

}


/* =====================================================
   TEACHER SCHEDULE
===================================================== */

async function teacherSchedule(g){

  const uid =
    g.s.user.id;


  const teacherTimezone =
    await getTeacherTimezone(
      uid
    );


  const result =
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
        active,
        schedule_timezone
      `)
      .eq(
        'teacher_id',
        uid
      )
      .order(
        'class_time',
        {
          ascending:true
        }
      );


  if(result.error){

    set(
      'scheduleRows',
      rowEmpty(
        8,
        result.error.message
      )
    );

    return;
  }


  const schedules =
    result.data || [];


  const ids =
    [
      ...new Set(
        schedules
          .map(
            x=>x.student_id
          )
          .filter(Boolean)
      )
    ];


  let studentMap = {};


  if(ids.length){

    const sr =
      await db
        .from('students')
        .select(
          'id,full_name,timezone'
        )
        .in(
          'id',
          ids
        );


    if(!sr.error){

      (sr.data || [])
        .forEach(
          s=>{
            studentMap[s.id] =
              s;
          }
        );

    }
  }


  if(!schedules.length){

    set(
      'scheduleRows',
      rowEmpty(
        8,
        'No schedules found.'
      )
    );

    return;
  }


  set(
    'scheduleRows',
    schedules.map(
      schedule=>{

        const student =
          studentMap[
            schedule.student_id
          ];


        const days =
          normalizeDays(
            schedule.class_days
          ).join(', ');


        const meet =
          schedule.google_meet_url ||
          '';


        const classroom =
          classroomUrl(
            schedule
          );


        return `

          <tr>

            <td>
              ${esc(
                student?.full_name ||
                'Student'
              )}
            </td>

            <td>
              ${esc(
                schedule.course ||
                'Quran'
              )}
            </td>

            <td>
              ${esc(days)}
            </td>

            <td>
              ${esc(
                formatTime12(
                  schedule.class_time
                )
              )}
            </td>

            <td>
              ${esc(
                schedule.duration_minutes ||
                30
              )} min
            </td>

            <td>

              ${
                meet
                ? `
                  <a
                    href="${esc(meet)}"
                    target="_blank"
                    rel="noopener"
                  >
                    Meet
                  </a>
                `
                : '-'
              }

            </td>

            <td>

              ${
                classroom
                ? `
                  <a
                    href="${esc(classroom)}"
                    target="_blank"
                    rel="noopener"
                  >
                    Classroom
                  </a>
                `
                : '-'
              }

            </td>

            <td>

              <span
                class="status-badge"
              >
                ${schedule.active
                  ? 'Active'
                  : 'Inactive'}
              </span>

            </td>

          </tr>

        `;

      }
    ).join('')
  );

}


/* =====================================================
   TEACHER ATTENDANCE
===================================================== */

async function teacherAttendance(g){

  const uid =
    g.s.user.id;


  const result =
    await db
      .from(
        'teacher_class_sessions'
      )
      .select(`
        id,
        schedule_id,
        student_id,
        class_date,
        status,
        started_at,
        completed_at
      `)
      .eq(
        'teacher_id',
        uid
      )
      .order(
        'class_date',
        {
          ascending:false
        }
      );


  if(result.error){

    set(
      'attendanceRows',
      rowEmpty(
        7,
        result.error.message
      )
    );

    return;
  }


  const sessions =
    result.data || [];


  const studentIds =
    [
      ...new Set(
        sessions
          .map(
            x=>x.student_id
          )
          .filter(Boolean)
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


    if(!sr.error){

      (sr.data || [])
        .forEach(
          s=>{
            studentMap[s.id] =
              s.full_name;
          }
        );

    }
  }


  if(!sessions.length){

    set(
      'attendanceRows',
      rowEmpty(
        7,
        'No attendance records found.'
      )
    );

    return;
  }


  set(
    'attendanceRows',
    sessions.map(
      s=>`

        <tr>

          <td>
            ${esc(
              studentMap[s.student_id] ||
              'Student'
            )}
          </td>

          <td>
            ${esc(
              s.class_date || ''
            )}
          </td>

          <td>
            <span
              class="class-status ${statusClass(s.status)}"
            >
              ${esc(
                statusText(s.status)
              )}
            </span>
          </td>

          <td>
            ${
              s.started_at
              ? esc(
                  new Date(
                    s.started_at
                  ).toLocaleTimeString()
                )
              : '-'
            }
          </td>

          <td>
            ${
              s.completed_at
              ? esc(
                  new Date(
                    s.completed_at
                  ).toLocaleTimeString()
                )
              : '-'
            }
          </td>

          <td>
            <select
              data-attendance-id="${esc(s.id)}"
            >

              <option
                value="present"
                ${s.status === 'present'
                  ? 'selected'
                  : ''}
              >
                Present
              </option>

              <option
                value="absent"
                ${s.status === 'absent'
                  ? 'selected'
                  : ''}
              >
                Absent
              </option>

              <option
                value="late"
                ${s.status === 'late'
                  ? 'selected'
                  : ''}
              >
                Late
              </option>

              <option
                value="completed"
                ${s.status === 'completed'
                  ? 'selected'
                  : ''}
              >
                Completed
              </option>

            </select>
          </td>

          <td>

            <button
              type="button"
              data-save-attendance="${esc(s.id)}"
            >
              Save
            </button>

          </td>

        </tr>

      `
    ).join('')
  );


  document
    .querySelectorAll(
      '[data-save-attendance]'
    )
    .forEach(
      button=>{

        button.addEventListener(
          'click',
          async()=>{

            const id =
              button.dataset
                .saveAttendance;


            const select =
              document.querySelector(
                `[data-attendance-id="${CSS.escape(id)}"]`
              );


            if(!select)
              return;


            const result =
              await db
                .from(
                  'teacher_class_sessions'
                )
                .update(
                  {
                    status:
                      select.value
                  }
                )
                .eq(
                  'id',
                  id
                )
                .eq(
                  'teacher_id',
                  uid
                );


            if(result.error){

              alert(
                result.error.message
              );

              return;
            }


            button.textContent =
              'Saved';

          }
        );

      }
    );

}


/* =====================================================
   TEACHER PROFILE
===================================================== */

async function teacherProfile(g){

  const p =
    g.p;


  set(
    'profileName',
    esc(
      p?.full_name || ''
    )
  );


  set(
    'profileEmail',
    esc(
      g.s.user.email || ''
    )
  );


  const timezone =
    await getTeacherTimezone(
      g.s.user.id
    );


  set(
    'profileTimezone',
    esc(timezone)
  );


  document
    .querySelectorAll(
      '[data-profile-name]'
    )
    .forEach(
      el=>{
        el.textContent =
          p?.full_name ||
          '';
      }
    );

}


/* =====================================================
   STUDENT DASHBOARD
===================================================== */

async function loadStudentDashboard(g){

  const uid =
    g.s.user.id;


  const studentTimezone =
    await getStudentTimezone(
      uid
    );


  window.currentStudentTimezone =
    studentTimezone;


  window.studentTimezone =
    studentTimezone;


  localStorage.setItem(
    'student_timezone',
    studentTimezone
  );


  document.dispatchEvent(
    new CustomEvent(
      'studentTimezoneReady',
      {
        detail:{
          timezone:
            studentTimezone
        }
      }
    )
  );


  const result =
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
        active,
        schedule_timezone
      `)
      .eq(
        'student_id',
        uid
      )
      .eq(
        'active',
        true
      )
      .order(
        'class_time',
        {
          ascending:true
        }
      );


  if(result.error){

    set(
      'todayClassRows',
      rowEmpty(
        6,
        result.error.message
      )
    );

    return;
  }


  const schedules =
    result.data || [];


  const today =
    schedules.filter(
      schedule =>
        isViewerToday(
          schedule,
          studentTimezone
        )
    );


  if(!today.length){

    set(
      'todayClassRows',
      rowEmpty(
        6,
        'No classes scheduled for today.'
      )
    );

  }else{

    set(
      'todayClassRows',
      today.map(
        schedule=>{

          const occurrence =
            getTodayOccurrence(
              schedule,
              studentTimezone
            );


          return `

            <tr>

              <td>
                ${esc(
                  schedule.course ||
                  'Quran'
                )}
              </td>

              <td>
                ${esc(
                  formatOccurrenceTime(
                    occurrence
                  )
                )}
              </td>

              <td>
                ${esc(
                  schedule.duration_minutes ||
                  30
                )} min
              </td>

              <td>

                ${
                  schedule.google_meet_url
                  ? `
                    <a
                      href="${esc(
                        schedule.google_meet_url
                      )}"
                      target="_blank"
                      rel="noopener"
                    >
                      Join Meet
                    </a>
                  `
                  : '-'
                }

              </td>

              <td>

                ${
                  classroomUrl(schedule)
                  ? `
                    <a
                      href="${esc(
                        classroomUrl(schedule)
                      )}"
                      target="_blank"
                      rel="noopener"
                    >
                      Classroom
                    </a>
                  `
                  : '-'
                }

              </td>

              <td>
                <span
                  class="class-status status-upcoming"
                >
                  Upcoming
                </span>
              </td>

            </tr>

          `;

        }
      ).join('')
    );

  }


  set(
    'todayClassCount',
    today.length
  );


  set(
    'todayClassesCount',
    today.length
  );


  set(
    'studentTimezone',
    studentTimezone
  );


  set(
    'studentCurrentTime',
    viewerNow(
      studentTimezone
    ).toFormat(
      'h:mm a'
    )
  );

}


/* =====================================================
   STUDENT CLASSES
===================================================== */

async function studentClasses(g){

  const uid =
    g.s.user.id;


  const timezone =
    await getStudentTimezone(
      uid
    );


  const result =
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
        active,
        schedule_timezone
      `)
      .eq(
        'student_id',
        uid
      )
      .eq(
        'active',
        true
      )
      .order(
        'class_time',
        {
          ascending:true
        }
      );


  if(result.error){

    set(
      'classesRows',
      rowEmpty(
        7,
        result.error.message
      )
    );

    return;
  }


  const schedules =
    result.data || [];


  if(!schedules.length){

    set(
      'classesRows',
      rowEmpty(
        7,
        'No classes found.'
      )
    );

    return;
  }


  set(
    'classesRows',
    schedules.map(
      schedule=>{

        const occurrence =
          getTodayOccurrence(
            schedule,
            timezone
          );


        return `

          <tr>

            <td>
              ${esc(
                schedule.course ||
                'Quran'
              )}
            </td>

            <td>
              ${esc(
                normalizeDays(
                  schedule.class_days
                ).join(', ')
              )}
            </td>

            <td>
              ${esc(
                formatTime12(
                  schedule.class_time
                )
              )}
            </td>

            <td>
              ${esc(
                schedule.duration_minutes ||
                30
              )} min
            </td>

            <td>
              ${esc(
                occurrence
                  ? formatOccurrenceTime(
                      occurrence
                    )
                  : ''
              )}
            </td>

            <td>

              ${
                schedule.google_meet_url
                ? `
                  <a
                    href="${esc(
                      schedule.google_meet_url
                    )}"
                    target="_blank"
                    rel="noopener"
                  >
                    Join
                  </a>
                `
                : '-'
              }

            </td>

            <td>

              ${
                classroomUrl(schedule)
                ? `
                  <a
                    href="${esc(
                      classroomUrl(schedule)
                    )}"
                    target="_blank"
                    rel="noopener"
                  >
                    Classroom
                  </a>
                `
                : '-'
              }

            </td>

          </tr>

        `;

      }
    ).join('')
  );

}


/* =====================================================
   STUDENT SCHEDULE
===================================================== */

async function studentSchedule(g){

  return studentClasses(g);

}


/* =====================================================
   STUDENT PROFILE
===================================================== */

async function studentProfile(g){

  const p =
    g.p;


  set(
    'profileName',
    esc(
      p?.full_name || ''
    )
  );


  set(
    'profileEmail',
    esc(
      g.s.user.email || ''
    )
  );


  const timezone =
    await getStudentTimezone(
      g.s.user.id
    );


  set(
    'profileTimezone',
    esc(timezone)
  );

}


/* =====================================================
   STUDENT ATTENDANCE
===================================================== */

async function studentAttendance(g){

  const uid =
    g.s.user.id;


  const result =
    await db
      .from(
        'teacher_class_sessions'
      )
      .select(`
        id,
        class_date,
        status,
        started_at,
        completed_at
      `)
      .eq(
        'student_id',
        uid
      )
      .order(
        'class_date',
        {
          ascending:false
        }
      );


  if(result.error){

    set(
      'attendanceRows',
      rowEmpty(
        5,
        result.error.message
      )
    );

    return;
  }


  const sessions =
    result.data || [];


  if(!sessions.length){

    set(
      'attendanceRows',
      rowEmpty(
        5,
        'No attendance records found.'
      )
    );

    return;
  }


  set(
    'attendanceRows',
    sessions.map(
      s=>`

        <tr>

          <td>
            ${esc(
              s.class_date || ''
            )}
          </td>

          <td>
            <span
              class="class-status ${statusClass(s.status)}"
            >
              ${esc(
                statusText(s.status)
              )}
            </span>
          </td>

          <td>
            ${
              s.started_at
              ? esc(
                  new Date(
                    s.started_at
                  ).toLocaleTimeString()
                )
              : '-'
            }
          </td>

          <td>
            ${
              s.completed_at
              ? esc(
                  new Date(
                    s.completed_at
                  ).toLocaleTimeString()
                )
              : '-'
            }
          </td>

          <td>
            ${esc(
              s.status || ''
            )}
          </td>

        </tr>

      `
    ).join('')
  );

}


/* =====================================================
   STUDENT COURSES
===================================================== */

async function studentCourses(g){

  const uid =
    g.s.user.id;


  const result =
    await db
      .from('student_courses')
      .select('*')
      .eq(
        'student_id',
        uid
      )
      .order(
        'created_at',
        {
          ascending:false
        }
      );


  if(result.error){

    set(
      'coursesRows',
      rowEmpty(
        5,
        result.error.message
      )
    );

    return;
  }


  const courses =
    result.data || [];


  if(!courses.length){

    set(
      'coursesRows',
      rowEmpty(
        5,
        'No courses found.'
      )
    );

    return;
  }


  set(
    'coursesRows',
    courses.map(
      course=>`

        <tr>

          <td>
            ${esc(
              course.course ||
              course.name ||
              ''
            )}
          </td>

          <td>
            ${esc(
              course.status ||
              'active'
            )}
          </td>

          <td>
            ${esc(
              course.start_date ||
              ''
            )}
          </td>

          <td>
            ${esc(
              course.end_date ||
              ''
            )}
          </td>

          <td>
            ${esc(
              course.progress ??
              ''
            )}
          </td>

        </tr>

      `
    ).join('')
  );

}


/* =====================================================
   STUDENT LEAVES
===================================================== */

async function studentLeaves(g){

  const uid =
    g.s.user.id;


  const result =
    await db
      .from('leave_requests')
      .select('*')
      .eq(
        'student_id',
        uid
      )
      .order(
        'created_at',
        {
          ascending:false
        }
      );


  if(result.error){

    set(
      'leaveRows',
      rowEmpty(
        6,
        result.error.message
      )
    );

    return;
  }


  const leaves =
    result.data || [];


  if(!leaves.length){

    set(
      'leaveRows',
      rowEmpty(
        6,
        'No leave requests found.'
      )
    );

    return;
  }


  set(
    'leaveRows',
    leaves.map(
      leave=>`

        <tr>

          <td>
            ${esc(
              leave.start_date ||
              ''
            )}
          </td>

          <td>
            ${esc(
              leave.end_date ||
              ''
            )}
          </td>

          <td>
            ${esc(
              leave.reason ||
              ''
            )}
          </td>

          <td>
            ${esc(
              leave.status ||
              'pending'
            )}
          </td>

          <td>
            ${esc(
              leave.created_at
              ? new Date(
                  leave.created_at
                ).toLocaleDateString()
              : ''
            )}
          </td>

          <td>
            ${esc(
              leave.admin_note ||
              ''
            )}
          </td>

        </tr>

      `
    ).join('')
  );

}


/* =====================================================
   TEACHER LEAVES
===================================================== */

async function teacherLeaves(g){

  const uid =
    g.s.user.id;


  const result =
    await db
      .from('leave_requests')
      .select('*')
      .eq(
        'teacher_id',
        uid
      )
      .order(
        'created_at',
        {
          ascending:false
        }
      );


  if(result.error){

    set(
      'leaveRows',
      rowEmpty(
        6,
        result.error.message
      )
    );

    return;
  }


  const leaves =
    result.data || [];


  if(!leaves.length){

    set(
      'leaveRows',
      rowEmpty(
        6,
        'No leave requests found.'
      )
    );

    return;
  }


  set(
    'leaveRows',
    leaves.map(
      leave=>`

        <tr>

          <td>
            ${esc(
              leave.start_date ||
              ''
            )}
          </td>

          <td>
            ${esc(
              leave.end_date ||
              ''
            )}
          </td>

          <td>
            ${esc(
              leave.reason ||
              ''
            )}
          </td>

          <td>
            ${esc(
              leave.status ||
              'pending'
            )}
          </td>

          <td>
            ${esc(
              leave.created_at
              ? new Date(
                  leave.created_at
                ).toLocaleDateString()
              : ''
            )}
          </td>

          <td>
            ${esc(
              leave.admin_note ||
              ''
            )}
          </td>

        </tr>

      `
    ).join('')
  );

}


/* =====================================================
   TEACHER SALARY
===================================================== */

async function teacherSalary(g){

  const uid =
    g.s.user.id;


  const result =
    await db
      .from('teacher_salaries')
      .select('*')
      .eq(
        'teacher_id',
        uid
      )
      .order(
        'created_at',
        {
          ascending:false
        }
      );


  if(result.error){

    set(
      'salaryRows',
      rowEmpty(
        6,
        result.error.message
      )
    );

    return;
  }


  const salaries =
    result.data || [];


  if(!salaries.length){

    set(
      'salaryRows',
      rowEmpty(
        6,
        'No salary records found.'
      )
    );

    return;
  }


  set(
    'salaryRows',
    salaries.map(
      salary=>`

        <tr>

          <td>
            ${esc(
              salary.month ||
              salary.salary_month ||
              ''
            )}
          </td>

          <td>
            ${esc(
              salary.amount ||
              ''
            )}
          </td>

          <td>
            ${esc(
              salary.currency ||
              'USD'
            )}
          </td>

          <td>
            ${esc(
              salary.status ||
              ''
            )}
          </td>

          <td>
            ${esc(
              salary.paid_at
              ? new Date(
                  salary.paid_at
                ).toLocaleDateString()
              : ''
            )}
          </td>

          <td>
            ${esc(
              salary.note ||
              ''
            )}
          </td>

        </tr>

      `
    ).join('')
  );

}


/* =====================================================
   NOTIFICATIONS
===================================================== */

async function loadNotifications(g){

  const uid =
    g.s.user.id;


  const result =
    await db
      .from('notifications')
      .select('*')
      .eq(
        'user_id',
        uid
      )
      .order(
        'created_at',
        {
          ascending:false
        }
      )
      .limit(50);


  if(result.error)
    return;


  const notifications =
    result.data || [];


  if(
    document.getElementById(
      'notificationsRows'
    )
  ){

    set(
      'notificationsRows',
      notifications.length
      ? notifications.map(
          n=>`

            <tr>

              <td>
                ${esc(
                  n.title ||
                  'Notification'
                )}
              </td>

              <td>
                ${esc(
                  n.message ||
                  ''
                )}
              </td>

              <td>
                ${esc(
                  n.created_at
                  ? new Date(
                      n.created_at
                    ).toLocaleString()
                  : ''
                )}
              </td>

              <td>
                ${n.read
                  ? 'Read'
                  : 'Unread'}
              </td>

            </tr>

          `
        ).join('')
      : rowEmpty(
          4,
          'No notifications.'
        )
    );

  }


  const unread =
    notifications.filter(
      n=>!n.read
    ).length;


  set(
    'notificationCount',
    unread
  );

}


/* =====================================================
   MARK NOTIFICATION READ
===================================================== */

async function markNotificationRead(
  id,
  uid
){

  return db
    .from('notifications')
    .update({
      read:true
    })
    .eq(
      'id',
      id
    )
    .eq(
      'user_id',
      uid
    );

}


/* =====================================================
   COMMON USER DATA
===================================================== */

async function loadCommonUserData(g){

  const name =
    g.p?.full_name ||
    g.s.user.email ||
    '';


  document
    .querySelectorAll(
      '[data-name]'
    )
    .forEach(
      el=>{
        el.textContent =
          name;
      }
    );


  document
    .querySelectorAll(
      '[data-email]'
    )
    .forEach(
      el=>{
        el.textContent =
          g.s.user.email ||
          '';
      }
    );


  await loadNotifications(
    g
  );

}


/* =====================================================
   TEACHER ROUTER
===================================================== */

async function runTeacherPage(g){

  await loadCommonUserData(
    g
  );


  if(page === 'teacher-dashboard'){

    await loadTeacherDashboard(
      g
    );

    return;
  }


  if(
    page === 'teacher-students'
  ){

    await teacherStudents(
      g
    );

    return;
  }


  if(
    page === 'teacher-classes'
  ){

    await teacherClasses(
      g
    );

    return;
  }


  if(
    page === 'teacher-schedule'
  ){

    await teacherSchedule(
      g
    );

    return;
  }


  if(
    page === 'teacher-attendance'
  ){

    await teacherAttendance(
      g
    );

    return;
  }


  if(
    page === 'teacher-profile'
  ){

    await teacherProfile(
      g
    );

    return;
  }


  if(
    page === 'teacher-leaves'
  ){

    await teacherLeaves(
      g
    );

    return;
  }


  if(
    page === 'teacher-salary'
  ){

    await teacherSalary(
      g
    );

    return;
  }


  /*
    Unknown teacher page:
    still remain inside teacher portal.
  */

  await loadTeacherDashboard(
    g
  );

}


/* =====================================================
   STUDENT ROUTER
===================================================== */

async function runStudentPage(g){

  await loadCommonUserData(
    g
  );


  if(page === 'student-dashboard'){

    await loadStudentDashboard(
      g
    );

    return;
  }


  if(
    page === 'student-classes'
  ){

    await studentClasses(
      g
    );

    return;
  }


  if(
    page === 'student-schedule'
  ){

    await studentSchedule(
      g
    );

    return;
  }


  if(
    page === 'student-attendance'
  ){

    await studentAttendance(
      g
    );

    return;
  }


  if(
    page === 'student-profile'
  ){

    await studentProfile(
      g
    );

    return;
  }


  if(
    page === 'student-courses'
  ){

    await studentCourses(
      g
    );

    return;
  }


  if(
    page === 'student-leaves'
  ){

    await studentLeaves(
      g
    );

    return;
  }


  await loadStudentDashboard(
    g
  );

}


/* =====================================================
   INITIALIZATION
===================================================== */

async function initPortal(){

  /*
    IMPORTANT:
    Teacher and Student startup paths are mutually
    exclusive. This prevents both systems from
    running on the same page.
  */


  if(
    page?.startsWith(
      'teacher-'
    )
  ){

    const g =
      await guard(
        'teacher'
      );


    if(!g)
      return;


    await runTeacherPage(
      g
    );


    return;
  }


  if(
    page?.startsWith(
      'student-'
    )
  ){

    const g =
      await guard(
        'student'
      );


    if(!g)
      return;


    await runStudentPage(
      g
    );


    return;
  }


  /*
    Admin pages continue to use their
    existing page-specific logic.
  */

  console.log(
    'Portal page:',
    page
  );

}


/* =====================================================
   DOM READY
===================================================== */

if(
  document.readyState ===
  'loading'
){

  document.addEventListener(
    'DOMContentLoaded',
    initPortal,
    {
      once:true
    }
  );

}else{

  initPortal();

}


})();
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
   START APP
===================================================== */

/*
  IMPORTANT:
  Only ONE portal initializer may run on a page.
  Teacher URL => teacherData()
  Student URL => studentData()
*/
if(
  page?.startsWith('teacher-')
){

  teacherData();

}else if(
  page?.startsWith('student-')
){

  studentData();

}

})();
