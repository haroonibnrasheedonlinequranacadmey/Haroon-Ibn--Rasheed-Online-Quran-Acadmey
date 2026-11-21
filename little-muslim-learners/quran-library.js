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
 const d={fontSize:30,translationSize:18,tafsirSize:16,arabicFont:"uthmani",arabicLines:2,translationLayout:"line",showTranslations:true,showTafsir:false,showWordByWord:false,autoScroll:true,autoPlayNext:true,layout:"cards",language:"en",selected:["en"],theme:"auto"};
 try{return {...d,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}}catch{return d}
}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function allVerses(){let out=[],g=0,p=0;for(const s of LML_QURAN.surahs){for(let a=1;a<=s.ayahs;a++){let text=LML_QURAN.texts[p++];
 if(a===1 && s.number!==1 && s.number!==9){text=text.replace(/^بِسْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَـٰنِ\s+ٱلرَّحِيمِ\s*/u,"").replace(/^بِسْمِ\s+اللَّهِ\s+الرَّحْمَٰنِ\s+الرَّحِيمِ\s*/u,"")}
 out.push({key:`${s.number}:${a}`,surah:s.number,ayah:a,global:g,text});g++}}return out}
const QVERSES=allVerses(), BYKEY=new Map(QVERSES.map(v=>[v.key,v]));
function surahVerses(n){return QVERSES.filter(v=>v.surah===n)}
function getSurah(n){return LML_QURAN.surahs[n-1]}
function arabicIndicNumber(n){return String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);}
async function api(url){const c=new AbortController();const t=setTimeout(()=>c.abort(),9000);try{const r=await fetch(url,{headers:{Accept:"application/json"},signal:c.signal});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}}
function rememberProgress(key){try{localStorage.setItem("lml-quran-progress-v1",key)}catch{}}
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
 await loadSurah(currentSurah,pa||1);
 const picker=document.getElementById("surahPicker"),toggle=document.getElementById("surahListToggle");if(picker){picker.hidden=false;toggle?.setAttribute("aria-expanded","true")}
}
function renderShell(){
 root.innerHTML=`<section class="quran-app">
  <div class="quran-hero"><div class="quran-hero-copy"><span class="quran-eyebrow">MISHKAT AL-BAYAN · QURAN & ISLAMIC LEARNING</span><h2 id="readerHeading">Quran Reader</h2><p id="readerSubheading">A calm, focused space to read, listen, reflect and study the Qur'an.</p><div class="quran-mode-switch" role="tablist" aria-label="Quran study mode"><button type="button" id="modeQuran" role="tab">Quran Reading</button><button type="button" id="modeTafseer" role="tab">Tafseer Study</button></div></div><div class="quran-progress-box"><b id="qProgressText">Continue reading</b><span id="qProgressKey"></span><button id="continueBtn">Continue Reading</button></div></div>
  <div class="quran-toolbar quran-navline">
   <button id="surahListToggle" type="button" aria-expanded="true">☷ Surah List</button>
   <label>Surah <select id="surahSelect">${LML_QURAN.surahs.map(s=>`<option value="${s.number}">${s.number}. ${esc(s.name)} — ${s.ayahs}</option>`).join("")}</select></label>
   <label>Juz <select id="juzSelect"><option value="">Select Juz</option>${Array.from({length:30},(_,i)=>`<option value="${i+1}">Juz ${i+1}</option>`).join("")}</select></label>
   <label>Page <input id="pageJump" type="number" min="1" max="604" placeholder="1–604"></label><button id="pageBtn">Go</button>
   <label>Ayah <input id="ayahJump" type="number" min="1" placeholder="Ayah"></label><button id="jumpBtn">Go</button>
   <button id="bookmarkView">🔖 Bookmarks</button>
  </div>
  <section class="surah-picker" id="surahPicker" aria-label="All 114 Surahs">
   <div class="surah-picker-head"><div><b>114 Surahs</b><small>Choose a Surah to begin reading</small></div><input id="surahFilter" type="search" placeholder="Search Surah name or number"></div>
   <div class="surah-picker-grid" id="surahPickerGrid">${LML_QURAN.surahs.map(s=>`<button type="button" class="surah-choice" data-surah="${s.number}"><span class="surah-choice-num">${s.number}</span><span><b>${esc(s.name)}</b><small>${s.ayahs} Ayat · ${s.revelation}</small></span></button>`).join("")}</div>
  </section>
  <div class="quran-search"><input id="qSearch" placeholder="Search Arabic, English or Urdu…"><select id="searchScope"><option value="local">Arabic in full Quran</option><option value="en">English translation</option><option value="ur">Urdu translation</option></select><button id="searchBtn">Search</button></div>
  <div id="quranStatus" class="quran-status" role="status"></div>
  <section id="tafsirStudio" class="tafsir-studio" aria-label="Tafseer study workspace">
   <div class="tafsir-studio-head"><span class="tafsir-kicker">MISHKAT AL-BAYAN · TAFSEER</span><h3>Study an Ayah in depth</h3><p>Select a Surah and Ayah to view the existing source-based Tafseer. Quran text and source content are not rewritten.</p></div>
   <div class="tafsir-selectors"><label>Surah<select id="tafsirSurahSelect">${LML_QURAN.surahs.map(s=>`<option value="${s.number}">${s.number}. ${esc(s.name)}</option>`).join("")}</select></label><label>Ayah number<input id="tafsirAyahSelect" type="number" min="1" value="1"></label><label>Language<select id="tafsirLanguage"><option value="ur">اردو</option><option value="en">English</option><option value="hi">हिन्दी</option></select></label><button type="button" id="loadTafseerStudio">Open Tafseer</button></div>
   <div id="tafsirAyahPreview" class="tafsir-ayah-preview" aria-live="polite"></div>
   <div id="tafsirStudioContent" class="tafsir-studio-content"><div class="tafsir-empty"><span>۞</span><b>Select an Ayah to begin</b><p>Your existing Tafseer source will appear here when available.</p></div></div>
  </section>
  <div id="surahHead"></div><div id="quranList"></div>

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
 $("#surahSelect").onchange=()=>loadSurah(+$("#surahSelect").value,1);
 const picker=$("#surahPicker");
 $("#surahListToggle").onclick=()=>{const open=picker.hidden;picker.hidden=!open;$("#surahListToggle").setAttribute("aria-expanded",String(open));};
 $("#surahPickerGrid").querySelectorAll("[data-surah]").forEach(b=>b.onclick=()=>loadSurah(+b.dataset.surah,1));
 $("#surahFilter").oninput=e=>{const q=e.target.value.trim().toLowerCase();$("#surahPickerGrid").querySelectorAll("[data-surah]").forEach(b=>{b.hidden=!(`${b.dataset.surah} ${b.innerText}`).toLowerCase().includes(q)})};
 $("#juzSelect").onchange=async e=>{if(e.target.value)await loadJuz(+e.target.value)};
 $("#hizbSelect").onchange=async e=>{if(e.target.value)await loadHizb(+e.target.value)};
 $("#pageBtn").onclick=async()=>{const n=+$("#pageJump").value;if(n)await loadPage(n)};
 $("#jumpBtn").onclick=()=>{let a=+$("#ayahJump").value;if(a)scrollToKey(`${currentSurah}:${a}`)};
 $("#rangeBtn").onclick=()=>{let a=+$("#rangeFrom").value,b=+$("#rangeTo").value;if(a&&b)playRange(`${currentSurah}:${a}`,`${currentSurah}:${b}`)};
 if($("#prevAudio"))$("#prevAudio").onclick=()=>stepAudio(-1);
 if($("#nextAudio"))$("#nextAudio").onclick=()=>stepAudio(1);
 if($("#pauseAudio"))$("#pauseAudio").onclick=()=>audio?.pause();
 if($("#repeatAyah"))$("#repeatAyah").onclick=()=>{if(audioQueue.length){repeatMode="ayah";audio?.play()}};
 if($("#repeatOff"))$("#repeatOff").onclick=()=>{repeatMode="none"};
 if($("#audioSpeed"))$("#audioSpeed").onchange=e=>{if(audio)audio.playbackRate=+e.target.value};
 if($("#audioVolume"))$("#audioVolume").oninput=e=>{if(audio)audio.volume=+e.target.value};
 if($("#audioScroll"))$("#audioScroll").onchange=e=>{autoScroll=e.target.checked;settings.autoScroll=autoScroll;saveSettings()};
 $("#continueBtn").onclick=()=>{let [s,a]=readProgress().split(":").map(Number);loadSurah(s,a)};
 $("#bookmarkView").onclick=renderBookmarks;
 const settingsBtn=$("#settingsBtn");if(settingsBtn)settingsBtn.onclick=openSettings;
 $("#searchBtn").onclick=searchQuran;
 $("#qSearch").onkeydown=e=>{if(e.key==="Enter")searchQuran()};
 $("#prevSurah").onclick=()=>currentSurah>1&&loadSurah(currentSurah-1,1);
 $("#nextSurah").onclick=()=>currentSurah<114&&loadSurah(currentSurah+1,1);
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
 const picker=$("#surahPicker");if(picker)picker.hidden=true;const listToggle=$("#surahListToggle");if(listToggle)listToggle.setAttribute("aria-expanded","false");
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
 $("#surahHead").innerHTML=`<div class="surah-header surah-collapsible"><button type="button" class="surah-collapse-toggle" id="surahCollapseToggle" aria-expanded="true"><span class="surah-number">${s.number}</span><span class="surah-title-block"><h3>${esc(s.name)}</h3><p>${s.ayahs} Ayat · ${s.revelation} · <span id="surahMeta">Juz metadata loading…</span> · <span id="memoryMeta">Memorized 0/${s.ayahs}</span></p></span><span class="surah-chevron">⌄</span></button><div class="surah-tools" id="surahHeaderTools"><button id="infoBtn">ℹ Surah info</button><button id="playSurah">▶ Play Surah</button><button id="stopAudio">■ Stop</button></div></div>${s.number!==1&&s.number!==9?`<div class="opening-bismillah" lang="ar" dir="rtl">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>`:""}`;
 $("#surahCollapseToggle").onclick=()=>{const tools=$("#surahHeaderTools"),open=tools.hidden;tools.hidden=!open;$("#surahCollapseToggle").setAttribute("aria-expanded",String(open));};
 $("#infoBtn").onclick=()=>loadSurahInfo(s.number,lang);
 $("#playSurah").onclick=()=>{audioQueue=verses.map(v=>v.key);queueIndex=0;repeatMode="surah";playCurrentAudio()};
 $("#stopAudio").onclick=stopAudio;
}
function renderVerses(){
 const list=$("#quranList"); if(!list)return;
 list.classList.toggle("quran-continuous",settings.layout==="continuous");list.innerHTML=verses.map(v=>verseHTML(v)).join("");
 bindVerseButtons();
}
function verseHTML(v){
 const trs=Object.entries(translations).map(([k,arr])=>{let source=translations[`${k}:${v.surah}`]||arr;let x=source.find(a=>a.numberInSurah===v.ayah);return x?`<div class="translation ${editions[k].dir}" data-lang="${k}"><small>${esc(editions[k].label)}</small><div>${x.text}</div></div>`:""}).join("");
 return `<article class="ayah-card ${isBookmarked(v.key)?"bookmarked":""}" id="ayah-${v.key.replace(":","-")}" data-key="${v.key}">
 <div class="ayah-top"><span class="ayah-ref">${v.key}</span><span class="ayah-badges" id="meta-${v.key.replace(":","-")}"></span></div>
 <div class="ayah-arabic" style="font-size:${settings.fontSize}px;font-family:${settings.arabicFont==='uthmani'?"Noto Naskh Arabic, KFGQPC KSA Regular, serif":settings.arabicFont==='indopak'?"Noto Nastaliq Urdu, serif":"KFGQPC KSA Regular, serif"}" dir="rtl" lang="ar"><span class="ayah-arabic-text">${v.text}</span><span class="quran-ayah-end" aria-label="آیت ${arabicIndicNumber(v.ayah)}">۝${arabicIndicNumber(v.ayah)}</span></div>
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
 <div class="settings-head"><div><span class="settings-kicker">MISHKAT AL-BAYAN</span><h3>Reading Settings</h3><p>Preferences are saved on this device.</p></div><button value="cancel" class="settings-x">×</button></div>
 <div class="settings-tabs"><button type="button" class="settings-tab active" data-panel="arabic">Arabic</button><button type="button" class="settings-tab" data-panel="translation">Translation</button><button type="button" class="settings-tab" data-panel="word">Word By Word</button><button type="button" class="settings-tab" data-panel="audio">Audio & Theme</button></div>
 <div class="settings-panel active" data-panel="arabic"><div class="setting-grid"><label class="setting-card"><span>Arabic font</span><select id="arabicFont"><option value="uthmani" ${settings.arabicFont==='uthmani'?'selected':''}>Uthmani text style (system font fallback)</option><option value="indopak" ${settings.arabicFont==='indopak'?'selected':''}>IndoPak style (system font fallback)</option><option value="tajweed" ${settings.arabicFont==='tajweed'?'selected':''}>Tajweed font (not bundled)</option></select><small>Font face falls back where a matching font is not installed.</small></label><label class="setting-card"><span>Arabic size</span><div class="size-step"><button type="button" id="arabicMinus">−</button><output id="arabicOut">${settings.fontSize}px</output><button type="button" id="arabicPlus">+</button></div></label><label class="setting-card"><span>Lines per display</span><select id="arabicLines">${[1,2,3,5,10,15].map(n=>`<option value="${n}" ${+(settings.arabicLines||2)===n?'selected':''}>${n} Lines</option>`).join('')}</select></label></div><div class="font-preview" dir="rtl" lang="ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝</div></div>
 <div class="settings-panel" data-panel="translation"><label class="switch-row"><span><b>Show translations</b><small>Display available selected translation below Arabic.</small></span><input id="showTrans" type="checkbox" ${settings.showTranslations?'checked':''}></label><label class="setting-card"><span>Translation language</span><select id="readerLang"><option value="ur" ${settings.language==='ur'?'selected':''}>اردو</option><option value="en" ${settings.language==='en'?'selected':''}>English</option><option value="hi" ${settings.language==='hi'?'selected':''}>Hindi</option></select></label><label class="setting-card"><span>Available translation</span><select id="primaryTranslation">${Object.entries(editions).map(([k,e])=>`<option value="${k}" ${settings.selected.includes(k)&&settings.selected.length===1?'selected':''}>${esc(e.label)}</option>`).join('')}</select><small>Currently bundled online edition list; unavailable named Urdu translations are not fabricated.</small></label><label class="setting-card"><span>Translation size</span><input id="translationSize" type="range" min="14" max="30" value="${settings.translationSize}"><output id="transOut">${settings.translationSize}px</output></label><label class="setting-card"><span>Layout</span><select id="translationLayout"><option value="line" ${settings.translationLayout!=='text'?'selected':''}>Line by line</option><option value="text" ${settings.translationLayout==='text'?'selected':''}>Continuous text</option></select></label></div>
 <div class="settings-panel" data-panel="word"><label class="switch-row"><span><b>Enable Word By Word</b><small>Loads real word data from Quran.com QDC when online.</small></span><input id="showWord" type="checkbox" ${settings.showWordByWord?'checked':''}></label><p>Word meanings appear per verse using the existing “Word-by-word” action. Availability depends on the external QDC service and selected language.</p></div>
 <div class="settings-panel" data-panel="audio"><label class="switch-row"><span><b>Auto-play next Ayah</b></span><input id="autoPlayNext" type="checkbox" ${settings.autoPlayNext?'checked':''}></label><label class="switch-row"><span><b>Auto-scroll & highlight</b></span><input id="autoScroll" type="checkbox" ${autoScroll?'checked':''}></label><label class="setting-card"><span>Theme</span><select id="readerTheme"><option value="auto" ${settings.theme==='auto'?'selected':''}>Auto</option><option value="light" ${settings.theme==='light'?'selected':''}>Light</option><option value="sepia" ${settings.theme==='sepia'?'selected':''}>Sepia</option><option value="dark" ${settings.theme==='dark'?'selected':''}>Dark</option></select></label><label class="setting-card"><span>Reciter</span><select id="reciter"><option value="alafasy">Mishary Rashid Alafasy (available)</option><option disabled>Other reciters — not configured</option></select></label></div>
 <div class="settings-footer"><button value="cancel">Cancel</button><button id="saveQSettings" value="default" class="primary">Save & Apply</button></div></form>`;
 document.body.appendChild(d);d.showModal();
 const tabs=d.querySelectorAll('.settings-tab'),panels=d.querySelectorAll('.settings-panel');tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.toggle('active',x===t));panels.forEach(x=>x.classList.toggle('active',x.dataset.panel===t.dataset.panel))});
 let f=+settings.fontSize;const out=d.querySelector('#arabicOut');d.querySelector('#arabicMinus').onclick=()=>{f=Math.max(22,f-1);out.value=f+'px'};d.querySelector('#arabicPlus').onclick=()=>{f=Math.min(58,f+1);out.value=f+'px'};
 d.querySelector('#translationSize').oninput=e=>d.querySelector('#transOut').value=e.target.value+'px';
 d.querySelector('#saveQSettings').onclick=()=>{settings.fontSize=f;settings.arabicFont=d.querySelector('#arabicFont').value;settings.arabicLines=+d.querySelector('#arabicLines').value;settings.translationSize=+d.querySelector('#translationSize').value;settings.translationLayout=d.querySelector('#translationLayout').value;settings.showTranslations=d.querySelector('#showTrans').checked;settings.showWordByWord=d.querySelector('#showWord').checked;settings.autoPlayNext=d.querySelector('#autoPlayNext').checked;settings.autoScroll=d.querySelector('#autoScroll').checked;settings.language=d.querySelector('#readerLang').value;settings.selected=[d.querySelector('#primaryTranslation').value];settings.theme=d.querySelector('#readerTheme').value;autoScroll=settings.autoScroll;saveSettings();applyTheme();d.close();loadSurah(currentSurah,1)};
}
function applyTheme(){const t=settings.theme||'auto';document.documentElement.dataset.quranTheme=t;}
applyTheme();

window.QuranLibrary={mount,mountAudioBridge:()=>mount("quranAudioLibrary"),quranHTML,setMode,openSettings,applyTheme,openVerse:async k=>{const [sn,an]=k.split(":").map(Number);await loadSurah(sn,an);setTimeout(()=>scrollToKey(k),100)},continueReading:async()=>{const [sn,an]=readProgress().split(":").map(Number);await loadSurah(sn,an);setTimeout(()=>scrollToKey(readProgress()),100)},playJuz:async n=>{await loadJuz(n);const b=document.getElementById("playJuz");if(b)b.click();},validate:()=>({surahs:LML_QURAN.surahs.length,ayahs:QVERSES.length,ok:LML_QURAN.surahs.length===114&&QVERSES.length===6236})};
})();
