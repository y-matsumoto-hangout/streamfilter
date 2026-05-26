// Stream Filter ranking page SSR renderer.
// Renders a fully-formed HTML response with the ranking list pre-populated from D1,
// plus editorial intro/methodology/about copy for content depth (AdSense compliance).

const SORT_COL = { plays: 'play_count', watchtime: 'total_secs' };
const VALID_PERIOD = new Set(['today', 'week', 'month', 'all']);
const VALID_COUNTRY = new Set(['global', 'JP', 'US']);
const VALID_SORT = new Set(['plays', 'watchtime']);

// Slug → config table (used by [slug].js routes).
// Slug 'index' is reserved for the All-Time root (/ranking, /ja/ranking).
export const SLUG_CONFIG = {
  today:     { period: 'today', country: 'global', sort: 'plays'     },
  week:      { period: 'week',  country: 'global', sort: 'plays'     },
  month:     { period: 'month', country: 'global', sort: 'plays'     },
  jp:        { period: 'all',   country: 'JP',     sort: 'plays'     },
  us:        { period: 'all',   country: 'US',     sort: 'plays'     },
  watchtime: { period: 'all',   country: 'global', sort: 'watchtime' },
};

const T = {
  en: {
    siteName: 'Stream Filter',
    siteTagline: 'Adjust Brightness, Contrast & Color for Videos',
    period:  { today: 'Today',  week: 'This Week', month: 'This Month', all: 'All Time' },
    periodNav:{ today: 'Today',  week: 'Week',      month: 'Month',      all: 'All Time' },
    country: { global: 'Global', JP: 'Japan',       US: 'US' },
    sort:    { plays: 'Most Played', watchtime: 'Most Watched' },
    labelPeriod: 'Period',
    labelCountry: 'Country',
    labelSort: 'Sort',
    plays: 'plays',
    watched: 'watched',
    rank: '#',
    home: 'Stream Filter',
    nav: {
      home: 'Home',
      guide: 'How to Use',
      ranking: 'Ranking',
      privacy: 'Privacy Policy',
      terms: 'Terms',
    },
    bmc: 'Buy me a coffee',
    empty: 'No videos have been played yet for this ranking. Be the first to try Stream Filter and contribute to the chart.',
    methodologyHeading: 'How this ranking is calculated',
    methodologyBody:
      'Each entry in this ranking is recorded the moment a viewer pastes a video URL into Stream Filter and presses play. ' +
      'We count actual playback sessions through our brightness, contrast and saturation adjustment tool — not page views, ' +
      'embed previews, or autoplay events. The chart is built from aggregated play counts and cumulative watch time, ' +
      'recalculated daily at 09:00 JST by a Cloudflare Cron worker that processes the previous 24 hours of analytics. ' +
      'Twitch is excluded because Twitch\'s embed API does not expose play state, which would result in inflated numbers. ' +
      'YouTube, Vimeo and Dailymotion are all supported.',
    aboutHeading: 'About Stream Filter',
    aboutBody:
      'Stream Filter is a free, browser-based video filter tool that lets you adjust brightness, contrast, saturation, ' +
      'hue rotation, sepia, blur and zoom on streaming videos in real time. There is nothing to download, install or ' +
      'upload — paste a URL from YouTube, Vimeo or Dailymotion and the filter sliders apply CSS effects directly to the ' +
      'embedded player. Common use cases include rescuing dark or poorly-exposed footage, night-mode viewing with reduced ' +
      'blue light, color-vision assistance, examining fine detail with the zoom feature, and creating relaxed ambient ' +
      'background playback with blur. Stream Filter does not host, re-stream, modify, download or redistribute any video ' +
      'content — all filters are applied in your browser via standard CSS effects on the original embedded player.',
    relatedHeading: 'Explore other rankings',
    related: {
      today:     'Today',
      week:      'This week',
      month:     'This month',
      all:       'All time',
      jp:        'Japan',
      us:        'US',
      watchtime: 'By watch time',
    },
    htmlLang: 'en',
    ogLocale: 'en_US',
  },
  ja: {
    siteName: 'Stream Filter',
    siteTagline: '動画の明るさ・コントラスト・彩度をリアルタイム調整',
    period:  { today: '今日',     week: '今週',   month: '今月',   all: '全期間' },
    periodNav:{ today: '今日',     week: '今週',   month: '今月',   all: '全期間' },
    country: { global: 'グローバル', JP: '日本',     US: 'アメリカ' },
    sort:    { plays: '再生回数',   watchtime: '再生時間' },
    labelPeriod: '期間',
    labelCountry: '国',
    labelSort: '並び順',
    plays: '回再生',
    watched: '視聴',
    rank: '#',
    home: 'Stream Filter',
    nav: {
      home: 'ホーム',
      guide: '使い方',
      ranking: 'ランキング',
      privacy: 'プライバシーポリシー',
      terms: '利用規約',
    },
    bmc: 'コーヒーを贈る',
    empty: 'このランキング条件ではまだ再生データがありません。Stream Filter を試して、最初のランキング入りを目指してみてください。',
    methodologyHeading: 'ランキングの集計方法',
    methodologyBody:
      'このランキングは、視聴者が動画URLを Stream Filter に貼り付けて再生を開始した時点で1再生としてカウントしています。' +
      'ページの表示数や埋め込みプレビュー、自動再生は含めず、明るさ・コントラスト・彩度を調整するツール経由での実際の再生のみが対象です。' +
      'ランキングは累計再生回数および累計再生時間から算出され、毎日 JST 9時に Cloudflare Cron Worker が前24時間のアナリティクスを集計して更新します。' +
      'Twitch は埋め込みAPIが再生状態を取得できず数値が水増しされてしまうため対象外。' +
      'YouTube、Vimeo、Dailymotion の3サービスに対応しています。',
    aboutHeading: 'Stream Filter について',
    aboutBody:
      'Stream Filter は、ストリーミング動画の明るさ・コントラスト・彩度・色相回転・セピア・ぼかし・ズームをリアルタイムに調整できる無料のブラウザツールです。' +
      'インストール不要・アップロード不要で、YouTube・Vimeo・Dailymotion の動画URLを貼り付けるだけ。フィルタースライダーが埋め込みプレイヤーに CSS エフェクトを適用します。' +
      '暗い動画の救済、就寝前のブルーライト軽減ナイトモード、色覚補助、ズームによる細部の観察、ぼかしによるアンビエント再生など、用途は様々です。' +
      'Stream Filter はいかなる動画コンテンツもホスト・再配信・改変・ダウンロード・転送しません。すべてのフィルターは、お使いのブラウザ内で標準的な CSS エフェクトとしてオリジナルの埋め込みプレイヤーに適用されます。',
    relatedHeading: '他のランキングを見る',
    related: {
      today:     '今日',
      week:      '今週',
      month:     '今月',
      all:       '全期間',
      jp:        '日本',
      us:        'アメリカ',
      watchtime: '再生時間順',
    },
    htmlLang: 'ja',
    ogLocale: 'ja_JP',
  },
};

