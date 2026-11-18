(()=>{"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const API="https://api.alquran.cloud/v1";
const QDC="https://api.qurancdn.com/api/qdc";
const TAFSIR="https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";
const QENC="https://quranenc.com/api/v1";
const AUDIO="https://cdn.islamic.network/quran/audio/128/ar.alafasy";
const META_KEY="lml-quran-meta-v1", SETTINGS_KEY="lml-quran-settings-v1";
const editions={
 en:{id:"en.sahih",label:"English — Saheeh International",dir:"ltr"},
 ur:{id:"ur.jalandhry",label:"اردو — فتح محمد جالندھری",dir:"rtl"},
 hi:{id:"hi.hindi",label:"हिन्दी — Suhel Farooq Khan & Saifur Rahman Nadwi",dir:"ltr"},
 bn:{id:"bn.bengali",label:"বাংলা — Muhiuddin Khan",dir:"ltr"},
 fr:{id:"fr.hamidullah",label:"Français — Muhammad Hamidullah",dir:"ltr"},
 id:{id:"id.indonesian",label:"Bahasa Indonesia",dir:"ltr"},
 tr:{id:"tr.diyanet",label:"Türkçe — Diyanet",dir:"ltr"},
 de:{id:"de.bubenheim",label:"Deutsch — Bubenheim & Elyas",dir:"ltr"},
 es:{id:"es.cortes",label:"Español — Julio Cortés",dir:"ltr"}
};
let root, currentSurah=1, verses=[], translations={}, metaCache={}, juzCache={}, audio=null, readerMode="quran";
let settings=loadSettings();
let audioQueue=[], queueIndex=0, repeatMode="none", repeatFrom=null, repeatTo=null, autoScroll=true, practiceMode=false;

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function loadSettings(){
 const d={fontSize:34,translationSize:18,tafsirSize:16,showTranslations:true,showTafsir:false,showWordByWord:false,autoScroll:true,autoPlayNext:true,layout:"cards",language:"en",selected:["en"],theme:"light",arabicFont:"serif",lineHeight:2.05};
 try{return {...d,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}}catch{return d}
}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function allVerses(){let out=[],g=0,p=0;for(const s of LML_QURAN.surahs){for(let a=1;a<=s.ayahs;a++){out.push({key:`${s.number}:${a}`,surah:s.number,ayah:a,global:g,text:LML_QURAN.texts[p++]});g++}}return out}
const QVERSES=allVerses(), BYKEY=new Map(QVERSES.map(v=>[v.key,v]));
function surahVerses(n){return QVERSES.filter(v=>v.surah===n)}
function getSurah(n){return LML_QURAN.surahs[n-1]}
async function api(url){const c=new AbortController();const t=setTimeout(()=>c.abort(),9000);try{const r=await fetch(url,{headers:{Accept:"application/json"},signal:c.signal});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}}
function rememberProgress(key){
 try{
  localStorage.setItem("lml-quran-progress-v1",key);
  const h=JSON.parse(localStorage.getItem("lml-quran-history-v1")||"[]");
  const next=[key,...h.filter(x=>x!==key)].slice(0,100);
  localStorage.setItem("lml-quran-history-v1",JSON.stringify(next));
 }catch{}
}
function readHistory(){try{return JSON.parse(localStorage.getItem("lml-quran-history-v1")||"[]")}catch{return[]}}
function applyReaderTheme(){
 if(!root)return;
 root.querySelector(".quran-app")?.setAttribute("data-theme",settings.theme||"light");
}
function readProgress(){return localStorage.getItem("lml-quran-progress-v1")||"1:1"}
function bookmarks(){try{return JSON.parse(localStorage.getItem("lml-quran-bookmarks-v1")||"[]")}catch{return[]}}
function saveBookmarks(a){localStorage.setItem("lml-quran-bookmarks-v1",JSON.stringify(a))}
function isBookmarked(k){return bookmarks().includes(k)}
function toggleBookmark(k){let b=bookmarks();b=b.includes(k)?b.filter(x=>x!==k):[...b,k];saveBookmarks(b);renderVerseActions(k)}
function quranHTML(){return `<div id="quranLibrary" data-reader-mode="quran"></div>`}
function setMode(mode){readerMode=mode==="tafsir"?"tafsir":"quran"; if(root?.isConnected)applyReaderMode()}

async function mount(targetId="quranLibrary"){
 root=document.getElementById(targetId);if(!root)return;
 autoScroll=settings.autoScroll!==false;
 renderShell();
 const p=readProgress(); const [ps,pa]=p.split(":").map(Number);
 currentSurah=ps||1;
 if(readerMode==="tafsir"){const c=$("#surahCatalog");if(c)c.hidden=true;await loadSurah(currentSurah,pa||1);}
 else showSurahCatalog();
}
function renderShell(){
 root.innerHTML=`<section class="quran-app">
  <div class="quran-hero"><div class="quran-hero-copy"><span class="quran-eyebrow">LITTLE MUSLIM LEARNERS · QURAN</span><h2 id="readerHeading">Quran Reader</h2><p id="readerSubheading">A calm, focused space to read, listen, reflect and study the Qur'an.</p><div class="quran-mode-switch" role="tablist" aria-label="Quran study mode"><button type="button" id="modeQuran" role="tab">Quran Reading</button><button type="button" id="modeTafseer" role="tab">Tafseer Study</button></div></div><div class="quran-progress-box"><b id="qProgressText">Continue reading</b><span id="qProgressKey"></span><button id="continueBtn">Continue Reading</button></div></div>
  <section class="surah-catalog" id="surahCatalog" aria-label="Surah directory">
   <div class="catalog-heading"><div><span class="settings-kicker">THE HOLY QURAN</span><h3>Choose a Surah</h3><p>Browse all 114 Surahs, search by name or number, and continue your reading.</p></div><button type="button" id="catalogContinue">↗ Continue Reading</button></div>
   <div class="catalog-tools"><input id="surahSearch" type="search" placeholder="Search Surah name or number…" aria-label="Search Surah"><div class="catalog-view-switch"><button type="button" class="active" id="surahListView">☷ List</button><button type="button" id="surahGridView">▦ Grid</button></div></div>
   <div class="surah-catalog-grid" id="surahCatalogItems"></div>
   <div class="catalog-foot"><button type="button" id="catalogJuz">Browse 30 Juz / Para</button><button type="button" id="catalogSettings">⚙ Reading Settings</button><button type="button" id="catalogBookmarks">My Bookmarks</button><button type="button" id="catalogHistory">Reading History</button></div>
  </section>
  <div class="quran-toolbar" hidden>
   <label>Surah <select id="surahSelect">${LML_QURAN.surahs.map(s=>`<option value="${s.number}">${s.number}. ${esc(s.name)} — ${s.ayahs}</option>`).join("")}</select></label>
   <label>Juz <select id="juzSelect"><option value="">Choose Juz</option>${Array.from({length:30},(_,i)=>`<option value="${i+1}">Juz ${i+1}</option>`).join("")}</select></label><label>Hizb <select id="hizbSelect"><option value="">Choose Hizb</option>${Array.from({length:60},(_,i)=>`<option value="${i+1}">Hizb ${i+1}</option>`).join("")}</select></label><label>Page <input id="pageJump" type="number" min="1" max="604" placeholder="1–604"></label><button id="pageBtn">Go</button>
   <label>Ayah <input id="ayahJump" type="number" min="1" placeholder="Ayah"></label><button id="jumpBtn">Go</button>
   <label>Range <input id="rangeFrom" type="number" min="1" placeholder="From"></label><label>to <input id="rangeTo" type="number" min="1" placeholder="To"></label><button id="rangeBtn">▶ Range</button>
   <button id="backCatalog">☷ Surah List</button><button id="bookmarkView">🔖 Bookmarks</button>
   <button id="settingsBtn">⚙ Settings</button>
  </div>
  <div class="quran-search" hidden><input id="qSearch" placeholder="Search Arabic, English or Urdu…"><select id="searchScope"><option value="local">Arabic in full Quran</option><option value="en">English translation</option><option value="ur">Urdu translation</option></select><button id="searchBtn">Search</button></div>
  <div id="quranStatus" class="quran-status" role="status" hidden></div>
  <section id="tafsirStudio" class="tafsir-studio" aria-label="Tafseer study workspace">
   <div class="tafsir-studio-head"><span class="tafsir-kicker">LITTLE MUSLIM LEARNERS · TAFSEER</span><h3>Study an Ayah in depth</h3><p>Select a Surah and Ayah to view the existing source-based Tafseer. Quran text and source content are not rewritten.</p></div>
   <div class="tafsir-selectors"><label>Surah<select id="tafsirSurahSelect">${LML_QURAN.surahs.map(s=>`<option value="${s.number}">${s.number}. ${esc(s.name)}</option>`).join("")}</select></label><label>Ayah number<input id="tafsirAyahSelect" type="number" min="1" value="1"></label><label>Language<select id="tafsirLanguage"><option value="ur">اردو</option><option value="en">English</option><option value="hi">हिन्दी</option></select></label><button type="button" id="loadTafseerStudio">Open Tafseer</button></div>
   <div id="tafsirAyahPreview" class="tafsir-ayah-preview" aria-live="polite"></div>
   <div id="tafsirStudioContent" class="tafsir-studio-content"><div class="tafsir-empty"><span>۞</span><b>Select an Ayah to begin</b><p>Your existing Tafseer source will appear here when available.</p></div></div>
  </section>
  <div id="surahHead"></div><div id="quranList"></div>
  <div class="audio-dock"><b>Audio Recitation · Mishary Rashid Alafasy</b><button id="prevAudio">← Ayah</button><button id="nextAudio">Ayah →</button><button id="pauseAudio">Ⅱ Pause</button><button id="repeatAyah">↻ Ayah</button><button id="repeatOff">↻ Off</button><label>Speed <select id="audioSpeed"><option>0.75</option><option selected>1</option><option>1.25</option><option>1.5</option></select></label><label>Volume <input id="audioVolume" type="range" min="0" max="1" step=".05" value="1"></label><label><input id="audioScroll" type="checkbox" ${autoScroll?"checked":""}> Auto-scroll</label></div>
  <div class="quran-bottom"><button id="prevSurah">← Previous Surah</button><button id="nextSurah">Next Surah →</button></div>
  <div class="quran-credit">Qur'an text: local Tanzil/Uthmani dataset supplied with this project. Translations and recitation are streamed from AlQuran Cloud / Islamic Network. Tafseer source: existing spa5k Quran.com tafsir dataset. Translation copyrights remain with their respective translators.</div>
 </section>`;
 bindShell();
}
function bindShell(){
 $("#surahSelect").value=String(currentSurah);
 $("#tafsirSurahSelect").value=String(currentSurah);
 $("#tafsirLanguage").value=settings.language==="ur"?"ur":settings.language==="hi"?"hi":"en";
 $("#modeQuran").onclick=()=>setMode("quran");
 $("#modeTafseer").onclick=()=>setMode("tafsir");
 $("#loadTafseerStudio").onclick=loadTafseerStudio;
 $("#tafsirSurahSelect").onchange=()=>{const sn=+$("#tafsirSurahSelect").value;$("#tafsirAyahSelect").max=getSurah(sn).ayahs;$("#tafsirAyahSelect").value=1};
 $("#tafsirLanguage").onchange=e=>{settings.language=e.target.value;saveSettings()};
 applyReaderMode();
 $("#catalogContinue").onclick=()=>{const [s,a]=readProgress().split(":").map(Number);openSurahReader(s||1,a||1)};
 $("#surahSearch").oninput=renderSurahCatalogItems;
 $("#surahListView").onclick=()=>setCatalogView("list");
 $("#surahGridView").onclick=()=>setCatalogView("grid");
 $("#catalogBookmarks").onclick=()=>{showReaderArea();renderBookmarks()};
 $("#catalogHistory").onclick=()=>{showReaderArea();renderHistory()};
 $("#catalogJuz").onclick=renderJuzDirectory;
 $("#catalogSettings").onclick=openSettings;
 $("#readerSettingsTop").onclick=openSettings;
 const menu=$("#readerMenuToggle"),drawer=$("#readerDrawer"),scrim=$("#readerScrim");
 const closeDrawer=()=>{drawer.hidden=true;scrim.hidden=true;menu?.setAttribute("aria-expanded","false")};
 menu.onclick=()=>{drawer.hidden=!drawer.hidden;scrim.hidden=drawer.hidden;menu.setAttribute("aria-expanded",String(!drawer.hidden))};
 $("#readerDrawerClose").onclick=closeDrawer;scrim.onclick=closeDrawer;
 drawer.querySelectorAll("[data-reader-nav]").forEach(b=>b.onclick=()=>{closeDrawer();const action=b.dataset.readerNav;
  if(action==="surah")showSurahCatalog();else if(action==="juz")renderJuzDirectory();else if(action==="bookmarks"){showReaderArea();renderBookmarks()}else if(action==="history"){showReaderArea();renderHistory()}else if(action==="settings")openSettings();else if(action==="tafsir")setMode("tafsir");else if(action==="search"){showReaderArea();$(".quran-search").hidden=false;$("#qSearch").focus()}else if(action==="pages"){showReaderArea();$("#pageJump").focus();status("Enter a Mushaf page number from 1 to 604.","ok")}
 });
 $("#surahSelect").onchange=()=>loadSurah(+$("#surahSelect").value,1);
 $("#juzSelect").onchange=async e=>{if(e.target.value)await loadJuz(+e.target.value)};
 $("#hizbSelect").onchange=async e=>{if(e.target.value)await loadHizb(+e.target.value)};
 $("#pageBtn").onclick=async()=>{const n=+$("#pageJump").value;if(n)await loadPage(n)};
 $("#jumpBtn").onclick=()=>{let a=+$("#ayahJump").value;if(a)scrollToKey(`${currentSurah}:${a}`)};
 $("#rangeBtn").onclick=()=>{let a=+$("#rangeFrom").value,b=+$("#rangeTo").value;if(a&&b)playRange(`${currentSurah}:${a}`,`${currentSurah}:${b}`)};
 $("#prevAudio").onclick=()=>stepAudio(-1);
 $("#nextAudio").onclick=()=>stepAudio(1);
 $("#pauseAudio").onclick=()=>audio?.pause();
 $("#repeatAyah").onclick=()=>{if(audioQueue.length){repeatMode="ayah";audio?.play()}};
 $("#repeatOff").onclick=()=>{repeatMode="none"};
 $("#audioSpeed").onchange=e=>{if(audio)audio.playbackRate=+e.target.value};
 $("#audioVolume").oninput=e=>{if(audio)audio.volume=+e.target.value};
 $("#audioScroll").onchange=e=>{autoScroll=e.target.checked;settings.autoScroll=autoScroll;saveSettings()};
 $("#continueBtn").onclick=()=>{let [s,a]=readProgress().split(":").map(Number);loadSurah(s,a)};
 $("#backCatalog").onclick=showSurahCatalog;
 $("#bookmarkView").onclick=renderBookmarks;
 $("#settingsBtn").onclick=openSettings;
 $("#searchBtn").onclick=searchQuran;
 $("#qSearch").onkeydown=e=>{if(e.key==="Enter")searchQuran()};
 $("#prevSurah").onclick=()=>currentSurah>1&&loadSurah(currentSurah-1,1);
 $("#nextSurah").onclick=()=>currentSurah<114&&loadSurah(currentSurah+1,1);
}
function showSurahCatalog(){
 const catalog=$("#surahCatalog");if(!catalog)return;
 catalog.hidden=false;
 ["#quran-toolbar",".quran-toolbar",".quran-search","#quranStatus","#tafsirStudio","#surahHead","#quranList",".audio-dock",".quran-bottom"].forEach(sel=>{const el=root.querySelector(sel);if(el)el.hidden=true});
 renderSurahCatalogItems();
 applyReaderTheme();
}
function showReaderArea(){
 const catalog=$("#surahCatalog");if(catalog)catalog.hidden=true;
 const studio=$("#tafsirStudio");if(studio)studio.hidden=true;
 [".quran-toolbar",".quran-search","#quranStatus","#surahHead","#quranList",".audio-dock",".quran-bottom"].forEach(sel=>{const el=root.querySelector(sel);if(el)el.hidden=false});
}
function openSurahReader(n,ayah=1){
 showReaderArea();
 const studio=$("#tafsirStudio");if(studio)studio.hidden=true;
 loadSurah(n,ayah);
}
function renderJuzDirectory(){
 const catalog=$("#surahCatalog");if(catalog)catalog.hidden=true;
 [".quran-toolbar",".quran-search","#quranStatus","#tafsirStudio","#surahHead","#quranList",".audio-dock",".quran-bottom"].forEach(sel=>{const el=root.querySelector(sel);if(el)el.hidden=true});
 const old=$("#lmlJuzDirectory");if(old)old.remove();
 const panel=document.createElement("section");panel.id="lmlJuzDirectory";panel.className="lml-juz-directory";
 panel.innerHTML=`<div class="catalog-heading"><div><span class="settings-kicker">THE HOLY QURAN</span><h3>30 Juz / Para</h3><p>Select a Juz to open its authentic Quran text and available translations.</p></div><button type="button" id="juzBackSurahs">← Surah List</button></div><div class="lml-juz-grid">${Array.from({length:30},(_,i)=>`<button type="button" class="lml-juz-card" data-open-juz="${i+1}"><span class="lml-juz-num">${String(i+1).padStart(2,"0")}</span><b>Juz ${i+1}</b><small>Open Para ${i+1}</small></button>`).join("")}</div>`;
 root.querySelector(".quran-app").insertBefore(panel,root.querySelector(".quran-toolbar"));
 $("#juzBackSurahs").onclick=()=>{panel.remove();showSurahCatalog()};
 panel.querySelectorAll("[data-open-juz]").forEach(b=>b.onclick=async()=>{panel.remove();showReaderArea();await loadJuz(+b.dataset.openJuz)});
}
function setCatalogView(mode){
 const grid=$("#surahCatalogItems");if(!grid)return;
 grid.classList.toggle("is-grid",mode==="grid");
 $("#surahListView").classList.toggle("active",mode==="list");
 $("#surahGridView").classList.toggle("active",mode==="grid");
 try{localStorage.setItem("lml-quran-catalog-view-v1",mode)}catch{}
}
async function renderSurahCatalogItems(){
 const box=$("#surahCatalogItems");if(!box)return;
 const q=($("#surahSearch")?.value||"").trim().toLowerCase();
 const list=LML_QURAN.surahs.filter(s=>!q||String(s.number)===q||s.name.toLowerCase().includes(q));
 box.innerHTML=list.map(s=>`<button class="surah-catalog-card" type="button" data-surah="${s.number}">
  <span class="catalog-number">${s.number}</span><span class="catalog-info"><b>${esc(s.name)}</b><small>${s.ayahs} Ayat · ${s.revelation}</small></span><span class="catalog-open">Open <span aria-hidden="true">→</span></span>
 </button>`).join("")||'<p class="empty-state">No Surah matches your search.</p>';
 box.querySelectorAll("[data-surah]").forEach(b=>b.onclick=()=>openSurahReader(+b.dataset.surah,1));
 const saved=localStorage.getItem("lml-quran-catalog-view-v1")||"list";setCatalogView(saved);
 // Enrich the catalogue with Arabic chapter names when the metadata service is reachable.
 if(!window.__lmlSurahArabicNames){
  window.__lmlSurahArabicNames={};
  api(`${API}/surah`).then(j=>{
   (j.data||[]).forEach(s=>window.__lmlSurahArabicNames[s.number]=s.name);
   box.querySelectorAll("[data-surah]").forEach(b=>{const s=LML_QURAN.surahs[+b.dataset.surah-1],ar=window.__lmlSurahArabicNames[s.number];if(ar){const info=b.querySelector(".catalog-info");if(info&&!info.querySelector(".catalog-arabic"))info.insertAdjacentHTML("afterbegin",`<strong class="catalog-arabic" lang="ar" dir="rtl">${esc(ar)}</strong>`)}});
  }).catch(()=>{});
 }else box.querySelectorAll("[data-surah]").forEach(b=>{const ar=window.__lmlSurahArabicNames[b.dataset.surah];if(ar)b.querySelector(".catalog-info")?.insertAdjacentHTML("afterbegin",`<strong class="catalog-arabic" lang="ar" dir="rtl">${esc(ar)}</strong>`)});
}
function renderHistory(){
 const hs=readHistory();$("#surahHead").innerHTML=`<div class="search-head"><h3>Reading History</h3><p>Recently opened Ayat saved on this device.</p><button id="closeSearch">← Back to Surah</button></div>`;
 $("#closeSearch").onclick=showSurahCatalog;
 $("#quranList").innerHTML=hs.length?hs.map(k=>{const v=BYKEY.get(k);return `<article class="search-result"><b>${k}</b><p class="arabic-small" dir="rtl">${esc(v?.text||"")}</p><button data-open="${k}">Open Ayah</button></article>`}).join(""):'<div class="empty-state">No reading history yet.</div>';
 $("#quranList").querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{const [s,a]=b.dataset.open.split(":").map(Number);openSurahReader(s,a)});
}
function applyReaderMode(){
 if(!root?.isConnected)return;
 const taf=readerMode==="tafsir";
 const one=s=>root.querySelector(s);
 root.classList.toggle("is-tafsir-mode",taf);
 const q=one("#modeQuran"),t=one("#modeTafseer");
 if(q){q.classList.toggle("active",!taf);q.setAttribute("aria-selected",String(!taf))}
 if(t){t.classList.toggle("active",taf);t.setAttribute("aria-selected",String(taf))}
 const heading=one("#readerHeading"),subheading=one("#readerSubheading");
 if(heading)heading.textContent=taf?"Tafseer Study":"Quran Reader";
 if(subheading)subheading.textContent=taf?"Explore the meaning of selected Ayat through the existing source-based Tafseer.":"A calm, focused space to read, listen, reflect and study the Qur'an.";
 const studio=one("#tafsirStudio"),list=one("#quranList"),head=one("#surahHead"),search=one(".quran-search");
 if(studio)studio.hidden=!taf;
 if(list)list.hidden=taf;
 if(head)head.hidden=taf;
 if(search)search.hidden=taf;
}
function status(t,type=""){let el=$("#quranStatus");if(el){el.textContent=t;el.className="quran-status "+type}}
function setProgressUI(){let p=readProgress();$("#qProgressKey").textContent=p;$("#qProgressText").textContent=`Last position: ${p}`}

async function loadSurah(n,focusAyah=1){
 currentSurah=n;$("#surahSelect").value=String(n);if($("#tafsirSurahSelect")){$("#tafsirSurahSelect").value=String(n);$("#tafsirAyahSelect").max=getSurah(n).ayahs}setProgressUI();status("Loading Surah…");
 const s=getSurah(n); verses=surahVerses(n);translations={};
 // Render the complete local Arabic Quran immediately. External translations must never block the reader.
 renderHeader(s);renderVerses();
 if(focusAyah) setTimeout(()=>scrollToKey(`${n}:${focusAyah}`,false),100);
 loadMeta(n).then(()=>renderMetaBits()).catch(()=>{});
 status(`${s.name} loaded — ${s.ayahs} ayat`,"ok");
 // Load optional translations in the background and refresh only after they arrive.
 loadSelectedTranslations(n).then(()=>{renderVerses();if(focusAyah)setTimeout(()=>scrollToKey(`${n}:${focusAyah}`,false),50)}).catch(()=>{});
}
async function loadSelectedTranslations(n){
 if(!settings.showTranslations||!settings.selected.length)return;
 const jobs=settings.selected.filter(k=>editions[k]).map(async k=>{
  try{
   let j;
   if(k==="hi") j=await api(`${QENC}/translation/sura/hi.hindi/${n}`);
   else j=await api(`${API}/surah/${n}/${editions[k].id}`);
   const arr=k==="hi"?(Array.isArray(j)?j:(j.data||[])):(j.data?.ayahs||[]);
   translations[k]=arr.map(x=>({numberInSurah:x.numberInSurah??x.aya,text:x.text??x.translation??""}));
  }catch(e){console.warn("Translation unavailable",k,e);translations[k]=[]}
 });
 await Promise.all(jobs);
}
function renderHeader(s){
 const lang=settings.language||"en";
 $("#surahHead").innerHTML=`<div class="surah-header"><div><span class="surah-number">${s.number}</span><div><h3>${esc(s.name)}</h3><p>${s.ayahs} Ayat · ${s.revelation} · <span id="surahMeta">Juz metadata loading…</span> · <span id="memoryMeta">Memorized 0/${s.ayahs}</span></p></div></div><div class="surah-tools"><button id="infoBtn">ℹ Surah info</button><button id="playSurah">▶ Play Surah</button><button id="stopAudio">■ Stop</button></div></div>`;
 $("#infoBtn").onclick=()=>loadSurahInfo(s.number,lang);
 $("#playSurah").onclick=()=>{audioQueue=verses.map(v=>v.key);queueIndex=0;repeatMode="surah";playCurrentAudio()};
 $("#stopAudio").onclick=stopAudio;
}
function renderVerses(){
 const list=$("#quranList"); if(!list)return;
 list.classList.toggle("quran-continuous",settings.layout==="continuous");
 list.style.setProperty("--ayah-line-height",String(settings.lineHeight||2.05));
 list.style.setProperty("--ayah-font-family",settings.arabicFont==="naskh"?"'Noto Naskh Arabic',serif":settings.arabicFont==="amiri"?"'Amiri',serif":"serif");
 list.innerHTML=verses.map(v=>verseHTML(v)).join("");applyReaderTheme();
 bindVerseButtons();
}
function verseHTML(v){
 const trs=Object.entries(translations).map(([k,arr])=>{let source=translations[`${k}:${v.surah}`]||arr;let x=source.find(a=>a.numberInSurah===v.ayah);return x?`<div class="translation ${editions[k].dir}" data-lang="${k}"><small>${esc(editions[k].label)}</small><div>${x.text}</div></div>`:""}).join("");
 return `<article class="ayah-card ${isBookmarked(v.key)?"bookmarked":""}" id="ayah-${v.key.replace(":","-")}" data-key="${v.key}">
 <div class="ayah-top"><span class="ayah-ref">${v.key}</span><span class="ayah-badges" id="meta-${v.key.replace(":","-")}"></span></div>
 <div class="ayah-arabic" style="font-size:${settings.fontSize}px" dir="rtl">${v.text}</div>
 ${settings.showTranslations?`<div class="translations" style="font-size:${settings.translationSize}px">${trs||`<div class="translation muted">Translation is unavailable for this passage.</div>`}</div>`:""}
 <div class="ayah-actions">
  <button data-action="play">▶ Listen</button>${settings.showWordByWord?`<button data-action="word">🔤 Word-by-word</button>`:""}${settings.showTafsir?`<button data-action="tafsir">📚 Tafseer</button>`:""}<button data-action="practice">🎯 Practice</button>
  <button data-action="bookmark">${isBookmarked(v.key)?"🔖 Saved":"🔖 Bookmark"}</button><button data-action="copy">⧉ Copy</button><button data-action="share">↗ Share</button>
 </div><div class="ayah-extra" id="extra-${v.key.replace(":","-")}"></div></article>`;
}
function bindVerseButtons(){
 document.querySelectorAll(".ayah-card").forEach(card=>{
  const k=card.dataset.key;
  card.querySelectorAll("button[data-action]").forEach(b=>b.onclick=()=>verseAction(k,b.dataset.action));
  card.onclick=()=>rememberProgress(k);
 });
}
function renderVerseActions(k){let c=document.querySelector(`[data-key="${k}"]`);if(!c)return;c.classList.toggle("bookmarked",isBookmarked(k));let b=c.querySelector('[data-action="bookmark"]');if(b)b.textContent=isBookmarked(k)?"🔖 Saved":"🔖 Bookmark"}
async function verseAction(k,a){
 rememberProgress(k);setProgressUI();
 if(a==="play")return playVerse(k);
 if(a==="word")return showWords(k);
 if(a==="tafsir")return showTafsir(k);
 if(a==="practice")return showPractice(k);
 if(a==="bookmark")return toggleBookmark(k);
 if(a==="copy")return copyVerse(k);
 if(a==="share")return shareVerse(k);
}
function scrollToKey(k,focus=true){let el=document.getElementById("ayah-"+k.replace(":","-"));if(el){el.scrollIntoView({behavior:"smooth",block:"center"});if(focus){el.classList.add("manual-focus");setTimeout(()=>el.classList.remove("manual-focus"),1200)}}else status("That Ayah is not in the current view.","warn")}
function highlight(k){document.querySelectorAll(".ayah-card.playing").forEach(x=>x.classList.remove("playing"));let el=document.querySelector(`[data-key="${k}"]`);if(el){el.classList.add("playing");if(autoScroll)el.scrollIntoView({behavior:"smooth",block:"center"})}}
async function playVerse(k){await playQueue([k],"verse")}
async function playRange(from,to){let a=QVERSES.findIndex(v=>v.key===from),b=QVERSES.findIndex(v=>v.key===to);if(a<0||b<0)return;audioQueue=QVERSES.slice(Math.min(a,b),Math.max(a,b)+1).map(v=>v.key);queueIndex=0;repeatMode="range";repeatFrom=from;repeatTo=to;playCurrentAudio()}
function audioUrl(k){let v=BYKEY.get(k);return `${AUDIO}/${String(v.global+1).padStart(1,"0")}.mp3`}
async function playQueue(keys,mode="queue"){audioQueue=keys;queueIndex=0;repeatMode=mode;playCurrentAudio()}
function stepAudio(delta){if(!audioQueue.length){const p=readProgress();audioQueue=[p];queueIndex=0}queueIndex=Math.max(0,Math.min(audioQueue.length-1,queueIndex+delta));repeatMode="none";playCurrentAudio()}
function playCurrentAudio(){
 if(!audioQueue.length)return;
 const k=audioQueue[queueIndex];highlight(k);rememberProgress(k);
 if(audio){audio.pause();audio.src=""}
 audio=new Audio(audioUrl(k));audio.preload="auto";audio.playbackRate=+(document.getElementById("audioSpeed")?.value||1);audio.volume=+(document.getElementById("audioVolume")?.value||1);
 audio.onended=()=>{if(repeatMode==="ayah"){playCurrentAudio();return}if(queueIndex<audioQueue.length-1){queueIndex++;playCurrentAudio()}else if(repeatMode==="surah"){queueIndex=0;playCurrentAudio()}else if(settings.autoPlayNext){stopAudio()}else stopAudio()};
 audio.onerror=()=>{status(`Audio could not be loaded for ${k}. Please check your connection and try again.`,"error")};
 audio.onplay=()=>status(`Playing Mishary Rashid Alafasy — ${k}`,"ok");
 audio.play().catch(()=>status("Tap Listen again to start audio. Browser autoplay rules may block playback.","warn"));
}
function stopAudio(){if(audio){audio.pause();audio.currentTime=0}document.querySelectorAll(".ayah-card.playing").forEach(x=>x.classList.remove("playing"));audioQueue=[];queueIndex=0}
function playCurrentRepeat(k){audioQueue=[k];queueIndex=0;repeatMode="ayah";playCurrentAudio()}
async function showWords(k){
 const box=document.querySelector("#extra-"+k.replace(":","-"));if(!box)return;
 const lang=settings.language||"en";
 box.innerHTML=`<div class="loading">Loading word-by-word meanings…</div>`;
 try{
  const j=await api(`${QDC}/verses/by_key/${encodeURIComponent(k)}?words=true&word_translation_language=${encodeURIComponent(lang)}`);
  const words=(j.verse||j.data||{}).words||[];
  if(!words.length)throw new Error("No word data");
  const label=lang==="ur"?"اردو":lang==="hi"?"हिन्दी":"English";
  box.innerHTML=`<div class="word-panel ${lang!=="en"?"rtl-soft":""}"><b>Word-by-word — ${label}</b><div class="word-grid">${words.filter(w=>w.char_type_name==="word"||!w.char_type_name).map(w=>`<span><strong>${esc(w.text_uthmani||w.text)}</strong><small>${esc(w.translation?.text||w.translation_en||w.translation?.[lang]||"")}</small></span>`).join("")}</div><small>Source: Quran.com/QDC word data.</small></div>`;
 }catch(e){box.innerHTML=`<div class="quran-error">Word-by-word data is temporarily unavailable for this language. Arabic and the selected verse translation remain available.</div>`}
}
async function loadTafseerStudio(){
 const sn=+$("#tafsirSurahSelect").value,an=+$("#tafsirAyahSelect").value,lang=$("#tafsirLanguage").value;
 if(!sn||!an||an<1||an>getSurah(sn).ayahs){status("Please choose a valid Surah and Ayah number.","warn");return}
 settings.language=lang;saveSettings();
 const v=BYKEY.get(`${sn}:${an}`);const preview=$("#tafsirAyahPreview");
 preview.innerHTML=`<div class="tafsir-preview-ref">SURAH ${sn} · AYAH ${an}</div><div class="tafsir-preview-arabic" dir="rtl">${v?.text||""}</div>`;
 const box=$("#tafsirStudioContent");box.innerHTML=`<div class="loading">Loading the existing Tafseer source…</div>`;
 if(sn!==currentSurah)await loadSurah(sn,an);else rememberProgress(`${sn}:${an}`);
 await showTafsir(`${sn}:${an}`,box);
 status(`Tafseer request: ${getSurah(sn).name} · Ayah ${an}`,"ok");
}
async function showTafsir(k,targetBox=null){
 const box=targetBox||document.querySelector("#extra-"+k.replace(":","-"));if(!box)return;
 const lang=settings.language||"en";
 box.innerHTML=`<div class="loading">Loading verified Tafseer…</div>`;
 try{
  const [sn,an]=k.split(":").map(Number);
  let title="",txt="",source="";
  if(lang==="hi"){
   const j=await api(`${QENC}/translation/aya/hindi_mokhtasar/${sn}/${an}`);
   txt=j.translation||""; title="हिन्दी — Al-Mukhtasar"; source="QuranEnc.com — Hindi Al-Mukhtasar";
  }else{
   const slug=lang==="ur"?"tafseer-ibn-e-kaseer-urdu":"en-tafisr-ibn-kathir";
   const j=await fetch(`${TAFSIR}/${slug}/${sn}/${an}.json`).then(r=>{if(!r.ok)throw new Error("not found");return r.json()});
   txt=typeof j==="string"?j:(j.text||j.tafsir||j.content||j.ayah||""); title=lang==="ur"?"Tafseer Ibn Kathir — اردو":"Tafseer Ibn Kathir — English"; source="spa5k tafsir dataset, sourced from Quran.com";
  }
  if(!txt)throw new Error("empty");
  box.innerHTML=`<div class="tafsir-panel ${lang==="ur"||lang==="hi"?"rtl":""}"><b>${title}</b><p>${esc(txt)}</p><small>Source: ${esc(source)}. Tafseer is displayed as source text and is not AI-generated.</small></div>`;
 }catch(e){box.innerHTML=`<div class="quran-error">Verified Tafseer text could not be loaded right now. No generated explanation is shown.</div>`}
}
function showPractice(k){
 const box=document.querySelector("#extra-"+k.replace(":","-"));if(!box)return;
 box.innerHTML=`<div class="practice-panel"><b>Memorization practice — ${k}</b><p>Listen, pause, recite aloud, then mark this Ayah as practiced.</p><div><button data-practice-play>▶ Listen</button><button data-practice-done>✓ Mark practiced</button></div><span id="practiceMsg"></span></div>`;
 box.querySelector("[data-practice-play]").onclick=()=>playCurrentRepeat(k);
 box.querySelector("[data-practice-done]").onclick=()=>{markMemorized(k);box.querySelector("#practiceMsg").textContent="Practice saved on this device. ⭐"};
}
function markMemorized(k){let p;try{p=JSON.parse(localStorage.getItem("lml-quran-memorized-v1")||"[]")}catch{p=[]}if(!p.includes(k))p.push(k);localStorage.setItem("lml-quran-memorized-v1",JSON.stringify(p))}
function copyVerse(k){
 const v=BYKEY.get(k);const c=document.querySelector(`[data-key="${k}"]`);
 const tr=[...c.querySelectorAll(".translation")].map(x=>x.innerText).join("\n");
 navigator.clipboard?.writeText(`${v.text}\n\n${tr}\n\n(${k})`).then(()=>status("Ayah copied.","ok")).catch(()=>status("Copy permission was blocked by the browser.","warn"));
}
async function shareVerse(k){
 const v=BYKEY.get(k),text=`${v.text}\n\nQuran ${k}`;
 if(navigator.share){try{await navigator.share({title:`Quran ${k}`,text})}catch{}}
 else{await navigator.clipboard?.writeText(text);status("Verse copied for sharing.","ok")}
}
async function loadMeta(n){
 if(metaCache[n])return metaCache[n];
 try{const j=await api(`${API}/surah/${n}/quran-uthmani`);metaCache[n]=j.data.ayahs||[];return metaCache[n]}catch{return[]}
}
function renderMetaBits(){
 const arr=metaCache[currentSurah]||[];
 arr.forEach(x=>{let el=document.getElementById("meta-"+x.numberInSurah);if(!el)return;el.innerHTML=`${x.juz?`<span>Juz ${x.juz}</span>`:""}${x.ruku?`<span>Ruku ${x.ruku}</span>`:""}${x.page?`<span>Page ${x.page}</span>`:""}${x.sajda?`<span class="sajda">Sajdah</span>`:""}`});
 const first=arr[0];if(first&&$("#surahMeta"))$("#surahMeta").textContent=`Juz ${first.juz||"—"} · Page ${first.page||"—"}`;const mem=new Set(JSON.parse(localStorage.getItem("lml-quran-memorized-v1")||"[]"));const done=verses.filter(v=>mem.has(v.key)).length;if($("#memoryMeta"))$("#memoryMeta").textContent=`Memorized ${done}/${getSurah(currentSurah).ayahs}`;
}
async function loadHizb(n){
 status(`Loading Hizb ${n}…`);
 try{
  const quarter=(n-1)*4+1;const j=await api(`${API}/hizbQuarter/${quarter}/quran-uthmani`);
  const first=j.data?.ayahs?.[0];if(!first)throw new Error("empty");
  await loadSurah(first.surah.number,first.numberInSurah);
  status(`Hizb ${n} begins at ${first.surah.number}:${first.numberInSurah} (first quarter).`,"ok");
 }catch(e){status("Hizb data could not be loaded. Please try again.","error")}
}
async function loadPage(n){
 status(`Loading Mushaf page ${n}…`);
 try{
  const j=await api(`${API}/page/${n}/quran-uthmani`);
  const first=j.data?.ayahs?.[0];if(!first)throw new Error("empty");
  await loadSurah(first.surah.number,first.numberInSurah);
  status(`Mushaf page ${n} begins at ${first.surah.number}:${first.numberInSurah}. Page metadata is supplied by AlQuran Cloud.`,"ok");
 }catch(e){status("Page data could not be loaded. Please check the page number and connection.","error")}
}
async function loadJuz(n){
 status(`Loading Juz ${n}…`);
 try{
  if(!juzCache[n])juzCache[n]=(await api(`${API}/juz/${n}/quran-uthmani`)).data;
  const arr=juzCache[n].ayahs||[]; if(!arr.length)throw new Error("empty");
  const first=arr[0],last=arr[arr.length-1];
  const start=QVERSES.findIndex(v=>v.key===`${first.surah.number}:${first.numberInSurah}`);
  const end=QVERSES.findIndex(v=>v.key===`${last.surah.number}:${last.numberInSurah}`);
  if(start<0||end<0)throw new Error("mapping failed");
  const subset=QVERSES.slice(start,end+1);
  verses=subset; currentSurah=first.surah.number; translations={};
  // Fetch selected translations for each surah represented in this Juz.
  const surahs=[...new Set(subset.map(v=>v.surah))];
  if(settings.showTranslations){
   await Promise.all(surahs.map(async sn=>{
    await Promise.all(settings.selected.filter(k=>editions[k]).map(async k=>{
     try{
      const j=await api(`${API}/surah/${sn}/${editions[k].id}`);
      translations[`${k}:${sn}`]=j.data.ayahs||[];
     }catch{translations[`${k}:${sn}`]=[]}
    }));
   }));
  }
  $("#surahHead").innerHTML=`<div class="surah-header"><div><span class="surah-number">J${n}</span><div><h3>Juz ${n}</h3><p>${first.key} → ${last.key} · ${subset.length} Ayat in this Juz</p></div></div><div class="surah-tools"><button id="playJuz">▶ Play Juz</button><button id="backToSurah">↩ Current Surah</button></div></div>`;
  $("#playJuz").onclick=()=>{audioQueue=subset.map(v=>v.key);queueIndex=0;repeatMode="range";playCurrentAudio()};
  $("#backToSurah").onclick=()=>loadSurah(currentSurah,first.numberInSurah);
  renderVerses();
  status(`Juz ${n} loaded — ${subset.length} Ayat`,"ok");
 }catch(e){console.warn(e);status("Juz data could not be loaded. Please try again.","error")}
}
async function loadSurahInfo(n,lang){
 const box=document.createElement("dialog");box.className="quran-info-dialog";box.innerHTML=`<div><button class="close-info">×</button><h3>Surah ${n} information</h3><p>Loading…</p></div>`;document.body.appendChild(box);box.showModal();box.querySelector(".close-info").onclick=()=>box.close();
 try{
  const j=await api(`${QDC}/chapters/${n}/info?language=${lang==="ur"?"ur":"en"}`);
  const info=j.chapter_info||j.info||j.data||{};const txt=info.text||info.short_text||info.content||"";
  box.querySelector("p").innerHTML=txt?esc(txt).replace(/\n/g,"<br>"):`${esc(getSurah(n).name)} — ${getSurah(n).ayahs} Ayat · ${getSurah(n).revelation}`;
 }catch{box.querySelector("p").textContent=`${getSurah(n).name} — ${getSurah(n).ayahs} Ayat · ${getSurah(n).revelation}. A full introduction could not be loaded at this time.`}
}
async function searchQuran(){
 const q=$("#qSearch").value.trim();if(!q)return;
 const scope=$("#searchScope").value;status("Searching…");
 if(scope==="local"){
  const needle=q.normalize("NFKC").toLowerCase();const hits=QVERSES.filter(v=>v.text.normalize("NFKC").toLowerCase().includes(needle)).slice(0,100);
  showSearchResults(hits.map(v=>({key:v.key,text:v.text,kind:"Arabic"})),q);return;
 }
 try{
  const ed=editions[scope].id;const j=await api(`${API}/search/${encodeURIComponent(q)}/all/${ed}`);const hits=(j.data?.matches||[]).slice(0,100);
  showSearchResults(hits.map(x=>({key:`${x.surah.number}:${x.numberInSurah}`,text:x.text,kind:editions[scope].label})),q);
 }catch{status("Search service is temporarily unavailable.","error")}
}
function showSearchResults(hits,q){
 const list=$("#quranList");$("#surahHead").innerHTML=`<div class="search-head"><h3>Search results</h3><p>${hits.length} result(s) for “${esc(q)}”</p><button id="closeSearch">← Back to Quran</button></div>`;
 $("#closeSearch").onclick=()=>loadSurah(currentSurah,1);
 list.innerHTML=hits.map(h=>`<article class="search-result"><a href="#ayah-${h.key.replace(":","-")}" data-search-key="${h.key}"><b>${h.key}</b></a><p class="${h.kind.includes("Urdu")?"rtl":""}">${esc(h.text)}</p><button data-open="${h.key}">Open Ayah</button></article>`).join("")||`<div class="empty-state">No matches found.</div>`;
 list.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{let [s,a]=b.dataset.open.split(":").map(Number);loadSurah(s,a)});
 status(`${hits.length} result(s)`,"ok");
}
function renderBookmarks(){
 const bs=bookmarks();$("#surahHead").innerHTML=`<div class="search-head"><h3>🔖 Saved Ayat</h3><p>${bs.length} bookmark(s) stored on this device.</p><button id="closeSearch">← Back to Quran</button></div>`;$("#closeSearch").onclick=()=>loadSurah(currentSurah,1);
 $("#quranList").innerHTML=bs.length?bs.map(k=>{let v=BYKEY.get(k);return `<article class="search-result"><b>${k}</b><p class="arabic-small" dir="rtl">${esc(v?.text||"")}</p><button data-open="${k}">Open Ayah</button><button data-remove="${k}">Remove</button></article>`}).join(""):`<div class="empty-state">No bookmarks yet.</div>`;
 $("#quranList").querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{let [s,a]=b.dataset.open.split(":").map(Number);loadSurah(s,a)});
 $("#quranList").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{toggleBookmark(b.dataset.remove);renderBookmarks()});
}
function openSettings(){
 const d=document.createElement("dialog");d.className="quran-settings";d.innerHTML=`<form method="dialog" class="settings-form">
  <div class="settings-head"><div><span class="settings-kicker">LITTLE MUSLIM LEARNERS · QURAN</span><h3>Little Muslim Learners — Reading Settings</h3><p>Personal settings — saved only on this browser/device.</p></div><button value="cancel" class="settings-x">×</button></div>
  <div class="settings-tabs"><button type="button" class="settings-tab active" data-panel="reading">📖 Reading</button><button type="button" class="settings-tab" data-panel="audio">🎧 Audio</button><button type="button" class="settings-tab" data-panel="display">✨ Display</button><button type="button" class="settings-tab" data-panel="personal">🔖 Personal</button></div>
  <div class="settings-panel active" data-panel="reading">
   <div class="setting-grid">
    <label class="setting-card"><span>Reading language</span><select id="readerLang"><option value="en" ${settings.language==="en"?"selected":""}>English</option><option value="ur" ${settings.language==="ur"?"selected":""}>اردو</option><option value="hi" ${settings.language==="hi"?"selected":""}>हिन्दी</option></select><small>Translation, Tafseer and word-by-word follow this language.</small></label>
    <div class="setting-card translation-choice-card"><span>Translations (select one or more)</span><div class="translation-choice-list">${Object.entries(editions).map(([k,e])=>`<label><input type="checkbox" name="translationChoice" value="${k}" ${settings.selected.includes(k)?"checked":""}><span>${esc(e.label)}</span></label>`).join("")}</div></div>
   </div>
   <label class="switch-row"><span><b>Show translation</b><small>Display the selected language translation below Arabic.</small></span><input id="showTrans" type="checkbox" ${settings.showTranslations?"checked":""}></label>
   <label class="switch-row"><span><b>Show Tafseer button</b><small>Open verified source-based Tafseer for each Ayah.</small></span><input id="showTafsir" type="checkbox" ${settings.showTafsir?"checked":""}></label>
   <label class="switch-row"><span><b>Show Word-by-Word</b><small>Enable word-by-word meaning for the selected language.</small></span><input id="showWord" type="checkbox" ${settings.showWordByWord?"checked":""}></label>
  </div>
  <div class="settings-panel" data-panel="audio">
   <label class="switch-row"><span><b>Auto-play next Ayah</b><small>Continue to the next Ayah after audio ends.</small></span><input id="autoPlayNext" type="checkbox" ${settings.autoPlayNext?"checked":""}></label>
   <label class="switch-row"><span><b>Auto-scroll & highlight</b><small>Follow the currently playing Ayah.</small></span><input id="autoScroll" type="checkbox" ${autoScroll?"checked":""}></label>
   <div class="setting-card"><span>Playback speed</span><select id="defaultSpeed"><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></div>
  </div>
  <div class="settings-panel" data-panel="display">
   <div class="setting-grid">
    <label class="setting-card"><span>Arabic font size <output id="arabicOut">${settings.fontSize}px</output></span><input id="fontSize" type="range" min="24" max="58" value="${settings.fontSize}"></label>
    <label class="setting-card"><span>Translation size <output id="transOut">${settings.translationSize}px</output></span><input id="translationSize" type="range" min="14" max="30" value="${settings.translationSize}"></label>
    <label class="setting-card"><span>Tafseer size <output id="tafsirOut">${settings.tafsirSize}px</output></span><input id="tafsirSize" type="range" min="13" max="28" value="${settings.tafsirSize}"></label>
    <label class="setting-card"><span>Reading layout</span><select id="readerLayout"><option value="cards" ${settings.layout==="cards"?"selected":""}>Ayah cards</option><option value="continuous" ${settings.layout==="continuous"?"selected":""}>Continuous reading</option></select></label>
    <label class="setting-card"><span>Appearance</span><select id="readerTheme"><option value="light" ${settings.theme==="light"?"selected":""}>Light</option><option value="dark" ${settings.theme==="dark"?"selected":""}>Dark</option><option value="sepia" ${settings.theme==="sepia"?"selected":""}>Sepia</option><option value="auto" ${settings.theme==="auto"?"selected":""}>System / Auto</option></select></label>
    <label class="setting-card"><span>Arabic font</span><select id="arabicFont"><option value="serif" ${settings.arabicFont==="serif"?"selected":""}>Traditional Serif</option><option value="naskh" ${settings.arabicFont==="naskh"?"selected":""}>Naskh (if installed)</option><option value="amiri" ${settings.arabicFont==="amiri"?"selected":""}>Amiri (if installed)</option></select></label>
    <label class="setting-card"><span>Arabic line spacing</span><input id="lineHeight" type="range" min="1.5" max="3" step=".05" value="${settings.lineHeight||2.05}"></label>
   </div>
  </div>
  <div class="settings-panel" data-panel="personal">
   <div class="personal-note"><b>🔒 Your settings are personal</b><p>Bookmarks, last reading, memorization and reader preferences are stored separately in this browser/device using local storage. They are not sent to Supabase or shared with other visitors.</p></div>
   <button type="button" id="resetQSettings" class="danger-btn">Reset my Quran settings</button>
  </div>
  <div class="settings-footer"><button value="cancel">Cancel</button><button id="saveQSettings" value="default" class="primary">Save & Apply</button></div>
 </form>`;
 document.body.appendChild(d);d.showModal();
 const tabs=d.querySelectorAll(".settings-tab"),panels=d.querySelectorAll(".settings-panel");tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.toggle("active",x===t));panels.forEach(x=>x.classList.toggle("active",x.dataset.panel===t.dataset.panel))});
 const sliders=[["fontSize","arabicOut","px"],["translationSize","transOut","px"],["tafsirSize","tafsirOut","px"]];sliders.forEach(([a,b,u])=>{const x=d.querySelector("#"+a),o=d.querySelector("#"+b);x.oninput=()=>o.value=x.value+u});
 d.querySelector("#readerLang").onchange=e=>{const lang=e.target.value;const cb=d.querySelector(`input[name="translationChoice"][value="${lang}"]`);if(cb)cb.checked=true;};
 d.querySelector("#resetQSettings").onclick=()=>{localStorage.removeItem(SETTINGS_KEY);settings=loadSettings();d.close();setTimeout(()=>mount(),50)};
 d.querySelector("#saveQSettings").onclick=()=>{
  const lang=d.querySelector("#readerLang").value,selected=[...d.querySelectorAll('input[name="translationChoice"]:checked')].map(x=>x.value);
  settings.fontSize=+d.querySelector("#fontSize").value;settings.translationSize=+d.querySelector("#translationSize").value;settings.tafsirSize=+d.querySelector("#tafsirSize").value;settings.showTranslations=d.querySelector("#showTrans").checked;settings.showTafsir=d.querySelector("#showTafsir").checked;settings.showWordByWord=d.querySelector("#showWord").checked;settings.autoPlayNext=d.querySelector("#autoPlayNext").checked;settings.autoScroll=d.querySelector("#autoScroll").checked;autoScroll=settings.autoScroll;settings.language=lang;settings.layout=d.querySelector("#readerLayout").value;settings.selected=selected.length?selected:[lang];settings.theme=d.querySelector("#readerTheme").value;settings.arabicFont=d.querySelector("#arabicFont").value;settings.lineHeight=+d.querySelector("#lineHeight").value;saveSettings();d.close();
  const catalogVisible=!$("#surahCatalog")?.hidden;
  setTimeout(()=>{applyReaderTheme();if(!catalogVisible)loadSurah(currentSurah,1)},50);
 };
}

window.QuranLibrary={mount,mountAudioBridge:()=>mount("quranAudioLibrary"),quranHTML,setMode,playJuz:async n=>{await loadJuz(n);const b=document.getElementById("playJuz");if(b)b.click();},validate:()=>({surahs:LML_QURAN.surahs.length,ayahs:QVERSES.length,ok:LML_QURAN.surahs.length===114&&QVERSES.length===6236})};
})();
