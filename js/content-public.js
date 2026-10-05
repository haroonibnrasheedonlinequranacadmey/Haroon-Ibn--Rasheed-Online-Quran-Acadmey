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
     SAFE HTML ESCAPE
  ===================================================== */

  function esc(value){

    return String(value ?? '').replace(
      /[&<>"']/g,

      function(c){

        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'

        }[c];

      }
    );

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
      .eq('published', true)
      .order('created_at', {
        ascending: false
      })

      .then(function(result){

        const data = result.data;
        const error = result.error;


        if(error){

          console.error(
            'Articles loading error:',
            error
          );

          articlesPublic.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h3>Articles unavailable</h3>
                <p>Please try again later.</p>
              </div>
            </div>
          `;

          return;
        }


        if(!data || !data.length){

          articlesPublic.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h3>Articles coming soon</h3>

                <p>
                  The academy will publish useful Quran
                  learning articles here.
                </p>
              </div>
            </div>
          `;

          return;
        }


        articlesPublic.innerHTML = data.map(function(article){

          return `

            <article class="card">

              ${
                article.image_url
                ? `
                  <img
                    src="${esc(article.image_url)}"
                    alt="${esc(article.title)}"
                    loading="lazy"
                  >
                `
                : ''
              }

              <div class="card-body">

                <h3>
                  ${esc(article.title)}
                </h3>

                <p>
                  ${esc(
                    article.excerpt ||
                    article.body ||
                    ''
                  )}
                </p>

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

      });

  }


  /* =====================================================
     TESTIMONIALS / REVIEWS
  ===================================================== */

  const testimonialsPublic =
    document.getElementById('testimonialsPublic');

  if(testimonialsPublic){

    db
      .from('testimonials')
      .select('*')
      .eq('active', true)
      .order('created_at', {
        ascending: false
      })

      .then(function(result){

        const data = result.data;
        const error = result.error;


        if(error){

          console.error(
            'Reviews loading error:',
            error
          );

          testimonialsPublic.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h3>Reviews unavailable</h3>
                <p>Please try again later.</p>
              </div>
            </div>
          `;

          return;
        }


        if(!data || !data.length){

          testimonialsPublic.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h3>Reviews coming soon</h3>

                <p>
                  Student and family reviews will
                  appear here.
                </p>
              </div>
            </div>
          `;

          return;
        }


        testimonialsPublic.innerHTML =
          data.map(function(item){

            const rating = Math.max(
              0,
              Math.min(
                5,
                Number(item.rating || 5)
              )
            );


            return `

              <article class="card">

                <div class="card-body">

                  <h3>
                    ${'★'.repeat(rating)}
                  </h3>

                  <p>
                    ${esc(item.review)}
                  </p>

                  <strong>
                    ${esc(item.student_name)}
                  </strong>

                </div>

              </article>

            `;

          }).join('');

      })

      .catch(function(error){

        console.error(
          'Reviews unexpected error:',
          error
        );

      });

  }


  /* =====================================================
     BLOG VIDEOS
  ===================================================== */

  const videosPublic =
    document.getElementById('videosPublic');

  if(videosPublic){

    db
      .from('blog_videos')
      .select('*')
      .eq('is_published', true)
      .order('featured', {
        ascending: false
      })
      .order('created_at', {
        ascending: false
      })

      .then(function(result){

        const data = result.data;
        const error = result.error;


        if(error){

          console.error(
            'Videos loading error:',
            error
          );

          videosPublic.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h3>Videos unavailable</h3>

                <p>
                  Please try again later.
                </p>
              </div>
            </div>
          `;

          return;
        }


        if(!data || !data.length){

          videosPublic.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h3>Videos coming soon</h3>

                <p>
                  Quran learning videos and
                  Islamic educational content
                  will appear here.
                </p>
              </div>
            </div>
          `;

          return;
        }


        videosPublic.innerHTML =
          data.map(function(video){

            const title =
              esc(video.title);

            const description =
              esc(
                video.description || ''
              );

            const category =
              esc(
                video.category || ''
              );

            const author =
              esc(
                video.author || ''
              );

            const duration =
              esc(
                video.duration || ''
              );


            const thumbnail =
              video.thumbnail_url

              ? `
                <img
                  src="${esc(video.thumbnail_url)}"
                  alt="${title}"
                  loading="lazy"
                >
              `

              : `
                <div class="video-placeholder">
                  ▶
                </div>
              `;


            const featured =
              video.featured

              ? `
                <span class="video-featured">
                  Featured
                </span>
              `

              : '';


            const meta = [

              category
                ? `<span>${category}</span>`
                : '',

              author
                ? `<span>${author}</span>`
                : '',

              duration
                ? `<span>${duration}</span>`
                : ''

            ]
            .filter(Boolean)
            .join('');


            return `

              <article class="card video-public-card">

                <div class="video-public-thumbnail">

                  ${thumbnail}

                  ${featured}

                  ${
                    duration
                    ? `
                      <span class="video-duration">
                        ${duration}
                      </span>
                    `
                    : ''
                  }

                </div>


                <div class="card-body">

                  <h3>
                    ${title}
                  </h3>


                  ${
                    meta

                    ? `
                      <div class="video-meta">
                        ${meta}
                      </div>
                    `

                    : ''
                  }


                  ${
                    description

                    ? `
                      <p>
                        ${description}
                      </p>
                    `

                    : ''
                  }


                  ${
                    video.video_url

                    ? `
                      <a
                        href="${esc(video.video_url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="video-watch-btn">

                        ▶ Watch Video

                      </a>
                    `

                    : ''
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

      });

  }


})();
