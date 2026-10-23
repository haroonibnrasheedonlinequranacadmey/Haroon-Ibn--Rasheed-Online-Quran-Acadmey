

function openForm(){
document.getElementById("admissionBox").style.display="block"; window.scrollTo(0,document.body.scrollHeight);
}


function filterCourses(){const q=(document.getElementById("courseSearch")?.value||"").toLowerCase();document.querySelectorAll("#courseGrid .course-card").forEach(c=>{c.style.display=c.innerText.toLowerCase().includes(q)?"":"none"})}

function showPage(page){

document.querySelectorAll(".page").forEach(function(p){
p.classList.remove("active");
});

const selected=document.getElementById(page);

if(selected){
selected.classList.add("active");
}

document.querySelectorAll(".menu button[data-page]").forEach(function(btn){

btn.classList.remove("active");

if(btn.getAttribute("data-page")===page){
btn.classList.add("active");
}

});

window.scrollTo({
top:0,
behavior:"smooth"
});

document.getElementById("nav").classList.remove("open");
}

function toggleMenu(){

document.getElementById("nav").classList.toggle("open");

}

function toggleFaq(button){

const item=button.parentElement;

document.querySelectorAll(".question").forEach(function(q){

if(q!==item){
q.classList.remove("open");
}

});

item.classList.toggle("open");

}


// Public header slideshow is handled by js/public-headers.js



;

