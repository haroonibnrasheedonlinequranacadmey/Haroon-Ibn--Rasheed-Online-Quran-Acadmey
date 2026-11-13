// Supabase configuration — preconfigured for Haroon Ibn Rasheed Online Quran Academy
window.SUPABASE_CONFIG = {
  url: 'https://olxytsmwqkrrnutsegtr.supabase.co',
  anonKey: 'sb_publishable_v6mVlP78c6ezbGT8cwREqQ_JBzL51xt'
};


/* HR_PERSISTENT_AUTH_PATCH
 * Supabase Auth sessions persist in browser/device storage and refresh automatically.
 * This wrapper applies the policy consistently to all existing pages without changing
 * their current database calls or public UI. The SDK stores tokens, never passwords.
 */
(function () {
  if (!window.supabase || typeof window.supabase.createClient !== 'function' || window.__hrPersistentAuthPatched) return;
  const originalCreateClient = window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient = function (url, anonKey, options) {
    const supplied = options || {};
    const auth = Object.assign({
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }, supplied.auth || {});
    return originalCreateClient(url, anonKey, Object.assign({}, supplied, { auth }));
  };
  window.__hrPersistentAuthPatched = true;
})();
