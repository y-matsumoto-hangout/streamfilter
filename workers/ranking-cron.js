const PERIODS = [
  { key: 'today', daysBack: 1 },
  { key: 'week', daysBack: 7 },
  { key: 'month', daysBack: 30 },
  { key: 'all', daysBack: 90 },
];

const COUNTRIES = ['global', 'JP', 'US', 'OTHER'];

const OEMBED_ENDPOINTS = {
  youtube: id => 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + id + '&format=json',
  vimeo: id => 'https://vimeo.com/api/oembed.json?url=https://vimeo.com/' + id,
  dailymotion: id => 'https://www.dailymotion.com/services/oembed?url=https://www.dailymotion.com/video/' + id + '&format=json',
};

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(aggregate(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/__run' && env.CRON_SECRET && url.searchParams.get('key') === env.CRON_SECRET) {
      try {
        await aggregate(env);
        return new Response('done', { status: 200 });
      } catch (e) {
        return new Response('error: ' + e.message, { status: 500 });
      }
    }
    return new Response('ok');
  },
};

async function aggregate(env) {
  const now = new Date();
  const isoNow = now.toISOString();

  for (const period of PERIODS) {
    const sinceIso = new Date(now.getTime() - period.daysBack * 86400000).toISOString();

    for (const country of COUNTRIES) {
      const rows = await queryAE(env, sinceIso, country);
      if (!rows.length) continue;

      const stmts = rows.map(r => env.DB.prepare(
        'INSERT INTO ranking_daily (video_id, service, period, country, play_count, total_secs, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(video_id, service, period, country) DO UPDATE SET ' +
        'play_count = excluded.play_count, total_secs = excluded.total_secs, updated_at = excluded.updated_at'
      ).bind(r.video_id, r.service, period.key, country, r.play_count, r.total_secs, isoNow));

      for (let i = 0; i < stmts.length; i += 100) {
        await env.DB.batch(stmts.slice(i, i + 100));
      }

      if (country === 'global' && period.key === 'all') {
        await fetchMissingMeta(env, rows);
      }
    }
  }
}

async function queryAE(env, sinceIso, country) {
  const sinceSql = sinceIso.slice(0, 19).replace('T', ' ');
  const countryFilter = country === 'global'
    ? "blob2 != 'twitch'"
    : country === 'OTHER'
      ? "blob2 != 'twitch' AND blob3 NOT IN ('JP', 'US')"
      : "blob2 != 'twitch' AND blob3 = '" + country + "'";

  const baseWhere = `${countryFilter} AND timestamp > toDateTime('${sinceSql}')`;

  const playSql = `
    SELECT blob1 AS video_id, blob2 AS service, SUM(double1) AS play_count
    FROM video_plays
    WHERE ${baseWhere} AND blob4 = 'play'
    GROUP BY blob1, blob2
    ORDER BY play_count DESC
    LIMIT 500
  `;

  const watchSql = `
    SELECT blob1 AS video_id, blob2 AS service, SUM(double1) AS total_secs
    FROM video_plays
    WHERE ${baseWhere} AND blob4 = 'watch'
    GROUP BY blob1, blob2
    LIMIT 500
  `;

  const [playRows, watchRows] = await Promise.all([
    runAESql(env, playSql),
    runAESql(env, watchSql),
  ]);

  const merged = new Map();
  for (const r of playRows) {
    const key = r.video_id + ':' + r.service;
    merged.set(key, {
      video_id: String(r.video_id || ''),
      service: String(r.service || ''),
      play_count: Math.round(Number(r.play_count) || 0),
      total_secs: 0,
    });
  }
  for (const r of watchRows) {
    const key = r.video_id + ':' + r.service;
    if (merged.has(key)) {
      merged.get(key).total_secs = Math.round(Number(r.total_secs) || 0);
    }
  }
  return [...merged.values()].filter(d => d.video_id && d.service && d.play_count > 0);
}

async function runAESql(env, sql) {
  const res = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/' + env.CF_ACCOUNT_ID + '/analytics_engine/sql',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.CF_AE_TOKEN,
        'Content-Type': 'text/plain',
      },
      body: sql,
    }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json && json.data) || [];
}

async function fetchMissingMeta(env, rows) {
  const unique = new Map();
  for (const r of rows) {
    const key = r.service + ':' + r.video_id;
    if (!unique.has(key)) unique.set(key, r);
  }

  const existingKeys = new Set();
  const existing = await env.DB.prepare(
    "SELECT service || ':' || video_id AS k FROM video_meta"
  ).all();
  for (const row of (existing.results || [])) existingKeys.add(row.k);

  let fetchedCount = 0;
  const MAX_PER_RUN = 50;

  for (const [key, r] of unique.entries()) {
    if (fetchedCount >= MAX_PER_RUN) break;
    if (existingKeys.has(key)) continue;

    const endpoint = OEMBED_ENDPOINTS[r.service];
    if (!endpoint) continue;

    try {
      const res = await fetch(endpoint(r.video_id), { cf: { cacheTtl: 86400 } });
      if (!res.ok) continue;
      const data = await res.json();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO video_meta (video_id, service, title, thumbnail, author, fetched_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        r.video_id,
        r.service,
        String(data.title || '').slice(0, 500),
        String(data.thumbnail_url || '').slice(0, 1000),
        String(data.author_name || '').slice(0, 200),
        new Date().toISOString()
      ).run();
      fetchedCount++;
    } catch {
      // skip and retry next run
    }
  }
}
