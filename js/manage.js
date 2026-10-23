const defs={
 courses:{title:'Courses',table:'courses',fields:[['title','Title'],['description','Description','textarea'],['image_url','Image URL'],['link_url','Course Link'],['active','Active','boolean']]},
 teachers:{title:'Teachers',table:'teachers',fields:[['name','Name'],['gender','Gender'],['bio','Bio','textarea'],['image_url','Image URL'],['account_id','Linked Account UUID']]},
 fees:{title:'Fees',table:'fees',fields:[['country','Country'],['course','Course'],['amount','Amount'],['currency','Currency'],['period','Period'],['active','Active','boolean']]},
 faqs:{title:'FAQs',table:'faqs',fields:[['question','Question'],['answer','Answer','textarea'],['active','Active','boolean']]},
 content:{title:'Website Content',table:'site_content',fields:[['content_key','Key'],['content_value','Value','textarea']]},
 settings:{title:'Settings',table:'site_settings',fields:[['setting_key','Key'],['setting_value','Value','textarea']]},
 students:{title:'Students',table:'students',fields:[['full_name','Name'],['father_name','Father Name'],['phone','Phone'],['email','Email'],['course','Course'],['teacher','Teacher'],['account_id','Linked Account UUID'],['status','Status']]},
 testimonials:{title:'Testimonials',table:'testimonials',fields:[['student_name','Student Name'],['review','Review','textarea'],['rating','Rating'],['active','Active','boolean']]},
 articles:{title:'Articles / Blog',table:'articles',fields:[['title','Title'],['excerpt','Excerpt','textarea'],['body','Body','textarea'],['image_url','Image URL'],['published','Published','boolean']]},
 notifications:{title:'Notifications',table:'notifications',fields:[['user_id','User ID'],['title','Title'],['body','Message','textarea']]},
 payment_methods:{title:'Payment Methods',table:'payment_methods',fields:[['name','Name'],['account_name','Account Name'],['account_number','Account Number'],['instructions','Instructions','textarea'],['enabled','Enabled','boolean'],['sort_order','Sort Order']]}
};

let kind=new URLSearchParams(location.search).get('kind')||'courses',
    def=defs[kind]||defs.courses,
    records=[],
    editId=null;

const $=id=>document.getElementById(id);

function fieldsHtml(item={}){

  return def.fields.map(([key,label,type])=>{

    const v=item[key];

    if(type==='boolean')
      return `
        <div class="field">
          <label>${escapeHtml(label)}</label>

          <select
            class="input"
            id="f_${key}"
          >
            <option
              value="true"
              ${v===true?'selected':''}
            >
              Yes
            </option>

            <option
              value="false"
              ${v===false?'selected':''}
            >
              No
            </option>
          </select>
        </div>
      `;

    return `
      <div class="field ${type==='textarea'?'full':''}">

        <label>
          ${escapeHtml(label)}
        </label>

        ${
          type==='textarea'
          ?
          `
          <textarea
            class="input"
            id="f_${key}"
            rows="4"
          >${escapeHtml(v||'')}</textarea>
          `
          :
          `
          <input
            class="input"
            id="f_${key}"
            value="${escapeHtml(v||'')}"
          >
          `
        }

      </div>
    `;

  }).join('');

}


async function init(){

  if(!window.db){

    location.href='login.html';

    return;
  }

  if(!(await adminGuard()))
    return;

  const t=$('title');

  if(t)
    t.textContent=def.title;

  resetForm();

  await load();

}


async function load(){

  const r=
    await db
      .from(def.table)
      .select('*')
      .order(
        'created_at',
        {ascending:false}
      );

  if(r.error){

    showMsg(
      'msg',
      r.error.message,
      'error'
    );

    return;
  }

  records=r.data||[];

  render();

}


function render(){

  if(!$('rows'))
    return;

  $('rows').innerHTML=

    records.map(x=>`

      <tr>

        ${
          def.fields.map(([k])=>`

            <td>

              ${
                escapeHtml(
                  x[k]===true
                    ? 'Yes'
                    : x[k]===false
                      ? 'No'
                      : x[k]??''
                )
              }

            </td>

          `).join('')
        }

        <td>

          <button
            class="btn"
            onclick="edit('${x.id}')"
          >
            Edit
          </button>

          <button
            class="btn danger"
            onclick="del('${x.id}')"
          >
            Delete
          </button>

        </td>

      </tr>

    `).join('')

    ||

    `
      <tr>

        <td colspan="${def.fields.length+1}">

          No records.

        </td>

      </tr>
    `;


  if($('head')){

    $('head').innerHTML=

      def.fields
        .map(([,l])=>`
          <th>
            ${escapeHtml(l)}
          </th>
        `)
        .join('')

      +

      '<th>Actions</th>';

  }

}


function resetForm(){

  editId=null;

  if(!$('form'))
    return;

  $('form').innerHTML=

    fieldsHtml()

    +

    `
      <div class="field full">

        <button class="btn">
          Add
        </button>

      </div>
    `;

  attachFormHandler();

}


function edit(id){

  editId=id;

  const x=
    records.find(
      r=>r.id===id
    );

  if(!x)
    return;

  $('form').innerHTML=

    fieldsHtml(x)

    +

    `
      <div class="field full">

        <button class="btn">
          Update
        </button>

        <button
          type="button"
          class="btn"
          onclick="resetForm()"
        >
          Cancel
        </button>

      </div>
    `;

  attachFormHandler();

  $('formBox')?.scrollIntoView({
    behavior:'smooth'
  });

}


/* =====================================================
   FORM SUBMIT
   FIXED FOR DYNAMIC FORM
===================================================== */

function attachFormHandler(){

  const form=$('form');

  if(!form)
    return;

  form.onsubmit=async function(e){

    e.preventDefault();

    const payload={};

    def.fields.forEach(
      ([k,,type])=>{

        let v=
          $('f_'+k)?.value??'';

        payload[k]=

          type==='boolean'
            ? v==='true'
            : v.trim();

      }
    );


    if(
      !editId &&
      def.table==='students'
    ){

      payload.status=
        payload.status ||
        'active';

    }


    let r;


    if(editId){

      r=
        await db
          .from(def.table)
          .update(payload)
          .eq('id',editId);

    }else{

      r=
        await db
          .from(def.table)
          .insert(payload);

    }


    if(r.error){

      showMsg(
        'msg',
        r.error.message,
        'error'
      );

    }else{

      showMsg(
        'msg',
        editId
          ? 'Updated successfully.'
          : 'Added successfully.',
        'ok'
      );

      resetForm();

      await load();

    }

  };

}


async function del(id){

  if(
    !confirm(
      'Delete this record?'
    )
  )
    return;


  const r=
    await db
      .from(def.table)
      .delete()
      .eq('id',id);


  if(r.error){

    showMsg(
      'msg',
      r.error.message,
      'error'
    );

  }else{

    await load();

  }

}


/* =====================================================
   START
===================================================== */

init();
