AL-BAYAN — UPDATED FILES ONLY
================================

This ZIP contains only files that need to be replaced in the existing GitHub repository.
It does not contain the complete website or Quran data because those data files were preserved unchanged.

HOW TO INSTALL
1. Download and extract this ZIP.
2. In your existing GitHub repository, upload each file to the EXACT same relative folder path shown in this ZIP.
3. Replace the old file when GitHub asks.
4. Commit all changes together.
5. Open the public academy website and click the Al-Bayan button.
6. Open Al-Bayan directly and test Quran / Tafseer after deployment.

FILES INCLUDED
- Public academy pages: Al-Bayan button replaces the Kids Learning navigation item.
- css/public.css: premium launch-button style.
- little-muslim-learners/index.html: Al-Bayan app shell, responsive navigation and landing page.
- little-muslim-learners/app.js: Quran/Tafseer navigation and professional home/More sections; existing secondary activities remain.
- little-muslim-learners/quran-library.js: dedicated Tafseer study workspace and premium Quran reader UI. Existing source URLs, verse data bindings, translation loaders, audio URLs, bookmark keys, settings keys and word-by-word request logic are retained.
- little-muslim-learners/style.css: responsive Al-Bayan visual system.
- manifest.webmanifest and sw.js: app branding and cache version update.

DATA PRESERVATION
The following files were not modified: quran-data.js, quran-validation.js. Existing local Quran Arabic data (114 surahs / 6,236 ayat), translation API configuration, Tafseer source configuration, Word-by-Word QDC request, audio endpoint, bookmarks/local settings/progress storage keys are retained.

LIMITATIONS / HONEST TEST REPORT
The application depends on external services for translations, Tafseer and audio. Their live availability cannot be guaranteed by a local static check. A real internet/browser session is required to verify the remote endpoints and audio playback after deployment. This patch does not fabricate religious content or replace unavailable Tafseer with generated text. The original reciter endpoint remains Mishary Rashid Alafasy; no new reciter sources were invented.
