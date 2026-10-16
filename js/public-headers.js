(function () {
  'use strict';

  const base = 'assets/public-headers/';
  const slides = {
    home: ['home-1.svg','home-2.svg','home-3.svg','home-4.svg','home-5.svg'],
    about: ['about-1.svg','about-2.svg','about-3.svg'],
    courses: ['courses-1.svg','courses-2.svg','courses-3.svg'],
    teachers: ['teachers-1.svg','teachers-2.svg','teachers-3.svg'],
    fees: ['fees-1.svg','fees-2.svg','fees-3.svg'],
    contact: ['contact-1.svg','contact-2.svg','contact-3.svg'],
    faq: ['faq-1.svg','faq-2.svg','faq-3.svg'],
    blog: ['blog-1.svg','blog-2.svg','blog-3.svg'],
    reviews: ['reviews-1.svg','reviews-2.svg','reviews-3.svg']
  };

  const pageInfo = {
    about: ['ABOUT US', 'Learn, Understand & Live the Quran', 'Discover our mission, values and commitment to quality Quranic education.'],
    courses: ['QURAN COURSES', 'Learn With a Clear, Personal Path', 'Explore Quran reading, Tajweed, Hifz, translation and Islamic studies.'],
    teachers: ['OUR TEACHERS', 'Learn From Qualified Quran Teachers', 'Experienced teachers helping students learn with care, patience and consistency.'],
    fees: ['OUR FEES', 'Simple & Transparent Pricing', 'Choose a flexible learning plan that fits your Quran journey.'],
    contact: ['CONTACT US', 'We Are Here to Help', 'Reach out to Haroon Ibn Rasheed Online Quran Academy for admissions and support.'],
    faq: ['FAQS', 'Questions, Clearly Answered', 'Find quick answers about classes, courses, timings, fees and admissions.'],
    blog: ['QURAN & ISLAMIC ARTICLES', 'Learn Beyond the Classroom', 'Helpful Quranic and Islamic educational articles from the academy.'],
    reviews: ['STUDENT REVIEWS', 'What Our Students Say', 'Real experiences and feedback from students and families.']
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
      .hero{position:relative!important;overflow:hidden!important;background:#071a34!important;}
      .hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,17,35,.86),rgba(3,17,35,.48),rgba(3,17,35,.34));z-index:1;pointer-events:none;}
      .hero > *{position:relative;z-index:2;}
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

  function preload(list) {
    list.forEach(function(name){ const img=new Image(); img.src=base+name; });
  }

  function startBackgroundSlideshow(el, list, interval) {
    if (!el || !list || !list.length) return;
    let i=0;
    const first=base+list[0];
    el.style.backgroundImage='url("'+first+'")';
    preload(list);
    if (list.length < 2) return;
    setInterval(function(){
      i=(i+1)%list.length;
      el.style.opacity='0.55';
      setTimeout(function(){
        el.style.backgroundImage='url("'+base+list[i]+'")';
        el.style.opacity='1';
      }, 260);
    }, interval || 5500);
  }

  function setupHome() {
    const home=document.getElementById('home');
    if (!home) return;
    const hero=home.querySelector('.hero');
    if (!hero) return;
    let bg=hero.querySelector('.public-home-slideshow');
    if (!bg) { bg=document.createElement('div'); bg.className='public-home-slideshow'; hero.prepend(bg); }
    startBackgroundSlideshow(bg, slides.home, 5000);
  }

  function makePageHero(page) {
    const main=document.getElementById(page);
    if (!main || !pageInfo[page]) return;
    if (main.querySelector(':scope > .page-public-header')) return;
    const info=pageInfo[page];
    const section=document.createElement('section');
    section.className='page-public-header';
    section.innerHTML='<div class="ph-slides"></div><div class="ph-inner"><div class="ph-kicker">'+info[0]+'</div><h1>'+info[1]+'</h1><p>'+info[2]+'</p><div class="page-public-dots" aria-hidden="true"></div></div>';
    main.prepend(section);
    const dots=section.querySelector('.page-public-dots');
    slides[page].forEach(function(_,idx){ const s=document.createElement('span'); if(idx===0)s.classList.add('active'); dots.appendChild(s); });
    const bg=section.querySelector('.ph-slides');
    let i=0;
    bg.style.backgroundImage='url("'+base+slides[page][0]+'")';
    preload(slides[page]);
    setInterval(function(){
      i=(i+1)%slides[page].length;
      bg.style.opacity='.45';
      setTimeout(function(){
        bg.style.backgroundImage='url("'+base+slides[page][i]+'")';
        bg.style.opacity='1';
        dots.querySelectorAll('span').forEach(function(dot,n){dot.classList.toggle('active',n===i);});
      },260);
    }, 5200);
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
    setupHome();
    Object.keys(slides).filter(function(k){return k!=='home';}).forEach(function(page){makePageHero(page);});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
