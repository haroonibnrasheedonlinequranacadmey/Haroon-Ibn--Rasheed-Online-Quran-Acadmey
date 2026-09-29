(function(){
 const cfg=window.SUPABASE_CONFIG||{};
 if(!window.supabase||!cfg.url||!cfg.anonKey)return;
 const db=window.supabase.createClient(cfg.url,cfg.anonKey);
 const f=document.getElementById('admissionForm');
 if(f)f.addEventListener('submit',async e=>{
   e.preventDefault();const s=document.getElementById('formStatus');s.textContent='Submitting...';
   const fd=new FormData(f);const p={student_name:fd.get('Student Name'),father_name:fd.get('Father Name'),age:Number(fd.get('Age'))||null,phone:fd.get('Phone Number'),email:fd.get('Email'),course:fd.get('Course'),message:fd.get('Message')};
   const r=await db.from('admissions').insert(p);
   if(r.error){s.textContent='Unable to submit. Please WhatsApp us directly.';s.style.color='crimson'}else{s.textContent='Admission submitted successfully. We will contact you soon.';s.style.color='green';f.reset()}
 });
})();