(function(){
  'use strict';

  const cfg = window.SUPABASE_CONFIG || {};

  if(!window.supabase || !cfg.url || !cfg.anonKey){
    console.error('Supabase configuration not found.');
    return;
  }

  const db = window.supabase.createClient(cfg.url, cfg.anonKey);

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function youtubeId(url){
    if(!url) return '';
    try{
      const u=new URL(url);
      const host=u.hostname.toLowerCase();
      if(host.includes('youtube.com')){
        if(u.pathname==='/watch') return u.searchParams.get('v') || '';
        if(u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1].split('/')[0];
        if(u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1].split('/')[0];
      }
      if(host.includes('youtu.be')) return u.pathname.replace(/^\//,'').split('/')[0];
    }catch(e){}
    return '';
  }

  function absoluteUrl(value){
    return new URL(value,window.location.href).href;
  }

  function copyText(value,successText){
    const done=function(){ alert(successText || 'Link copied!'); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(value).then(done).catch(function(){prompt('Copy this link:',value);});
    }else{
      prompt('Copy this link:',value);
    }
  }

  window.copyAcademyVideo=function(path){
    copyText(absoluteUrl(path),'Website video link copied!');
  };

  window.shareAcademyVideo=function(path,title){
    const url=absoluteUrl(path);
    if(navigator.share){
      navigator.share({title:title || 'Quran Video',text:'Watch this video on Haroon Ibn Rasheed Online Quran Academy:',url:url}).catch(function(){});
    }else{
      copyText(url,'Website video link copied!');
    }
  };

  /* -------------------------
     DETAIL VIEWERS
  ------------------------- */
  function ensureViewers(){
    if(!document.getElementById('articleDetailOverlay')){
      const wrap=document.createElement('div');
      wrap.id='articleDetailOverlay';
      wrap.className='article-detail-overlay';
      wrap.innerHTML=`
        <div class="single-detail-box" role="dialog" aria-modal="true" aria-labelledby="articleDetailTitle">
          <div class="single-detail-head">
            <strong>Article Details</strong>
            <button class="single-detail-close" type="button" onclick="closeArticleDetail()" aria-label="Close">×</button>
          </div>
          <div class="single-detail-content">
            <h2 id="articleDetailTitle"></h2>
            <div id="articleDetailMeta" class="single-detail-meta"></div>
            <img id="articleDetailImage" class="single-detail-image" style="display:none" alt="">
            <div id="articleDetailBody" class="single-detail-body"></div>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      wrap.addEventListener('click',function(e){if(e.target===wrap) closeArticleDetail();});
    }

    if(!document.getElementById('videoDetailOverlay')){
      const wrap=document.createElement('div');
      wrap.id='videoDetailOverlay';
      wrap.className='video-detail-overlay';
      wrap.innerHTML=`
        <div class="single-detail-box" role="dialog" aria-modal="true" aria-labelledby="videoDetailTitle">
          <div class="single-detail-head">
            <strong>Video</strong>
            <button class="single-detail-close" type="button" onclick="closeVideoDetail()" aria-label="Close">×</button>
          </div>
          <div class="single-detail-content">
            <h2 id="videoDetailTitle"></h2>
            <div id="videoDetailMeta" class="single-detail-meta"></div>
            <div id="videoDetailPlayer" class="single-video-player"></div>
            <div id="videoDetailActions" class="blog-actions"></div>
            <div id="videoDetailEngagement" class="video-engagement"></div>
            <div id="videoDetailDescription" class="single-video-description" style="display:none"></div>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      wrap.addEventListener('click',function(e){if(e.target===wrap) closeVideoDetail();});
    }
  }

  window.closeArticleDetail=function(){
    const el=document.getElementById('articleDetailOverlay');
    if(el) el.classList.remove('open');
    document.body.style.overflow='';
  };

  window.closeVideoDetail=function(){
    const el=document.getElementById('videoDetailOverlay');
    if(el) el.classList.remove('open');
    const player=document.getElementById('videoDetailPlayer');
    if(player) player.innerHTML='';
    document.body.style.overflow='';
  };

  window.openArticleDetail=function(id){
    ensureViewers();
    const overlay=document.getElementById('articleDetailOverlay');
    const title=document.getElementById('articleDetailTitle');
    const meta=document.getElementById('articleDetailMeta');
    const img=document.getElementById('articleDetailImage');
    const body=document.getElementById('articleDetailBody');

    overlay.classList.add('open');
    document.body.style.overflow='hidden';
    title.textContent='Loading article...';
    meta.textContent='';
    body.textContent='';
    img.style.display='none';

    db.from('articles').select('*').eq('id',id).eq('published',true).maybeSingle().then(function(r){
      if(r.error || !r.data){
        title.textContent='Article not found';
        body.textContent='This article may have been removed or is not published.';
        return;
      }
      const a=r.data;
      title.textContent=a.title || 'Article';
      document.title=(a.title || 'Article')+' | Haroon Ibn Rasheed Online Quran Academy';
      if(a.created_at){
        const d=new Date(a.created_at);
        meta.textContent=isNaN(d.getTime())?'':d.toLocaleDateString();
      }
      if(a.image_url){
        img.src=a.image_url;
        img.alt=a.title || 'Article';
        img.style.display='block';
      }
      body.textContent=a.body || a.excerpt || '';
    }).catch(function(){
      title.textContent='Article unavailable';
      body.textContent='Please try again later.';
    });
  };

  function videoVisitorKey(){
    const keyName='haroon_video_visitor_key';
    let key='';
    try{ key=localStorage.getItem(keyName)||''; }catch(e){}
    if(!key){
      key='v_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+'_'+Math.random().toString(36).slice(2);
      try{ localStorage.setItem(keyName,key); }catch(e){}
    }
    return key;
  }

  function videoSource(url){
    if(!url) return {type:'none'};
    const raw=String(url).trim();
    try{
      const u=new URL(raw);
      const host=u.hostname.toLowerCase();
      const path=u.pathname;
      const yt=youtubeId(raw);
      if(yt) return {type:'youtube',id:yt};

      if(host.includes('drive.google.com')){
        const m=path.match(/\/file\/d\/([^/]+)/i);
        const id=m ? m[1] : u.searchParams.get('id');
        if(id) return {type:'drive',id:id};
      }

      if(host.includes('facebook.com') || host.includes('fb.watch')){
        return {type:'facebook',url:raw};
      }

      if(host.includes('instagram.com')){
        const m=path.match(/\/(?:p|reel|reels|tv)\/([^/?#]+)/i);
        if(m) return {type:'instagram',id:m[1],kind:(path.toLowerCase().includes('/reel')?'reel':'p')};
        return {type:'instagram',url:raw};
      }

      if(host.includes('tiktok.com')){
        const m=path.match(/\/video\/(\d+)/i);
        if(m) return {type:'tiktok',id:m[1]};
      }
      if(host.includes('vm.tiktok.com') || host.includes('vt.tiktok.com')) return {type:'tiktok',url:raw};

      return {type:'generic',url:raw};
    }catch(e){ return {type:'generic',url:raw}; }
  }

  function renderVideoSource(url,title){
    const src=videoSource(url);
    const safeTitle=esc(title || 'Quran Video');
    if(src.type==='youtube'){
      return '<iframe src="https://www.youtube.com/embed/'+encodeURIComponent(src.id)+'" title="'+safeTitle+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    }
    if(src.type==='drive'){
      return '<iframe src="https://drive.google.com/file/'+encodeURIComponent(src.id)+'/preview" title="'+safeTitle+'" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    }
    if(src.type==='facebook'){
      return '<iframe src="https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(src.url)+'&show_text=false&width=900" title="'+safeTitle+'" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>';
    }
    if(src.type==='instagram'){
      const embedUrl=src.id ? ('https://www.instagram.com/'+src.kind+'/'+encodeURIComponent(src.id)+'/embed') : src.url;
      return '<iframe src="'+esc(embedUrl)+'" title="'+safeTitle+'" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>';
    }
    if(src.type==='tiktok' && src.id){
      return '<iframe src="https://www.tiktok.com/player/v1/'+encodeURIComponent(src.id)+'" title="'+safeTitle+'" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    }
    if(src.type==='generic'){
      return '<iframe src="'+esc(src.url)+'" title="'+safeTitle+'" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    }
    return '<div style="color:#fff;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center">Video source is not available.</div>';
  }

  function renderVideoEngagement(videoId,engagement){
    const wrap=document.getElementById('videoDetailEngagement');
    if(!wrap) return;
    const counts=engagement.counts || {likes:0,dislikes:0};
    const mine=engagement.mine || null;
    const comments=engagement.comments || [];
    const commentCount=comments.length;
    wrap.innerHTML=''+
      '<div class="video-reaction-row">'+
        '<button type="button" class="video-reaction-btn '+(mine==='like'?'active':'')+'" id="videoLikeBtn">👍 Like <span id="videoLikeCount">'+counts.likes+'</span></button>'+
        '<button type="button" class="video-reaction-btn '+(mine==='dislike'?'active':'')+'" id="videoDislikeBtn">👎 Dislike <span id="videoDislikeCount">'+counts.dislikes+'</span></button>'+
        '<button type="button" class="video-comments-toggle" id="videoCommentsToggle">💬 Comments <span id="videoCommentCount">'+commentCount+'</span></button>'+
      '</div>'+
      '<div class="video-comments-panel" id="videoCommentsPanel">'+
        '<div class="video-comment-list" id="videoCommentList"></div>'+
        '<form class="video-comment-form" id="videoCommentForm">'+
          '<input id="videoCommentName" maxlength="100" required placeholder="Your Name">'+
          '<textarea id="videoCommentText" maxlength="2000" rows="3" required placeholder="Write your comment..."></textarea>'+
          '<button type="submit">Post Comment</button>'+
          '<div class="video-comment-status" id="videoCommentStatus"></div>'+
        '</form>'+
      '</div>';

    const list=document.getElementById('videoCommentList');
    list.innerHTML=comments.length ? comments.map(function(c){
      const date=c.created_at ? new Date(c.created_at).toLocaleDateString() : '';
      return '<div class="video-comment-item"><div class="video-comment-name">'+esc(c.name)+(date?'<span class="video-comment-date">'+esc(date)+'</span>':'')+'</div><div class="video-comment-text">'+esc(c.comment)+'</div></div>';
    }).join('') : '<div style="color:var(--gray);font-size:14px">No comments yet. Be the first to comment.</div>';

    document.getElementById('videoCommentsToggle').onclick=function(){
      document.getElementById('videoCommentsPanel').classList.toggle('open');
    };

    async function react(kind){
      const key=videoVisitorKey();
      const status=engagement.mine;
      try{
        if(status===kind){
          const del=await db.from('video_reactions').delete().eq('video_id',videoId).eq('visitor_key',key);
          if(del.error) throw del.error;
        }else if(status){
          const upd=await db.from('video_reactions').update({reaction:kind,updated_at:new Date().toISOString()}).eq('video_id',videoId).eq('visitor_key',key);
          if(upd.error) throw upd.error;
        }else{
          const ins=await db.from('video_reactions').insert({video_id:videoId,visitor_key:key,reaction:kind});
          if(ins.error) throw ins.error;
        }
        await loadVideoEngagement(videoId);
      }catch(e){console.error('Video reaction error:',e);alert('Sorry, your reaction could not be saved.');}
    }
    document.getElementById('videoLikeBtn').onclick=function(){react('like');};
    document.getElementById('videoDislikeBtn').onclick=function(){react('dislike');};

    document.getElementById('videoCommentForm').onsubmit=async function(e){
      e.preventDefault();
      const name=document.getElementById('videoCommentName').value.trim();
      const comment=document.getElementById('videoCommentText').value.trim();
      const status=document.getElementById('videoCommentStatus');
      if(!name || !comment){status.textContent='Please enter your name and comment.';return;}
      status.textContent='Posting...';
      const result=await db.from('video_comments').insert({video_id:videoId,name:name,comment:comment,is_approved:true});
      if(result.error){console.error('Video comment error:',result.error);status.textContent='Sorry, comment could not be posted.';return;}
      document.getElementById('videoCommentText').value='';
      status.textContent='Comment posted.';
      await loadVideoEngagement(videoId);
      document.getElementById('videoCommentsPanel').classList.add('open');
    };
  }

  async function loadVideoEngagement(videoId){
    const key=videoVisitorKey();
    try{
      const [reactions,mine,comments]=await Promise.all([
        db.from('video_reactions').select('reaction').eq('video_id',videoId),
        db.from('video_reactions').select('reaction').eq('video_id',videoId).eq('visitor_key',key).maybeSingle(),
        db.from('video_comments').select('id,name,comment,created_at').eq('video_id',videoId).eq('is_approved',true).order('created_at',{ascending:false})
      ]);
      if(reactions.error) throw reactions.error;
      if(mine.error && mine.error.code!=='PGRST116') throw mine.error;
      if(comments.error) throw comments.error;
      const rows=reactions.data||[];
      const counts={likes:rows.filter(x=>x.reaction==='like').length,dislikes:rows.filter(x=>x.reaction==='dislike').length};
      renderVideoEngagement(videoId,{counts:counts,mine:mine.data ? mine.data.reaction : null,comments:comments.data||[]});
    }catch(e){
      console.error('Video engagement load error:',e);
      renderVideoEngagement(videoId,{counts:{likes:0,dislikes:0},mine:null,comments:[]});
    }
  }

  window.openVideoDetail=function(id){
    ensureViewers();
    const overlay=document.getElementById('videoDetailOverlay');
    const title=document.getElementById('videoDetailTitle');
    const meta=document.getElementById('videoDetailMeta');
    const player=document.getElementById('videoDetailPlayer');
    const actions=document.getElementById('videoDetailActions');
    const engagement=document.getElementById('videoDetailEngagement');
    const description=document.getElementById('videoDetailDescription');

    overlay.classList.add('open');
    document.body.style.overflow='hidden';
    title.textContent='Loading video...';
    meta.textContent='';
    player.innerHTML='<div style="color:#fff;position:absolute;inset:0;display:flex;align-items:center;justify-content:center">Loading...</div>';
    actions.innerHTML='';
    engagement.innerHTML='';
    description.style.display='none';
    description.textContent='';

    db.from('blog_videos').select('*').eq('id',id).eq('is_published',true).maybeSingle().then(async function(r){
      if(r.error || !r.data){
        title.textContent='Video not found';
        player.innerHTML='<div style="color:#fff;position:absolute;inset:0;display:flex;align-items:center;justify-content:center">This video may have been removed or is not published.</div>';
        return;
      }
      const v=r.data;
      title.textContent=v.title || 'Quran Video';
      const metaParts=[v.category,v.author,v.duration].filter(Boolean);
      meta.textContent=metaParts.join(' • ');
      player.innerHTML=renderVideoSource(v.video_url,v.title || 'Quran Video');

      const slug=v.slug ? String(v.slug) : String(v.id);
      const websitePath='#video/'+encodeURIComponent(slug);
      actions.innerHTML='';
      try{ history.replaceState(null,'',websitePath); }catch(e){}

      const share=document.createElement('button');
      share.type='button';
      share.className='btn blog-action-share';
      share.textContent='📤 Share Video';
      share.onclick=function(){
        const url=absoluteUrl(websitePath);
        if(navigator.share){
          navigator.share({title:v.title || 'Quran Video',text:'Watch this video on Haroon Ibn Rasheed Online Quran Academy:',url:url}).catch(function(){});
        }else copyText(url,'Website video link copied!');
      };

      const copy=document.createElement('button');
      copy.type='button';
      copy.className='btn gold blog-action-copy';
      copy.textContent='🔗 Copy Link';
      copy.onclick=function(){copyText(absoluteUrl(websitePath),'Website video link copied!');};
      actions.appendChild(share);
      actions.appendChild(copy);

      if(v.description){
        description.style.display='block';
        description.textContent=v.description;
      }
      await loadVideoEngagement(v.id);
    }).catch(function(){
      title.textContent='Video unavailable';
      player.innerHTML='<div style="color:#fff;position:absolute;inset:0;display:flex;align-items:center;justify-content:center">Please try again later.</div>';
    });
  };

  /* Open a specific academy video automatically when its WEBSITE link is opened. */
  function openVideoFromWebsiteLink(){
    const hash=window.location.hash || '';
    const match=hash.match(/^#video\/(.+)$/);
    if(!match) return;
    const slug=decodeURIComponent(match[1]);
    db.from('blog_videos').select('id').eq('slug',slug).eq('is_published',true).maybeSingle().then(function(r){
      if(r.data && r.data.id) openVideoDetail(r.data.id);
    });
  }
  window.addEventListener('hashchange',openVideoFromWebsiteLink);

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      closeArticleDetail();
      closeVideoDetail();
    }
  });

  setTimeout(openVideoFromWebsiteLink,500);

  /* -------------------------
     ARTICLES LIST
  ------------------------- */
  const articlesPublic=document.getElementById('articlesPublic');
  if(articlesPublic){
    db.from('articles').select('*').eq('published',true).order('created_at',{ascending:false}).then(function(result){
      const data=result.data, error=result.error;
      if(error){
        console.error('Articles loading error:',error);
        articlesPublic.innerHTML='<div class="card"><div class="card-body"><h3>Articles unavailable</h3><p>Please try again later.</p></div></div>';
        return;
      }
      if(!data || !data.length){
        articlesPublic.innerHTML='<div class="card"><div class="card-body"><h3>Articles coming soon</h3><p>The academy will publish useful Quran learning articles here.</p></div></div>';
        return;
      }
      articlesPublic.innerHTML=data.map(function(a){
        const excerpt=a.excerpt || a.body || '';
        return '<article class="card">'+
          (a.image_url ? '<img src="'+esc(a.image_url)+'" alt="'+esc(a.title)+'" loading="lazy">' : '')+
          '<div class="card-body">'+
          '<h3>'+esc(a.title)+'</h3>'+
          '<p>'+esc(excerpt.length>220 ? excerpt.slice(0,220)+'…' : excerpt)+'</p>'+
          '<div class="blog-actions"><button type="button" class="btn" onclick="openArticleDetail(\''+String(a.id).replace(/'/g,"\\'")+'\')">📖 Read More</button></div>'+
          '</div></article>';
      }).join('');
    }).catch(function(error){console.error('Articles unexpected error:',error);});
  }

  /* -------------------------
     VIDEOS LIST
  ------------------------- */
  const videosPublic=document.getElementById('videosPublic');
  if(videosPublic){
    db.from('blog_videos').select('*').eq('is_published',true).order('featured',{ascending:false}).order('created_at',{ascending:false}).then(function(result){
      const data=result.data, error=result.error;
      if(error){
        console.error('Videos loading error:',error);
        videosPublic.innerHTML='<div class="card"><div class="card-body"><h3>Videos unavailable</h3><p>Please try again later.</p></div></div>';
        return;
      }
      if(!data || !data.length){
        videosPublic.innerHTML='<div class="card"><div class="card-body"><h3>Videos coming soon</h3><p>Quran learning videos and Islamic educational content will appear here.</p></div></div>';
        return;
      }
      videosPublic.innerHTML=data.map(function(v){
        const title=esc(v.title || 'Quran Video');
        const description=esc(v.description || '');
        const category=esc(v.category || '');
        const author=esc(v.author || '');
        const duration=esc(v.duration || '');
        const thumb=v.thumbnail_url ? '<img src="'+esc(v.thumbnail_url)+'" alt="'+title+'" loading="lazy">' : '<div style="height:205px;background:#07394a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:50px">▶</div>';
        const meta=[category,author,duration].filter(Boolean).map(function(x){return '<span>'+x+'</span>';}).join('');
        return '<article class="card video-public-card">'+
          '<div class="video-public-thumbnail">'+thumb+(v.featured?'<span class="video-featured">Featured</span>':'')+(duration?'<span class="video-duration">'+duration+'</span>':'')+'</div>'+
          '<div class="card-body">'+
          '<h3>'+title+'</h3>'+
          (meta?'<div class="video-meta">'+meta+'</div>':'')+
          (description?'<p>'+description+'</p>':'')+
          '<div class="blog-actions"><button type="button" class="btn" onclick="openVideoDetail(\''+String(v.id).replace(/'/g,"\\'")+'\')">▶ Watch Video</button></div>'+
          '</div></article>';
      }).join('');
    }).catch(function(error){console.error('Videos unexpected error:',error);});
  }

  /* -------------------------
     PUBLIC REVIEW SUBMISSION
  ------------------------- */
  const publicReviewForm=document.getElementById('publicReviewForm');
  if(publicReviewForm){
    publicReviewForm.addEventListener('submit',async function(e){
      e.preventDefault();
      const name=document.getElementById('reviewStudentName').value.trim();
      const rating=Number(document.getElementById('reviewRating').value);
      const review=document.getElementById('reviewText').value.trim();
      const message=document.getElementById('publicReviewMessage');
      if(!name || !review){message.innerHTML='<p>Please enter your name and review.</p>';return;}
      if(rating<1 || rating>5){message.innerHTML='<p>Please select a valid rating.</p>';return;}
      message.innerHTML='<p>Submitting your review...</p>';
      try{
        const result=await db.from('testimonials').insert({student_name:name,review:review,rating:rating,active:false});
        if(result.error){console.error('Review submission error:',result.error);message.innerHTML='<p>Sorry, your review could not be submitted. Please try again.</p>';return;}
        publicReviewForm.reset();
        message.innerHTML='<p>✅ Thank you! Your review has been submitted and is awaiting approval.</p>';
      }catch(error){console.error('Review submission error:',error);message.innerHTML='<p>Something went wrong. Please try again.</p>';}
    });
  }

  /* -------------------------
     APPROVED REVIEWS
  ------------------------- */
  const testimonialsPublic=document.getElementById('testimonialsPublic');
  if(testimonialsPublic){
    db.from('testimonials').select('*').eq('active',true).order('created_at',{ascending:false}).then(function(result){
      const data=result.data,error=result.error;
      if(error){
        console.error('Reviews loading error:',error);
        testimonialsPublic.innerHTML='<div class="card"><div class="card-body"><h3>Reviews unavailable</h3><p>Please try again later.</p></div></div>';
        return;
      }
      if(!data || !data.length){
        testimonialsPublic.innerHTML='<div class="card"><div class="card-body"><h3>Reviews coming soon</h3><p>Student and family reviews will appear here.</p></div></div>';
        return;
      }
      testimonialsPublic.innerHTML=data.map(function(item){
        const rating=Math.max(0,Math.min(5,Number(item.rating || 5)));
        return '<article class="card"><div class="card-body"><h3>'+('★'.repeat(rating))+'</h3><p>'+esc(item.review)+'</p><strong>'+esc(item.student_name)+'</strong></div></article>';
      }).join('');
    }).catch(function(error){console.error('Reviews unexpected error:',error);});
  }

})();

;

(function(){
  'use strict';

  /* Capture the original branding before public-headers.js runs its branding override. */
  var originalBrand = document.querySelector('header .brand');
  var originalBrandHTML = originalBrand ? originalBrand.innerHTML : '';
  var originalTitle = document.title;

  /* 29 unique real-photography URLs: Home 5 + every other public page 3 each. */
  var REAL_HEADER_PHOTOS = {
    home: [
      'https://images.unsplash.com/photo-1720654073347-e7c5ca2ecaa2?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=82&w=1800',
      'https://images.unsplash.com/photo-1758696642916-7aba128db6bf?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=82&w=1800',
      'https://images.unsplash.com/photo-1577792077974-0a424b741d34?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=82&w=1800',
      'https://images.unsplash.com/photo-1673178643274-ecd2de1716bb?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=82&w=1800',
      'https://images.unsplash.com/photo-1652064588708-2a3eefd68077?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=82&w=1800'
    ],
    about: [
      'https://www.hola.com/horizon/original_aspect_ratio/5c31e64398a3-06-badshahi-masjidadobestock281869693-a.jpg?im=Resize%3D%28960%29',
      'https://images.unsplash.com/photo-1558542403-bb396707e7da?ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8TW9zcXUlQzMlQTllJTIwRmFpc2FsJTIwcGhvdG98ZW58MHx8MHx8&ixlib=rb-4.0.3&q=80&w=1000',
      'https://upload.wikimedia.org/wikipedia/commons/9/97/Courtyard_of_Shah_Jahan_Mosque.JPG'
    ],
    courses: [
      'https://1rsrs.rationaltabs.com/CMS/3DC25B58-0B97-4C8E-AC3A-B5E9EA47FC30/addcourses/e2bwwbiifsm0m3rk3f.webp',
      'https://www.waraqaweb.com/images/About_page%20%281%29.jpg',
      'https://assets.pikiran-rakyat.com/crop/0x0%3A0x0/720x0/webp/photo/2023/07/28/790755058.jpg'
    ],
    teachers: [
      'https://www.tasleemalquran.com/teacher-female-1.png',
      'https://www.noohquranlearningcentre.com/assets/course-tajweed-LPPPqxgH.webp',
      'https://assets.pikiran-rakyat.com/crop/0x0%3A0x0/720x0/webp/photo/2025/11/04/4264800646.jpeg'
    ],
    fees: [
      'https://images.pexels.com/photos/36695127/pexels-photo-36695127.jpeg?cs=srgb&dl=pexels-rakhmatsuwandi-36695127.jpg&fm=jpg',
      'https://images.pexels.com/photos/35361329/pexels-photo-35361329.jpeg?cs=srgb&dl=pexels-tkirkgoz-35361329.jpg&fm=jpg',
      'https://images.unsplash.com/photo-1730474506965-2b659b1d6a71?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDMzfHx8ZW58MHx8fHx8&ixlib=rb-4.1.0&q=60&w=3000'
    ],
    contact: [
      'https://images.pexels.com/photos/39965216/pexels-photo-39965216.jpeg?cs=srgb&dl=pexels-adem-albayrak-383796555-39965216.jpg&fm=jpg',
      'https://miro.medium.com/v2/resize%3Afit%3A1400/1%2AxLOsiu0XZPMWRz_99JDxdg.jpeg',
      'https://images.pexels.com/photos/34282549/pexels-photo-34282549.jpeg?cs=srgb&dl=pexels-umar-faruq-1662051319-34282549.jpg&fm=jpg'
    ],
    faq: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/PUTRA_MOSQUE_ARCHITECTURE.jpg/1280px-PUTRA_MOSQUE_ARCHITECTURE.jpg',
      'https://cdns.klimg.com/resized/1200x600/p/headline/arti-nama-nuril-makna-cah-e82da15a4bcc.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Courtyard_-_The_Sultan_Ahmed_Mosque_%28Blue_Mosque%29_with_people_digitally_removed_%288459612400%29.jpg/3840px-Courtyard_-_The_Sultan_Ahmed_Mosque_%28Blue_Mosque%29_with_people_digitally_removed_%288459612400%29.jpg'
    ],
    blog: [
      'https://images.unsplash.com/photo-1652964287112-438ece0a6acc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDMyfHxtZWNjYXxlbnwwfHx8fDE3MzM3NDQxNjB8MA&ixlib=rb-4.0.3&q=80&w=2000',
      'https://beautpic.klev.club/uploads/posts/2025-05/2266/mecheti_musulmanskie_109_f3380bbd.jpg',
      'https://images.pexels.com/photos/17277258/pexels-photo-17277258.jpeg?cs=srgb&dl=pexels-safak-batura-518884812-17277258.jpg&fm=jpg'
    ],
    reviews: [
      'https://1rsrs.rationaltabs.com/CMS/3DC25B58-0B97-4C8E-AC3A-B5E9EA47FC30/addcourses/e2bwwbiifsm0m3rk3f.webp',
      'https://static.republika.co.id/uploads/images/inpicture_slide/kegiatan-belajar-mengaji-alquran_230405152204-909.jpg',
      'https://hakyolcular.com/uploads/images/2024/10/image_750x500_67234ba5e52ec.jpg'
    ]
  };

  var PAGE_TITLES = {
    about:['ABOUT OUR ACADEMY','About Our Academy','Guiding Families With Quran Education'],
    courses:['OUR QURAN COURSES','Learn Quran With a Clear, Personal Path','Explore Quran reading, Tajweed, Hifz and Islamic studies.'],
    teachers:['OUR TEACHERS','Qualified Quran Teachers','Learn with experienced teachers through caring one-to-one guidance.'],
    fees:['FEES & PLANS','Simple, Transparent & Flexible','Choose a Quran learning plan that fits your schedule.'],
    contact:['CONTACT US','We Are Here to Help','Ask about classes, teachers, timings, registration or fees.'],
    faq:['FAQS','Answers Before You Start','Quick answers about classes, timings, registration and learning support.'],
    blog:['QURAN & ISLAMIC ARTICLES','Learn Beyond the Classroom','Helpful Quranic and Islamic educational articles.'],
    reviews:['STUDENT REVIEWS','Families Share Their Experience','Real learning experiences from students and families.']
  };

  function makeAboutHero(){
    var main=document.getElementById('about');
    if(!main || main.querySelector(':scope > .page-hero')) return;
    var s=document.createElement('section');
    s.className='page-hero real-photo-about-hero';
    s.setAttribute('data-hero','about');
    s.innerHTML='<div class="page-hero-slides"></div><div class="page-hero-content"><div class="eyebrow">ABOUT OUR ACADEMY</div><h1>About Our Academy</h1><p>Guiding Families With Quran Education</p><div class="page-hero-dots"></div></div>';
    main.insertBefore(s,main.firstElementChild);
  }

  function setupHero(page){
    var main=document.getElementById(page);
    if(!main) return;
    var hero=main.querySelector(':scope > .page-hero');
    if(!hero) return;
    var urls=REAL_HEADER_PHOTOS[page];
    if(!urls || !urls.length) return;
    var box=hero.querySelector('.page-hero-slides');
    if(!box){
      box=document.createElement('div');
      box.className='page-hero-slides';
      hero.prepend(box);
    }
    box.innerHTML='';
    var dots=hero.querySelector('.page-hero-dots');
    if(dots) dots.innerHTML='';
    urls.forEach(function(url,i){
      var slide=document.createElement('div');
      slide.className='page-hero-slide'+(i===0?' active':'');
      slide.style.backgroundImage='url("'+url.replace(/"/g,'\\"')+'")';
      box.appendChild(slide);
      if(dots){
        var dot=document.createElement('span');
        if(i===0) dot.className='active';
        dots.appendChild(dot);
      }
      var img=new Image(); img.src=url;
    });
    var index=0;
    setInterval(function(){
      var all=box.querySelectorAll('.page-hero-slide');
      if(!all.length) return;
      all[index].classList.remove('active');
      if(dots && dots.children[index]) dots.children[index].classList.remove('active');
      index=(index+1)%all.length;
      all[index].classList.add('active');
      if(dots && dots.children[index]) dots.children[index].classList.add('active');
    },5000);
  }

  function cleanOldRuntime(){
    /* Keep the real-photo headers/slideshow inserted by public-headers.js. */
    var runtime=document.getElementById('publicHeaderRuntimeStyles');
    if(runtime) runtime.remove();
    if(originalBrand && originalBrandHTML) originalBrand.innerHTML=originalBrandHTML;
    document.title=originalTitle;
  }

  function init(){
    /* The existing JS may have inserted its old SVG headers; remove only those headers. */
    cleanOldRuntime();
    /* Header photography is managed by js/public-headers.js to avoid duplicate/conflicting slideshows. */
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
