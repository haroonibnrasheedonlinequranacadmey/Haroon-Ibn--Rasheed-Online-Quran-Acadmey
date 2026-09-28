const defs={
 courses:{title:'Courses',table:'courses',fields:[['title','Title'],['description','Description','textarea'],['image_url','Image URL'],['link_url','Course Link']]},
 teachers:{title:'Teachers',table:'teachers',fields:[['name','Name'],['gender','Gender'],['bio','Bio','textarea'],['image_url','Image URL']]},
 fees:{title:'Fees',table:'fees',fields:[['country','Country'],['course','Course'],['amount','Amount'],['currency','Currency'],['period','Period']]},
 faqs:{title:'FAQs',table:'faqs',fields:[['question','Question'],['answer','Answer','textarea']]},
 content:{title:'Website Content',table:'site_content',fields:[['content_key','Key'],['content_value','Value','textarea']]},
 settings:{title:'Settings',table:'site_settings',fields:[['setting_key','Key'],['setting_value','Value','textarea']]},
 students:{title:'Students',table:'students',fields:[['full_name','Name'],['father_name','Father Name'],['phone','Phone'],['email','Email'],['course','Course'],['teacher','Teacher'],['status','Status']]},
 testimonials:{title:'Testimonials',table:'testimonials',fields:[['student_name','Student Name'],['review','Review','textarea'],['rating','Rating'],['active','Active']]},
 articles:{title:'Articles / Blog',table:'articles',fields:[['title','Title'],['excerpt','Excerpt','textarea'],['body','Body','textarea'],['image_url','Image URL'],['published','Published']]},
 notifications:{title:'Notifications',table:'notifications',fields:[['user_id','User ID'],['title','Title'],['body','Message','textarea']]} 
};
let kind=new URLSearchParams(location.search).get('kind')||'courses',def=defs[kind]||defs.courses,records=[],editId=null;
function fieldsHtml(item={}){return def.fields.map(([key,label,type])=>`<div class="field ${type==='textarea'?'full':''}"><label>${label}</label>${type==='textarea'?`<textarea class="input" id="f_${key}" rows="4">${escapeHtml(item[key]||'')}</textarea>`:`<input class="input" id="f_${key}" value="${escapeHtml(item[key]||'')}" required>`}</div>`).join('')}
async function init(){if(!window.db){location.href='login.html';return}if(!(await adminGuard()))return;document.getElementById('title').textContent=def.title;await load()}
async function load(){const r=await db.from(def.table).select('*').order('created_at',{ascending:false});if(r.error){showMsg('msg',r.error.message,'error');return}records=r.data||[];render()}
function render(){document.getElementById('rows').innerHTML=records.map(x=>`<tr>${def.fields.map(([k])=>`<td>${escapeHtml(x[k]||'')}</td>`).join('')}<td><button class="btn" onclick="edit('${x.id}')">Edit</button> <button class="btn danger" onclick="del('${x.id}')">Delete</button></td></tr>`).join('')||`<tr><td colspan="${def.fields.length+1}">No records.</td></tr>`;document.getElementById('head').innerHTML=def.fields.map(([,l])=>`<th>${l}</th>`).join('')+'<th>Actions</th>'}
function edit(id){editId=id;const x=records.find(r=>r.id===id);document.getElementById('form').innerHTML=fieldsHtml(x)+'<div class="field full"><button class="btn">Update</button> <button type="button" class="btn" onclick="resetForm()">Cancel</button></div>';document.getElementById('formBox').scrollIntoView({behavior:'smooth'})}
function resetForm(){editId=null;document.getElementById('form').innerHTML=fieldsHtml()+'<div class="field full"><button class="btn">Add</button></div>'}
document.getElementById('form').addEventListener('submit',async e=>{e.preventDefault();const payload={};def.fields.forEach(([k])=>payload[k]=document.getElementById('f_'+k).value.trim());let r;if(editId)r=await db.from(def.table).update(payload).eq('id',editId);else r=await db.from(def.table).insert(payload);if(r.error)showMsg('msg',r.error.message,'error');else{showMsg('msg',editId?'Updated successfully.':'Added successfully.','ok');resetForm();load()}});
async function del(id){if(!confirm('Delete this record?'))return;const r=await db.from(def.table).delete().eq('id',id);if(r.error)showMsg('msg',r.error.message,'error');else load()}
