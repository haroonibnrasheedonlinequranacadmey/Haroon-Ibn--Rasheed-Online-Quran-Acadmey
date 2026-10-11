/* Shared Student Portal navigation and personal theme preferences. No database calls. */
(function(){
 const root=document.documentElement; const key='hir_student_portal_preferences_v1';
 const links=[['Dashboard','dashboard.html'],['My Classes','classes.html'],['My Courses','course.html'],['Schedule','schedule.html'],['Attendance','attendance.html'],['Fees','fees.html'],['Leaves','leaves.html'],['My Teacher','teacher.html'],['Profile','profile.html'],['Settings','settings.html']];
 function load(){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(e){return {}}}
 function apply(){const p=load(); root.dataset.studentTheme=p.theme==='dark'?'dark':'light'; root.style.setProperty('--student-accent',/^#[0-9a-f]{6}$/i.test(p.accent||'')?p.accent:'#1769e0');}
 function render(){if(!document.body||document.querySelector('.student-topbar'))return; apply();
  const path=location.pathname.split('/').pop()||'dashboard.html';
  const header=document.createElement('header');header.className='student-topbar';
  const brand=document.createElement('a');brand.className='student-topbrand';brand.href='dashboard.html';
  const logo=document.createElement('img');logo.src='../assets/hr-logo.svg';logo.alt='H.R Academy logo';
  const label=document.createElement('span');label.append('Haroon Ibn Rasheed');const small=document.createElement('small');small.textContent='Online Quran Academy';label.append(small);brand.append(logo,label);
  const nav=document.createElement('nav');nav.className='student-topnav';nav.setAttribute('aria-label','Student navigation');
  links.forEach(([name,url])=>{const a=document.createElement('a');a.href=url;a.textContent=name;if(path===url){a.setAttribute('aria-current','page')}nav.append(a)});
  const actions=document.createElement('div');actions.className='student-top-actions';
  const theme=document.createElement('button');theme.type='button';theme.className='student-theme-button';theme.textContent=root.dataset.studentTheme==='dark'?'☀ Light':'☾ Dark';theme.setAttribute('aria-label','Toggle dark mode');theme.addEventListener('click',()=>{const p=load();p.theme=root.dataset.studentTheme==='dark'?'light':'dark';try{localStorage.setItem(key,JSON.stringify(p))}catch(e){}apply();theme.textContent=root.dataset.studentTheme==='dark'?'☀ Light':'☾ Dark'});
  const menu=document.createElement('button');menu.type='button';menu.className='student-menu-button';menu.textContent='☰ Menu';menu.addEventListener('click',()=>nav.classList.toggle('is-open'));
  actions.append(theme,menu);header.append(brand,nav,actions);document.body.insertBefore(header,document.body.firstChild);
 }
 window.StudentPortalPreferences={get:load,set:function(p){const next=Object.assign({},load(),p||{});try{localStorage.setItem(key,JSON.stringify(next))}catch(e){}apply()}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
