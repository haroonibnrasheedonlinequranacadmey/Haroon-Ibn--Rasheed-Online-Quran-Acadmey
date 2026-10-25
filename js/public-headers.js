(function () {
  'use strict';

  const slides = {
    home: [
      'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&fm=jpg&q=85&w=1920',
      'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&fm=jpg&q=85&w=1920',
      'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&fm=jpg&q=85&w=1920',
      'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&fm=jpg&q=85&w=1920',
      'https://images.unsplash.com/photo-1577792077974-0a424b741d34?auto=format&fit=crop&fm=jpg&q=85&w=1920'
    ],
    about: ['https://upload.wikimedia.org/wikipedia/commons/9/97/Courtyard_of_Shah_Jahan_Mosque.JPG', 'https://images.unsplash.com/photo-1558542403-bb396707e7da?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=80&w=1600'],
    courses: ['https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=80&w=1600'],
    teachers: ['https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1600'],
    fees: ['https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&q=80&w=1600', 'https://upload.wikimedia.org/wikipedia/commons/9/97/Courtyard_of_Shah_Jahan_Mosque.JPG'],
    contact: ['https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=80&w=1600', 'https://upload.wikimedia.org/wikipedia/commons/9/97/Courtyard_of_Shah_Jahan_Mosque.JPG', 'https://images.unsplash.com/photo-1558542403-bb396707e7da?auto=format&fit=crop&q=80&w=1600'],
    faq: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/PUTRA_MOSQUE_ARCHITECTURE.jpg/1280px-PUTRA_MOSQUE_ARCHITECTURE.jpg', 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1558542403-bb396707e7da?auto=format&fit=crop&q=80&w=1600'],
    blog: ['https://images.unsplash.com/photo-1652964287112-438ece0a6acc?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=80&w=1600', 'https://upload.wikimedia.org/wikipedia/commons/9/97/Courtyard_of_Shah_Jahan_Mosque.JPG'],
    reviews: ['https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1600', 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=80&w=1600'],
    register: ['https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=85&w=1600', 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=85&w=1600'],
    'portal-login': ['https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&q=85&w=1600', 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=85&w=1600'],
    video: ['https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&q=85&w=1600', 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&q=85&w=1600'],
    'system-check': ['https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=85&w=1600']
  };
  const pageInfo = {
    about: ['ABOUT US', 'Learn, Understand & Live the Quran', 'Discover our mission, values and commitment to quality Quranic education.'],
    courses: ['QURAN COURSES', 'Learn With a Clear, Personal Path', 'Explore Quran reading, Tajweed, Hifz, translation and Islamic studies.'],
    teachers: ['OUR TEACHERS', 'Learn From Qualified Quran Teachers', 'Experienced teachers helping students learn with care, patience and consistency.'],
    fees: ['OUR FEES', 'Simple & Transparent Pricing', 'Choose a flexible learning plan that fits your Quran journey.'],
    contact: ['CONTACT US', 'We Are Here to Help', 'Reach out to Haroon Ibn Rasheed Online Quran Academy for admissions and support.'],
    faq: ['FAQS', 'Questions, Clearly Answered', 'Find quick answers about classes, courses, timings, fees and admissions.'],
    blog: ['QURAN & ISLAMIC ARTICLES', 'Learn Beyond the Classroom', 'Helpful Quranic and Islamic educational articles from the academy.'],
    reviews: ['STUDENT REVIEWS', 'What Our Students Say', 'Real experiences and feedback from students and families.'],
    register: ['ADMISSIONS', 'Begin Your Quran Learning Journey', 'Register for a free trial and find the right Quran course for your family.'],
    'portal-login': ['STUDENT & TEACHER PORTAL', 'Welcome Back to Your Learning Portal', 'Sign in to access classes, learning resources and your academy account.'],
    video: ['QURAN LEARNING VIDEOS', 'Learn Quran Step by Step', 'Explore Quran learning videos and educational resources from our academy.'],
    'system-check': ['ACADEMY SUPPORT', 'Online Learning System Check', 'Check your setup for a smooth online Quran learning experience.']
  };

  function injectStyles() {
    if (document.getElementById('publicHeaderRuntimeStyles')) return;
    const style = document.createElement('style');
    style.id = 'publicHeaderRuntimeStyles';
    style.textContent = `
      .brand .logo,
      .logo {
        width:58px!important;height:58px!important;min-width:58px!important;
        border-radius:50%!important;overflow:hidden!important;
        background:#071a34!important;border:2px solid #f5c84b!important;
        box-shadow:0 5px 18px rgba(0,0,0,.25)!important;
        color:transparent!important;font-size:0!important;position:relative!important;
      }
      .brand .logo img,
      .logo img {display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important;}
      .brand-copy .brand-name,
      .brand-name {color:#f5c84b!important;font-weight:800!important;text-shadow:0 1px 7px rgba(0,0,0,.28);}
      .brand-copy .brand-sub,
      .brand-sub {color:#fff!important;}
      .form-logo {width:92px!important;height:92px!important;border-radius:50%!important;overflow:hidden!important;background:#071a34!important;border:3px solid #f5c84b!important;color:transparent!important;font-size:0!important;box-shadow:0 8px 24px rgba(0,0,0,.22)!important;}
      .form-logo img {display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important;}
      .public-home-slideshow{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;transition:opacity .65s ease,background-image .65s ease;}
      .hero{position:relative!important;overflow:hidden!important;background:#071a34!important;background-image:none!important;}
      .hero > .public-home-slideshow{position:absolute!important;inset:0!important;z-index:0!important;pointer-events:none!important;display:block!important;background-repeat:no-repeat!important;}
      .hero > .hero-content,.hero > .page-hero-content{position:relative!important;z-index:2!important;}
      .hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,17,35,.86),rgba(3,17,35,.48),rgba(3,17,35,.34));z-index:1;pointer-events:none;}
      .hero > *{position:relative;z-index:2;} .hero > .public-home-slideshow{position:absolute!important;z-index:0!important;} .hero:after{z-index:1!important;} .hero > .hero-content,.hero > .page-hero-content{z-index:2!important;}
      .page-public-header{position:relative;min-height:330px;display:flex;align-items:center;overflow:hidden;color:#fff;background:#071a34;margin:0!important;}
      .page-public-header .ph-slides{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity .65s ease;}
      .page-public-header:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,17,35,.88),rgba(3,17,35,.54),rgba(3,17,35,.38));}
      .page-public-header .ph-inner{position:relative;z-index:2;width:min(1180px,92%);margin:auto;padding:70px 0 62px;}
      .page-public-header .ph-kicker{font-size:13px;letter-spacing:2px;font-weight:800;color:#f5c84b;margin-bottom:10px;}
      .page-public-header h1{margin:0 0 12px;font-size:clamp(34px,5vw,58px);line-height:1.08;color:#fff;}
      .page-public-header p{margin:0;max-width:760px;font-size:17px;line-height:1.65;color:#eef6ff;}
      .page-public-dots{display:flex;gap:7px;margin-top:22px;}
      .page-public-dots span{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.55);}
      .page-public-dots span.active{background:#f5c84b;transform:scale(1.15);}
      @media(max-width:680px){
        .brand .logo,.logo{width:48px!important;height:48px!important;min-width:48px!important;}
        .page-public-header{min-height:280px;}
        .page-public-header .ph-inner{padding:54px 0 48px;}
      }
    `;
    document.head.appendChild(style);
  }

  function logoUrl() { return 'assets/hr-logo-round.png'; }

  function replaceLogo(el) {
    if (!el) return;
    let img = el.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = 'Haroon Ibn Rasheed Online Quran Academy';
      img.src = logoUrl();
      el.replaceChildren(img);
    } else {
      img.src = logoUrl();
    }
    el.setAttribute('aria-label','Haroon Ibn Rasheed Online Quran Academy');
  }

  function updateBranding() {
    document.querySelectorAll('.brand .logo, header .logo').forEach(replaceLogo);
    document.querySelectorAll('.form-logo').forEach(replaceLogo);
    const brand = document.querySelector('.brand');
    if (brand) {
      let copy = brand.querySelector('.runtime-brand-copy');
      if (!copy) {
        copy = brand.querySelector(':scope > div:not(.logo)');
        if (copy) copy.className = 'runtime-brand-copy';
        else { copy = document.createElement('span'); copy.className='runtime-brand-copy'; brand.appendChild(copy); }
      }
      copy.innerHTML = '<span class="brand-name">Haroon Ibn Rasheed</span><span class="brand-sub">Online Quran Academy</span>';
    }
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) { favicon = document.createElement('link'); favicon.rel='icon'; document.head.appendChild(favicon); }
    favicon.type='image/png'; favicon.href=logoUrl();
    let apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (!apple) { apple=document.createElement('link'); apple.rel='apple-touch-icon'; document.head.appendChild(apple); }
    apple.href=logoUrl();
    document.title = 'Haroon Ibn Rasheed Online Quran Academy';
  }

  function preload(list) { list.forEach(function(url){ const img=new Image(); img.src=url; }); }

  function startBackgroundSlideshow(el, list, interval) {
    if (!el || !list || !list.length) return;
    let i=0;
    const first=list[0];
    el.style.backgroundImage='url("'+first+'")';
    preload(list);
    if (list.length < 2) return;
    setInterval(function(){
      i=(i+1)%list.length;
      el.style.opacity='0.25';
      setTimeout(function(){
        el.style.backgroundImage='url("'+list[i]+'")';
        el.style.opacity='1';
      }, 260);
    }, interval || 5500);
  }

  function setupHome() {
    const home=document.getElementById('home') || document.getElementById('main-content') || document.querySelector('main');
    if (!home) return;
    const hero=home.querySelector('.hero');
    if (!hero) return;
    let bg=hero.querySelector('.public-home-slideshow');
    if (!bg) { bg=document.createElement('div'); bg.className='public-home-slideshow'; hero.prepend(bg); }
    hero.style.backgroundImage='none';
    startBackgroundSlideshow(bg, slides.home, 3000);
  }

  function makePageHero(page) {
    const isHome = page === 'home';
    const main = isHome ? (document.querySelector('#main-content') || document.querySelector('main')) : document.querySelector('main');
    if (!main) return;
    if (isHome) { setupHome(); return; }
    if (document.querySelector('.page-public-header')) return;
    const info=pageInfo[page];
    if (!info) return;
    const section=document.createElement('section');
    section.className='page-public-header';
    section.innerHTML='<div class="ph-slides"></div><div class="ph-inner"><div class="ph-kicker">'+info[0]+'</div><h1>'+info[1]+'</h1><p>'+info[2]+'</p><div class="page-public-dots" aria-hidden="true"></div></div>';
    main.parentNode.insertBefore(section, main);
    const dots=section.querySelector('.page-public-dots');
    slides[page].forEach(function(_,idx){ const dot=document.createElement('span'); if(idx===0)dot.classList.add('active'); dots.appendChild(dot); });
    const bg=section.querySelector('.ph-slides'); let i=0;
    bg.style.backgroundImage='url("'+slides[page][0]+'")'; preload(slides[page]);
    setInterval(function(){ i=(i+1)%slides[page].length; bg.style.opacity='.45'; setTimeout(function(){ bg.style.backgroundImage='url("'+slides[page][i]+'")'; bg.style.opacity='1'; dots.querySelectorAll('span').forEach(function(dot,n){dot.classList.toggle('active',n===i);}); },180); },3000);
  }

  function ensureAboutPage() {
    if (document.getElementById('about')) return;
    const main=document.createElement('main');
    main.id='about'; main.className='page';
    main.innerHTML='<section class="section light"><div class="container"><div class="heading"><small>ABOUT HAROON IBN RASHEED</small><h2>A Trusted Place to Learn the Quran Online</h2><p>Haroon Ibn Rasheed Online Quran Academy provides accessible, structured and caring Quranic education for students around the world.</p></div><div class="two"><div><h3>Our Mission</h3><p>To make authentic Quran learning easy to access through qualified teachers, flexible online classes and a supportive learning environment.</p><h3>Our Values</h3><p>Faith, integrity, excellence, patience and personal attention are at the heart of our teaching approach.</p></div><div class="card"><div class="card-body"><h3>Why Choose Us?</h3><p>Qualified teachers, flexible schedules, personalized learning and a clear path for every student.</p><a class="btn gold" href="#" onclick="openForm();return false">Start Learning</a></div></div></div></div></section>';
    const footer=document.querySelector('footer');
    document.body.insertBefore(main, footer || null);
  }

  function ensureAboutNav() {
    const menu=document.querySelector('.menu');
    if (!menu || menu.querySelector('[data-page="about"]')) return;
    const home=menu.querySelector('[data-page="home"]');
    const btn=document.createElement('button');
    btn.type='button'; btn.setAttribute('data-page','about'); btn.textContent='About Us';
    btn.addEventListener('click',function(){ if(typeof window.showPage==='function') window.showPage('about'); });
    if (home && home.nextSibling) menu.insertBefore(btn, home.nextSibling); else menu.appendChild(btn);
  }

  function init() {
    injectStyles();
    updateBranding();
    ensureAboutPage();
    ensureAboutNav();
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase().replace('.html','');
    const page=file==='index'?'home':(file==='faq'?'faq':file);
    if(page==='home') setupHome(); else makePageHero(page);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