// Title and subtitle composition per page. Returns { title, subtitle, metaDesc }.
function pageMeta(lang, period, country, sort) {
  const t = T[lang];
  if (lang === 'en') {
    // Specific phrasings per dimension
    let title, subtitle, metaDesc;
    if (sort === 'watchtime') {
      title = 'Most Watched Videos by Watch Time';
      subtitle = 'Ranked by total cumulative watch time across all Stream Filter users.';
      metaDesc = 'The videos people watch longest on Stream Filter, ranked by total cumulative watch time. Updated daily.';
    } else if (country === 'JP') {
      title = 'Most Played Videos in Japan';
      subtitle = 'All-time ranking of the most-played videos by viewers in Japan on Stream Filter.';
      metaDesc = 'The most-played videos from Japan on Stream Filter, ranked by play count. Live brightness and color adjustments applied in-browser.';
    } else if (country === 'US') {
      title = 'Most Played Videos in the United States';
      subtitle = 'All-time ranking of the most-played videos by viewers in the United States on Stream Filter.';
      metaDesc = 'The most-played videos from the US on Stream Filter, ranked by play count. Live brightness and color adjustments applied in-browser.';
    } else if (period === 'today') {
      title = "Today's Most Played Videos";
      subtitle = 'Trending videos played today on Stream Filter, refreshed every day.';
      metaDesc = 'Trending videos people are watching today on Stream Filter with brightness and color filter adjustments. Updated daily.';
    } else if (period === 'week') {
      title = 'This Week\'s Most Played Videos';
      subtitle = 'The top-played videos on Stream Filter over the past seven days.';
      metaDesc = 'Top-played videos on Stream Filter over the past 7 days, ranked by play count. Daily refresh.';
    } else if (period === 'month') {
      title = 'This Month\'s Most Played Videos';
      subtitle = 'The top-played videos on Stream Filter over the past 30 days.';
      metaDesc = 'The most-played videos on Stream Filter over the past 30 days, ranked by play count. Updated every day.';
    } else {
      title = 'All-Time Video Ranking';
      subtitle = 'The most-played videos on Stream Filter across all time, all countries.';
      metaDesc = 'The all-time most-played videos on Stream Filter — the videos viewers keep coming back to with custom brightness, contrast, and color filters.';
    }
    return { title, subtitle, metaDesc };
  }

  // Japanese
  let title, subtitle, metaDesc;
  if (sort === 'watchtime') {
    title = '再生時間で見る人気動画ランキング';
    subtitle = 'Stream Filter 全ユーザーの累計再生時間で並べた動画ランキング。';
    metaDesc = 'Stream Filter で最も長く視聴された動画を、累計再生時間で並べた動画ランキング。毎日更新。';
  } else if (country === 'JP') {
    title = '日本で人気の動画ランキング';
    subtitle = '日本のユーザーが Stream Filter で再生した動画の全期間ランキング。';
    metaDesc = '日本のユーザーが Stream Filter で最も再生した動画ランキング。ブラウザ上で明るさや色味を調整しながら視聴。';
  } else if (country === 'US') {
    title = 'アメリカで人気の動画ランキング';
    subtitle = 'アメリカのユーザーが Stream Filter で再生した動画の全期間ランキング。';
    metaDesc = 'アメリカのユーザーが Stream Filter で最も再生した動画ランキング。ブラウザ上で明るさや色味を調整しながら視聴。';
  } else if (period === 'today') {
    title = '今日の人気動画ランキング';
    subtitle = '今日 Stream Filter で再生された人気動画。毎日更新。';
    metaDesc = '今日 Stream Filter で最も再生された動画ランキング。明るさ・コントラスト・彩度をリアルタイム調整しながら視聴。毎日更新。';
  } else if (period === 'week') {
    title = '今週の人気動画ランキング';
    subtitle = '直近7日間に Stream Filter で再生された人気動画。';
    metaDesc = '直近7日間に Stream Filter で最も再生された動画ランキング。毎日更新。';
  } else if (period === 'month') {
    title = '今月の人気動画ランキング';
    subtitle = '直近30日間に Stream Filter で再生された人気動画。';
    metaDesc = '直近30日間に Stream Filter で最も再生された動画ランキング。毎日更新。';
  } else {
    title = '全期間 動画ランキング';
    subtitle = 'Stream Filter の全期間累計の人気動画ランキング。';
    metaDesc = '全期間で Stream Filter において最も再生された動画ランキング。ブラウザ上で明るさ・コントラスト・彩度を調整しながら視聴できる無料ツール。';
  }
  return { title, subtitle, metaDesc };
}

