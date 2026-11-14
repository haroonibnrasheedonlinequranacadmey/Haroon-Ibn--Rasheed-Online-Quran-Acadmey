LITTLE MUSLIM LEARNERS — INTEGRATED WEBSITE PACKAGE
==================================================

This package preserves the existing Haroon Ibn Rasheed Online Quran Academy website and adds:
  little-muslim-learners/index.html
  little-muslim-learners/style.css
  little-muslim-learners/app.js
  little-muslim-learners/sw.js
  little-muslim-learners/manifest.webmanifest

OPENING THE APP
---------------
After publishing the repository to GitHub Pages, open:
  https://YOUR-GITHUB-PAGES-ADDRESS/little-muslim-learners/
The academy's public navigation now includes "Kids Learning".

LOCAL DATA AND PRIVACY
----------------------
- Child profiles, progress, activity completions and parent PIN hash are stored in IndexedDB on this device (localStorage fallback).
- Child profiles are not sent to Supabase by this app.
- Use Parents > Export backup to save a JSON backup; Restore backup replaces local learner data after confirmation.
- Data does not automatically sync between phones, browsers or computers. Keep the backup file private.
- Clearing browser/site data can erase local progress.
- Microphone recording requires browser permission and a secure context (HTTPS). Recordings are held temporarily in the current page session and are not uploaded or retained after leaving/reloading the page.
- The parent PIN protects the parent panel in this browser; it is not an online account or strong device-level security. Choose a PIN that is not shared with children.

OFFLINE
-------
The app has its own service worker and caches its application shell after the first successful visit over HTTPS. Some browser speech voices require an online/system voice package. First visit requires a network connection. The academy site service worker was left unchanged.

IMPORTANT IMPLEMENTATION SCOPE / HONEST LIMITATIONS
---------------------------------------------------
This is a functional first integrated release, not every advanced feature in the full brief:
- The learning garden is an interactive animated CSS 3D-style scene, not a Three.js/WebGL 3D game engine. The avatar has a simple idle/wave animation; free walking, object collision and fully custom 3D clothing/accessory models are not implemented.
- Narration uses the device/browser speech synthesis fallback. No licensed studio-generated voice files are bundled; browser voice quality and Urdu/Arabic availability vary by device. The sound control mutes speech.
- The included Quranic story summaries cite relevant Quran passages and avoid depicting Prophets. They are educational summaries, not full tafsir. Verify religious teaching and detailed rulings with a qualified teacher.
- The Quran area includes alphabet/harakat practice guidance, short-surah links and introductory Tajweed guidance; it is not a complete Quran course and does not provide automated Tajweed scoring.
- Recording is session-only and cannot yet be submitted to a parent/teacher dashboard.
- Parent dashboard shows local profile/activity totals. Screen-time enforcement, scheduled daily/weekly challenge engine, certificates, teacher homework assignment/review workflow, downloadable story audio, and cloud sync are not implemented.
- The app has a small starter set of stories and duas, not an exhaustive verified content library.
- Browser support for IndexedDB, speech synthesis, microphone capture and PWA installation differs. Test on the target devices.

DEPLOYMENT
----------
1. Make a backup of the current GitHub repository before replacing files.
2. Extract this ZIP on a computer.
3. Open the extracted folder and upload its CONTENTS (including index.html, assets, css, js, little-muslim-learners and other existing folders) to the ROOT of the same GitHub repository.
4. If GitHub asks whether to replace existing files, confirm only after you have verified the backup.
5. Wait for GitHub Pages deployment to finish, then open the academy website and tap Kids Learning.
6. Use HTTPS (GitHub Pages provides this) for offline/PWA and microphone features.

The original academy website files, portals, Supabase SQL/configuration and assets are retained. This package does not require Supabase for children's local profiles or progress.
