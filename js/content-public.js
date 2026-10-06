(function(){

  const cfg = window.SUPABASE_CONFIG || {};

  if(
    !window.supabase ||
    !cfg.url ||
    !cfg.anonKey
  ){
    console.error("Supabase configuration not found.");
    return;
  }

  const db = window.supabase.createClient(
    cfg.url,
    cfg.anonKey
  );


  /* =====================================================
     ESCAPE HTML
  ===================================================== */

  function esc(value){

    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');

  }


  /* =====================================================
     ARTICLES
  ===================================================== */

  const articlesPublic =
    document.getElementById('articlesPublic');

  if(articlesPublic){

    db
      .from('articles')
      .select('*')
      .eq('published',true)
      .order('created_at',{ascending:false})

      .then(function(result){

        const data = result.data;
        const error = result.error;

        if(error){

          console.error(
            'Articles load error:',
            error
          );

          articlesPublic.innerHTML =
            '<p>Unable to load articles.</p>';

          return;
        }

        if(!data || !data.length){

          articlesPublic.innerHTML =
            '<p>No articles available yet.</p>';

          return;
        }

        articlesPublic.innerHTML =
          data.map(function(article){

            return `
              <article class="card">
                <div class="card-body">
                  <h3>${esc(article.title)}</h3>
                  <p>${esc(article.excerpt || article.description || '')}</p>
                  <a href="${esc(article.url || '#')}" class="btn">
                    Read More
                  </a>
                </div>
              </article>
            `;

          }).join('');

      })

      .catch(function(error){

        console.error(
          'Articles unexpected error:',
          error
        );

        articlesPublic.innerHTML =
          '<p>Unable to load articles.</p>';

      });

  }


  /* =====================================================
     REVIEWS / TESTIMONIALS
  ===================================================== */

  const testimonialsPublic =
    document.getElementById('testimonialsPublic');

  if(testimonialsPublic){

    db
      .from('testimonials')
      .select('*')
      .eq('active',true)
      .order('created_at',{ascending:false})

      .then(function(result){

        const data = result.data;
        const error = result.error;

        if(error){

          console.error(
            'Testimonials load error:',
            error
          );

          testimonialsPublic.innerHTML =
            '<p>Unable to load reviews.</p>';

          return;
        }

        if(!data || !data.length){

          testimonialsPublic.innerHTML =
            '<p>No reviews available yet.</p>';

          return;
        }

        testimonialsPublic.innerHTML =
          data.map(function(item){

            const rating =
              Math.max(
                0,
                Math.min(
                  5,
                  Number(item.rating) || 0
                )
              );

            const stars =
              '★'.repeat(rating) +
              '☆'.repeat(5 - rating);

            return `
              <div class="card testimonial-card">
                <div class="card-body">
                  <div class="stars" aria-label="${rating} out of 5">
                    ${stars}
                  </div>

                  <p>
                    “${esc(item.review || '')}”
                  </p>

                  <strong>
                    ${esc(item.student_name || 'Student')}
                  </strong>
                </div>
              </div>
            `;

          }).join('');

      })

      .catch(function(error){

        console.error(
          'Testimonials unexpected error:',
          error
        );

        testimonialsPublic.innerHTML =
          '<p>Unable to load reviews.</p>';

      });

  }


  /* =====================================================
     PUBLIC REVIEW SUBMISSION
  ===================================================== */

  const publicReviewForm =
    document.getElementById('publicReviewForm');

  if(publicReviewForm){

    publicReviewForm.addEventListener(
      'submit',
      function(e){

        e.preventDefault();

        const name =
          document
            .getElementById('reviewStudentName')
            .value
            .trim();

        const rating =
          Number(
            document
              .getElementById('reviewRating')
              .value
          );

        const review =
          document
            .getElementById('reviewText')
            .value
            .trim();

        const message =
          document.getElementById(
            'publicReviewMessage'
          );

        if(!name || !review){

          message.innerHTML =
            '<p>Please enter your name and review.</p>';

          return;
        }

        if(rating < 1 || rating > 5){

          message.innerHTML =
            '<p>Please select a valid rating.</p>';

          return;
        }

        message.innerHTML =
          '<p>Submitting your review...</p>';

        db
          .from('testimonials')
          .insert({

            student_name: name,
            review: review,
            rating: rating,
            active: false

          })

          .then(function(result){

            const error = result.error;

            if(error){

              console.error(
                'Review submission error:',
                error
              );

              message.innerHTML =
                '<p>Sorry, your review could not be submitted. Please try again.</p>';

              return;
            }

            publicReviewForm.reset();

            message.innerHTML =
              '<p>✅ Thank you! Your review has been submitted and is awaiting approval.</p>';

          })

          .catch(function(error){

            console.error(
              'Review submission unexpected error:',
              error
            );

            message.innerHTML =
              '<p>Something went wrong. Please try again.</p>';

          });

      }
    );

  }


  /* =====================================================
     VIDEOS
  ===================================================== */

  const videosPublic =
    document.getElementById('videosPublic');

  function absoluteVideoUrl(path){

    if(!path){
      return '';
    }

    if(
      path.startsWith('http://') ||
      path.startsWith('https://')
    ){
      return path;
    }

    return new URL(
      path,
      window.location.href
    ).href;

  }

  window.copyAcademyVideo =
    function(url){

      if(!url){
        return;
      }

      navigator.clipboard
        .writeText(url)
        .then(function(){

          alert('Video link copied.');

        })
        .catch(function(){

          prompt(
            'Copy this video link:',
            url
          );

        });

    };


  window.shareAcademyVideo =
    function(url,title){

      if(
        navigator.share
      ){

        navigator.share({

          title:
            title ||
            'Haroon Ibn Rasheed Online Quran Academy',

          url:url

        }).catch(function(){});

        return;
      }

      window.copyAcademyVideo(url);

    };


  if(videosPublic){

    db
      .from('blog_videos')
      .select('*')
      .eq('is_published',true)
      .order('featured',{ascending:false})
      .order('created_at',{ascending:false})

      .then(function(result){

        const data = result.data;
        const error = result.error;

        if(error){

          console.error(
            'Videos load error:',
            error
          );

          videosPublic.innerHTML =
            '<p>Unable to load videos.</p>';

          return;
        }

        if(!data || !data.length){

          videosPublic.innerHTML =
            '<p>No videos available yet.</p>';

          return;
        }

        videosPublic.innerHTML =
          data.map(function(video){

            const videoUrl =
              absoluteVideoUrl(
                video.video_url ||
                video.url ||
                video.path ||
                ''
              );

            const thumbnail =
              video.thumbnail_url ||
              video.thumbnail ||
              '';

            return `
              <article class="card video-card">

                ${
                  thumbnail
                  ?
                  `<img
                    src="${esc(thumbnail)}"
                    alt="${esc(video.title || 'Quran Academy Video')}"
                    loading="lazy"
                  >`
                  :
                  ''
                }

                <div class="card-body">

                  <h3>
                    ${esc(
                      video.title ||
                      'Quran Academy Video'
                    )}
                  </h3>

                  ${
                    video.category
                    ?
                    `<p>${esc(video.category)}</p>`
                    :
                    ''
                  }

                  ${
                    video.author
                    ?
                    `<p>${esc(video.author)}</p>`
                    :
                    ''
                  }

                  ${
                    video.duration
                    ?
                    `<p>${esc(video.duration)}</p>`
                    :
                    ''
                  }

                  ${
                    videoUrl
                    ?
                    `
                    <div class="video-actions">

                      <a
                        href="${esc(videoUrl)}"
                        class="btn"
                        target="_blank"
                        rel="noopener"
                      >
                        Watch Video
                      </a>

                      <button
                        type="button"
                        class="btn"
                        onclick="shareAcademyVideo('${esc(videoUrl)}','${esc(video.title || '')}')"
                      >
                        Share
                      </button>

                      <button
                        type="button"
                        class="btn"
                        onclick="copyAcademyVideo('${esc(videoUrl)}')"
                      >
                        Copy Link
                      </button>

                    </div>
                    `
                    :
                    ''
                  }

                </div>

              </article>
            `;

          }).join('');

      })

      .catch(function(error){

        console.error(
          'Videos unexpected error:',
          error
        );

        videosPublic.innerHTML =
          '<p>Unable to load videos.</p>';

      });

  }


})();
