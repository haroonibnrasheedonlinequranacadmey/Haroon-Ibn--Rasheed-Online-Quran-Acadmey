LITTLE MUSLIM LEARNERS — QURAN LIBRARY UPDATE
================================================

This update integrates a complete Quran reading/learning library into the existing
Little Muslim Learners section. It does NOT replace the public academy website.

FILES IN THIS UPDATE
--------------------
little-muslim-learners/index.html
  Modified: loads the new Quran data, validation and reader scripts.

little-muslim-learners/app.js
  Modified: connects the existing Quran tab to the new Quran Library. Other
  learning tabs and existing profile/parent functionality are preserved.

little-muslim-learners/style.css
  Modified: adds responsive Quran reader styles and audio dock styles.

little-muslim-learners/sw.js
  Modified: cache version updated and the new Quran files added to the app shell.

little-muslim-learners/quran-data.js
  NEW: complete 6,236-ayah Uthmani text derived directly from the supplied
  quran-uthmani.txt file. It contains 114 surahs and the standard ayah counts.

little-muslim-learners/quran-validation.js
  NEW: automatic browser-console integrity check for 114 surahs, 6,236 ayat,
  unique verse keys and non-empty verse text.

little-muslim-learners/quran-library.js
  NEW: Quran reader, navigation, translations, audio, bookmarking, progress,
  word-by-word lookup, tafsir lookup, search, memorization practice and settings.

DATA / SERVICE DEPENDENCIES
---------------------------
1. Arabic Quran text:
   Bundled locally from the supplied quran-uthmani.txt. No generated Quran text
   is used.

2. Translations:
   Loaded on demand from AlQuran Cloud editions. Default selections are:
   - English: Saheeh International (en.sahih)
   - Urdu: Fateh Muhammad Jalandhry (ur.jalandhry)
   Additional selectable editions include Bengali, French, Indonesian, Turkish,
   German and Spanish. Translation rights remain with their translators/
   publishers and the UI identifies the edition.

3. Mishary Rashid Alafasy audio:
   Streamed by ayah from the Islamic Network / AlQuran Cloud audio CDN using
   the ar.alafasy edition. Audio is not stored in the website or Supabase.
   The reader advances ayah-by-ayah and highlights the currently playing ayah.

4. Word-by-word:
   Loaded on demand from Quran.com/Quran Foundation QDC word data. The reader
   does not fabricate word meanings.

5. Tafsir:
   English Ibn Kathir and Urdu Ibn Kathir are loaded on demand from the
   spa5k tafsir dataset sourced from Quran.com. If the verified source is
   unavailable, the reader shows no generated substitute.

USER DATA
---------
Bookmarks, last reading position, settings and memorization practice are stored
locally in the browser using localStorage. No new Supabase tables or service
keys are required for this Little Muslim Learners integration.

DEPLOYMENT
----------
1. Keep the original website backup unchanged.
2. Extract this update ZIP into the existing repository.
3. Replace only the listed modified files.
4. Add only the listed NEW files.
5. Do not delete any other website files.
6. After GitHub Pages redeploys, hard-refresh the Little Muslim Learners page.
   The service-worker cache version has been incremented so the new files can
   be picked up.

IMPORTANT
---------
External translation, word-by-word, tafsir and audio services require an
internet connection. The complete Arabic Quran text remains bundled locally.

The official source documentation/terms should be reviewed before commercial
redistribution of third-party translations or recitations.
