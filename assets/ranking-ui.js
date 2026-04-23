(function () {
  const STRINGS = {
    en: {
      loading: 'Loading ranking...',
      empty: 'No data yet. Play some videos to see the ranking!',
      error: 'Failed to load ranking.',
      plays: 'plays',
      watched: 'watched',
    },
    ja: {
      loading: 'ランキングを読み込み中...',
      empty: 'まだデータがありません。動画を再生するとランキングに反映されます！',
      error: 'ランキングの読み込みに失敗しました。',
      plays: '回再生',
      watched: '視聴',
    },
  };

  window.initRanking = async function (opts) {
    const period = opts.period || 'all';
    const country = opts.country || 'global';
    const sort = opts.sort || 'plays';
    const lang = opts.lang || 'en';
    const container = document.getElementById(opts.containerId || 'ranking-list');
    if (!container) return;

    const t = STRINGS[lang] || STRINGS.en;
    container.innerHTML = '<p class="ranking-loading">' + t.loading + '</p>';

    try {
      const params = new URLSearchParams({ period: period, country: country, sort: sort, limit: '20' });
      const res = await fetch('/api/ranking?' + params.toString());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const items = (json && json.data) || [];

      if (items.length === 0) {
        container.innerHTML = '<p class="ranking-empty">' + t.empty + '</p>';
        return;
      }

      container.innerHTML = items.map(function (item, i) {
        const url = videoUrl(item);
        const thumb = item.thumbnail
          ? '<img src="' + esc(item.thumbnail) + '" alt="" loading="lazy" width="120" height="68">'
          : '<div class="ranking-thumb-placeholder"></div>';
        const title = esc(item.title || item.video_id);
        const author = item.author ? '<span class="ranking-author">' + esc(item.author) + '</span>' : '';
        const plays = (item.play_count || 0).toLocaleString();
        const watch = fmtSecs(item.total_secs || 0);
        return ''
          + '<li class="ranking-entry">'
          +   '<span class="ranking-rank">#' + (i + 1) + '</span>'
          +   '<a class="ranking-thumb" href="/?v=' + encodeURIComponent(url) + '">' + thumb + '</a>'
          +   '<div class="ranking-info">'
          +     '<a class="ranking-title" href="/?v=' + encodeURIComponent(url) + '">' + title + '</a>'
          +     author
          +     '<span class="ranking-meta">' + plays + ' ' + t.plays + ' · ' + watch + ' ' + t.watched + '</span>'
          +     '<span class="ranking-service ranking-service--' + esc(item.service) + '">' + esc(item.service) + '</span>'
          +   '</div>'
          + '</li>';
      }).join('');

      container.classList.add('ranking-ready');
    } catch (e) {
      container.innerHTML = '<p class="ranking-error">' + t.error + '</p>';
    }
  };

  function videoUrl(item) {
    switch (item.service) {
      case 'youtube': return 'https://www.youtube.com/watch?v=' + item.video_id;
      case 'vimeo': return 'https://vimeo.com/' + item.video_id;
      case 'dailymotion': return 'https://www.dailymotion.com/video/' + item.video_id;
      default: return item.video_id;
    }
  }

  function fmtSecs(s) {
    const n = Math.max(0, Math.floor(s));
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm';
    return n + 's';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }
})();
