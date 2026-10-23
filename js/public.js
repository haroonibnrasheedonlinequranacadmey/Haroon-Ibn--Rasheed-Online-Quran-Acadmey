(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  if (!window.supabase || !cfg.url || cfg.url.includes('YOUR-PROJECT') || !cfg.anonKey || cfg.anonKey.includes('YOUR_')) return;
  const client = window.supabase.createClient(cfg.url, cfg.anonKey);
  window.academySupabase = client;

  const form = document.getElementById('admissionForm');
  const status = document.getElementById('formStatus');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      student_name: fd.get('Student Name'),
      father_name: fd.get('Father Name'),
      age: Number(fd.get('Age')) || null,
      phone: fd.get('Phone Number'),
      email: fd.get('Email') || null,
      course: fd.get('Course'),
      message: fd.get('Message') || null,
      status: 'new'
    };
    status.textContent = 'Submitting...';
    const { error } = await client.from('admissions').insert(payload);
    if (error) {
      status.textContent = 'Submission failed. Please try again or contact us on WhatsApp.';
      console.error(error);
      return;
    }
    status.textContent = 'Your admission request has been received. We will contact you soon.';
    form.reset();
  });
})();
