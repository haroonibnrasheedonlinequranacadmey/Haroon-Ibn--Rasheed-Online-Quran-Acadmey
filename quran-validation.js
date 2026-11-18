(()=>{"use strict";
const expected=6236;
const q=window.LML_QURAN;
if(!q){console.error("[Quran validation] quran-data.js missing");return}
const count=q.texts.length, sum=q.surahs.reduce((n,s)=>n+s.ayahs,0);
const keys=new Set();let p=0,ok=q.surahs.length===114&&sum===expected&&count===expected;
for(const s of q.surahs){for(let a=1;a<=s.ayahs;a++){const key=`${s.number}:${a}`;if(keys.has(key)||!q.texts[p]?.trim())ok=false;keys.add(key);p++}}
window.LML_QURAN_VALIDATION={ok,surahs:q.surahs.length,ayahs:count,uniqueKeys:keys.size};
if(ok)console.info(`[Quran validation] PASS — ${q.surahs.length} surahs, ${count} ayat, ${keys.size} unique verse keys.`);
else console.error("[Quran validation] FAIL",window.LML_QURAN_VALIDATION);
})();