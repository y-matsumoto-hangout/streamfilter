const VALID_PERIOD = new Set(['today', 'week', 'month', 'all']);
const VALID_COUNTRY = new Set(['global', 'JP', 'US', 'OTHER']);
const VALID_SORT = { plays: 'play_count', watchtime: 'total_secs', duration: 'total_secs' };

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);

  const period = VALID_PERIOD.has(url.searchParams.get('period')) ? url.searchParams.get('period') : 'all';
  const country = VALID_COUNTRY.has(url.searchParams.get('country')) ? url.searchParams.get('country') : 'global';
  const sortKey = url.searchParams.get('sort') || 'plays';
  const sortCol = VALID_SORT[sortKey] || 'play_count';
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50));

  if (!env.DB) {
    return json({ ok: true, data: [] });
  }

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
  return json({ ok: true, data: result.results || [] });
}

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
    },
  });
}