// Canonical path for a given config + language.
function canonicalPath(lang, period, country, sort) {
  const prefix = lang === 'ja' ? '/ja' : '';
  if (sort === 'watchtime') return prefix + '/ranking/watchtime';
  if (country === 'JP') return prefix + '/ranking/jp';
  if (country === 'US') return prefix + '/ranking/us';
  if (period === 'today') return prefix + '/ranking/today';
  if (period === 'week')  return prefix + '/ranking/week';
  if (period === 'month') return prefix + '/ranking/month';
  return prefix + '/ranking';
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function videoUrl(item) {
  switch (item.service) {
    case 'youtube':     return 'https://www.youtube.com/watch?v=' + item.video_id;
    case 'vimeo':       return 'https://vimeo.com/' + item.video_id;
    case 'dailymotion': return 'https://www.dailymotion.com/video/' + item.video_id;
    default:            return item.video_id;
  }
}

function fmtSecs(secs) {
  const n = Math.max(0, Math.floor(Number(secs) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${n}s`;
}

function fmtInt(n) {
  return (Number(n) || 0).toLocaleString('en-US');
}

async function fetchRanking(env, period, country, sort, limit = 50) {
  if (!env || !env.DB) return [];
  const sortCol = SORT_COL[sort] || 'play_count';
  const stmt = env.DB.prepare(
    'SELECT r.video_id, r.service, r.play_count, r.total_secs, ' +
    'm.title, m.thumbnail, m.author ' +
    'FROM ranking_daily r ' +
    'LEFT JOIN video_meta m ON r.video_id = m.video_id AND r.service = m.service ' +
    'WHERE r.period = ? AND r.country = ? AND r.service != \'twitch\' ' +
    'ORDER BY r.' + sortCol + ' DESC ' +
    'LIMIT ?'
  );
  const result = await stmt.bind(period, country, limit).all();
  return (result && result.results) || [];
}

function renderItem(item, index, t) {
  const url = videoUrl(item);
  const title = escapeHtml(item.title || item.video_id);
  const author = item.author ? `<span class="ranking-author">${escapeHtml(item.author)}</span>` : '';
  const thumb = item.thumbnail
    ? `<img src="${escapeHtml(item.thumbnail)}" alt="${title}" loading="lazy" width="120" height="68">`
    : `<div class="ranking-thumb-placeholder"></div>`;
  const plays = fmtInt(item.play_count);
  const watch = fmtSecs(item.total_secs);
  const service = escapeHtml(item.service || '');
  const safeUrl = escapeHtml(url);
  return `
        <li class="ranking-entry">
          <span class="ranking-rank">${t.rank}${index + 1}</span>
          <a class="ranking-thumb" href="/?v=${encodeURIComponent(url)}" aria-label="${title}">${thumb}</a>
          <div class="ranking-info">
            <a class="ranking-title" href="/?v=${encodeURIComponent(url)}">${title}</a>
            ${author}
            <span class="ranking-meta">${plays} ${t.plays} · ${watch} ${t.watched}</span>
            <span class="ranking-service ranking-service--${service}">${service}</span>
          </div>
        </li>`;
}

// Build the related-pages nav (links to other ranking pages with descriptive anchor text).
function relatedLinks(lang, currentPath) {
  const t = T[lang];
  const prefix = lang === 'ja' ? '/ja' : '';
  const items = [
    { href: `${prefix}/ranking/today`,     label: t.related.today     },
    { href: `${prefix}/ranking/week`,      label: t.related.week      },
    { href: `${prefix}/ranking/month`,     label: t.related.month     },
    { href: `${prefix}/ranking`,           label: t.related.all       },
    { href: `${prefix}/ranking/jp`,        label: t.related.jp        },
    { href: `${prefix}/ranking/us`,        label: t.related.us        },
    { href: `${prefix}/ranking/watchtime`, label: t.related.watchtime },
  ];
  return items
    .filter(i => i.href !== currentPath)
    .map(i => `<a href="${i.href}">${escapeHtml(i.label)}</a>`)
    .join(' · ');
}

function buildTabsHtml(lang, period, country, sort) {
  const t = T[lang];
  const prefix = lang === 'ja' ? '/ja' : '';
  const cls = (cond) => cond ? ' class="active"' : '';
  return `
      <div class="tabs">
        <span class="label">${t.labelPeriod}</span>
        <a href="${prefix}/ranking/today"${cls(period === 'today')}>${t.periodNav.today}</a>
        <a href="${prefix}/ranking/week"${cls(period === 'week')}>${t.periodNav.week}</a>
        <a href="${prefix}/ranking/month"${cls(period === 'month')}>${t.periodNav.month}</a>
        <a href="${prefix}/ranking"${cls(period === 'all' && country === 'global' && sort === 'plays')}>${t.periodNav.all}</a>
      </div>
      <div class="tabs">
        <span class="label">${t.labelCountry}</span>
        <a href="${prefix}/ranking"${cls(country === 'global' && sort !== 'watchtime' && period === 'all')}>${t.country.global}</a>
        <a href="${prefix}/ranking/jp"${cls(country === 'JP')}>${t.country.JP}</a>
        <a href="${prefix}/ranking/us"${cls(country === 'US')}>${t.country.US}</a>
      </div>
      <div class="tabs">
        <span class="label">${t.labelSort}</span>
        <a href="${prefix}/ranking"${cls(sort === 'plays' && country === 'global' && period === 'all')}>${t.sort.plays}</a>
        <a href="${prefix}/ranking/watchtime"${cls(sort === 'watchtime')}>${t.sort.watchtime}</a>
      </div>`;
}

const CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Segoe UI', sans-serif; background: #0f0f0f; color: #ccc; min-height: 100vh; line-height: 1.6; }
    header { width: 100%; padding: 12px 24px; display: flex; align-items: center; gap: 12px; background: #1a1a1a; border-bottom: 1px solid #333; }
    header a.logo-link { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    header h1 { font-size: 18px; font-weight: 600; color: #fff; }
    .logo { width: 28px; height: 28px; background: #ff4444; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #fff; }
    main { max-width: 960px; margin: 0 auto; padding: 40px 24px 60px; }
    h2 { color: #fff; font-size: 28px; margin-bottom: 8px; }
    h3 { color: #fff; font-size: 18px; margin: 32px 0 12px; }
    .subtitle { color: #888; font-size: 16px; margin-bottom: 24px; }
    .intro, .methodology, .about { color: #b8b8b8; margin: 16px 0; }
    .related { margin-top: 32px; padding: 16px 0; border-top: 1px solid #1a1a1a; font-size: 14px; color: #888; }
    .related a { color: #aaa; margin: 0 4px; }
    .related a:hover { color: #fff; }
    a { color: #ff4444; text-decoration: none; }
    a:hover { color: #ff6666; }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; }
    .tabs .label { color: #888; font-size: 12px; padding: 8px 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .tabs button, .tabs a { padding: 8px 14px; background: #1a1a1a; border: 1px solid #282828; color: #ccc; border-radius: 20px; font-size: 14px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .tabs button:hover, .tabs a:hover { background: #252525; color: #fff; }
    .tabs button.active, .tabs a.active { background: #ff4444; border-color: #ff4444; color: #fff; }
    .ranking-empty { text-align: center; padding: 48px 24px; color: #666; }
    ol.ranking-list, ul.ranking-list { list-style: none; padding: 0; margin: 24px 0; }
    .ranking-entry { display: flex; align-items: center; gap: 16px; padding: 14px 12px; border-bottom: 1px solid #1a1a1a; }
    .ranking-entry:hover { background: #131313; }
    .ranking-rank { font-size: 20px; font-weight: 700; color: #ff4444; min-width: 44px; text-align: center; }
    .ranking-thumb { flex-shrink: 0; }
    .ranking-thumb img { display: block; border-radius: 6px; background: #222; }
    .ranking-thumb-placeholder { width: 120px; height: 68px; border-radius: 6px; background: #1a1a1a; border: 1px solid #282828; }
    .ranking-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .ranking-title { color: #fff; font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ranking-title:hover { color: #ff6666; }
    .ranking-author { color: #888; font-size: 13px; }
    .ranking-meta { color: #666; font-size: 12px; }
    .ranking-service { display: inline-block; margin-top: 2px; font-size: 10px; padding: 2px 8px; border-radius: 10px; background: #1a1a1a; border: 1px solid #282828; color: #888; text-transform: uppercase; letter-spacing: 0.5px; width: fit-content; }
    .ranking-service--youtube { border-color: #552222; color: #ff6666; }
    .ranking-service--vimeo { border-color: #1a4459; color: #4ea8c8; }
    .ranking-service--dailymotion { border-color: #3f2d59; color: #8b6fc4; }
    footer { width: 100%; padding: 20px 24px; text-align: center; font-size: 12px; color: #555; border-top: 1px solid #1a1a1a; }
    footer a { color: #777; margin: 0 12px; }
    footer a:hover { color: #fff; }
    @media (max-width: 600px) {
      main { padding: 24px 12px 40px; }
      .ranking-thumb img, .ranking-thumb-placeholder { width: 80px; height: 45px; }
      .ranking-rank { font-size: 16px; min-width: 32px; }
      h2 { font-size: 22px; }
    }
`;

function introCopy(lang, period, country, sort) {
  if (lang === 'en') {
    if (sort === 'watchtime') {
      return 'These are the videos that hold viewers\' attention longest on Stream Filter, ranked not by raw play count but by total cumulative watch time. ' +
             'A long-form documentary watched in full will outrank a popular short loop, which makes this view useful when you want to discover ' +
             'content people actually finished — not just clicked.';
    }
    if (country === 'JP') {
      return 'Below is the all-time list of videos most frequently played by viewers visiting Stream Filter from Japan. ' +
             'Country detection is based on IP geolocation at the moment of playback, so this reflects active local viewing rather than upload origin or audience demographics.';
    }
    if (country === 'US') {
      return 'Below is the all-time list of videos most frequently played by viewers visiting Stream Filter from the United States. ' +
             'Country detection is based on IP geolocation at the moment of playback, so this reflects active local viewing rather than the video\'s production location.';
    }
    if (period === 'today') {
      return 'This page lists the trending videos played on Stream Filter today. ' +
             'The chart resets every day at 09:00 JST when our scheduled job rolls up the previous 24 hours of playback events from Cloudflare Analytics Engine into the ranking table.';
    }
    if (period === 'week') {
      return 'This page lists the most-played videos on Stream Filter over the past seven days. ' +
             'It\'s a good middle ground between the volatile daily chart and the slower-moving monthly chart — recent hits stay visible long enough to actually find them.';
    }
    if (period === 'month') {
      return 'This page lists the most-played videos on Stream Filter over the past thirty days. ' +
             'The monthly view smooths out day-to-day spikes, so videos that climb here tend to have genuine staying power rather than just a one-day burst of attention.';
    }
    return 'Welcome to the all-time Stream Filter video ranking. ' +
           'These are the videos viewers have come back to most often since we started tracking — across YouTube, Vimeo and Dailymotion, ' +
           'all viewed through our real-time brightness, contrast and color adjustment tool.';
  }

  // Japanese
  if (sort === 'watchtime') {
    return 'このランキングは、再生回数ではなく累計再生時間で動画を並べたものです。' +
           '途中で離脱されやすい短尺コンテンツよりも、最後まで視聴される長尺コンテンツが上位に並びます。' +
           'クリック数ではなく「実際に視聴された時間」で評価したいときに役立つランキングです。';
  }
  if (country === 'JP') {
    return '日本から Stream Filter にアクセスして再生された動画の全期間累計ランキングです。' +
           '国の判定は再生時点の IP ジオロケーションを元にしており、動画自体のアップロード地域や視聴者層ではなく、' +
           '実際に日本国内で視聴されている動画を反映しています。';
  }
  if (country === 'US') {
    return 'アメリカから Stream Filter にアクセスして再生された動画の全期間累計ランキングです。' +
           '国の判定は再生時点の IP ジオロケーションを元にしており、動画自体の制作地域ではなく、' +
           '実際にアメリカ国内で視聴されている動画を反映しています。';
  }
  if (period === 'today') {
    return '今日 Stream Filter で再生されたトレンド動画のランキングです。' +
           '毎日 JST 9時に Cloudflare Analytics Engine 上の前24時間の再生イベントを集計し、ランキングテーブルを更新しています。';
  }
  if (period === 'week') {
    return '直近7日間に Stream Filter で再生された人気動画のランキングです。' +
           '変動の激しい日次ランキングと、動きの遅い月次ランキングの中間に位置する、いい塩梅の視点です。' +
           '最近のヒット作が、見つけられるくらいの期間ランクインし続けます。';
  }
  if (period === 'month') {
    return '直近30日間に Stream Filter で再生された人気動画のランキングです。' +
           '月次ランキングは日々の急上昇をならすため、一時的なバズではなく本当に支持されている動画が上位に残りやすい傾向があります。';
  }
  return 'Stream Filter の全期間累計の動画ランキングです。' +
         '計測開始以来、最も繰り返し再生された動画を YouTube・Vimeo・Dailymotion 横断で並べています。' +
         '明るさ・コントラスト・彩度をリアルタイム調整するツールを通じて視聴された動画のみが対象です。';
}

export async function renderRankingPage(env, { period, country, sort, lang }) {
  // Validate
  if (!VALID_PERIOD.has(period)) period = 'all';
  if (!VALID_COUNTRY.has(country)) country = 'global';
  if (!VALID_SORT.has(sort)) sort = 'plays';
  if (lang !== 'ja') lang = 'en';

  const t = T[lang];
  const items = await fetchRanking(env, period, country, sort, 50);
  const { title, subtitle, metaDesc } = pageMeta(lang, period, country, sort);
  const canonical = canonicalPath(lang, period, country, sort);
  const fullCanonical = `https://streamfilter.tv${canonical}`;
  const altEn = `https://streamfilter.tv${canonicalPath('en', period, country, sort)}`;
  const altJa = `https://streamfilter.tv${canonicalPath('ja', period, country, sort)}`;
  const homeHref = lang === 'ja' ? '/ja/' : '/';
  const guideHref = lang === 'ja' ? '/ja/guide.html' : '/guide.html';

  const listHtml = items.length === 0
    ? `<p class="ranking-empty">${escapeHtml(t.empty)}</p>`
    : `<ol class="ranking-list">${items.map((it, i) => renderItem(it, i, t)).join('')}\n      </ol>`;

  const tabs = buildTabsHtml(lang, period, country, sort);
  const related = relatedLinks(lang, canonical);
  const intro = introCopy(lang, period, country, sort);

  const html = `<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Stream Filter</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <link rel="canonical" href="${fullCanonical}">
  <link rel="alternate" hreflang="en" href="${altEn}">
  <link rel="alternate" hreflang="ja" href="${altJa}">
  <link rel="alternate" hreflang="x-default" href="${altEn}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23ff4444'/><polygon points='38,25 38,75 78,50' fill='white'/></svg>">
  <meta property="og:title" content="${escapeHtml(title)} - Stream Filter">
  <meta property="og:description" content="${escapeHtml(metaDesc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${fullCanonical}">
  <meta property="og:image" content="https://streamfilter.tv/ogp.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="${t.ogLocale}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)} - Stream Filter">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
  <meta name="twitter:image" content="https://streamfilter.tv/ogp.png">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2360009503992783" crossorigin="anonymous"></script>
  <style>${CSS}</style>
</head>
<body>
  <header>
    <a class="logo-link" href="${homeHref}">
      <div class="logo">&#9655;</div>
      <h1>${escapeHtml(t.home)}</h1>
    </a>
  </header>
  <main>
    <h2>${escapeHtml(title)}</h2>
    <p class="subtitle">${escapeHtml(subtitle)}</p>

    <p class="intro">${escapeHtml(intro)}</p>

${tabs}

    ${listHtml}

    <h3>${escapeHtml(t.methodologyHeading)}</h3>
    <p class="methodology">${escapeHtml(t.methodologyBody)}</p>

    <h3>${escapeHtml(t.aboutHeading)}</h3>
    <p class="about">${escapeHtml(t.aboutBody)}</p>

    <div class="related">
      <strong>${escapeHtml(t.relatedHeading)}:</strong> ${related}
    </div>
  </main>
  <footer>
    <a href="${guideHref}">${escapeHtml(t.nav.guide)}</a>
    <a href="${lang === 'ja' ? '/ja/ranking' : '/ranking'}">${escapeHtml(t.nav.ranking)}</a>
    <a href="/privacy.html">${escapeHtml(t.nav.privacy)}</a>
    <a href="/terms.html">${escapeHtml(t.nav.terms)}</a>
    <span>&copy; 2026 Stream Filter</span>
  </footer>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
    },
  });
}
