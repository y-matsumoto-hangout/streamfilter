const ALLOWED_SERVICES = new Set(['youtube', 'vimeo', 'dailymotion', 'twitch']);

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  if (!env.AE) return new Response('ok');

  let body;
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    return new Response('ok');
  }
  if (!body) return new Response('ok');

  const type = body.type === 'watch' ? 'watch' : 'play';
  const service = String(body.service || '').toLowerCase();
  const videoId = String(body.videoId || '').slice(0, 64);
  const source = body.source === 'ranking' ? 'ranking' : 'direct';

  if (!videoId || !ALLOWED_SERVICES.has(service)) return new Response('ok');

  const country = (request.cf && request.cf.country) || 'XX';

  if (type === 'watch') {
    const secs = Math.max(0, Math.min(Number(body.secs) || 0, 86400));
    if (secs < 3) return new Response('ok');
    env.AE.writeDataPoint({
      indexes: [videoId],
      blobs: [videoId, service, country, 'watch', source],
      doubles: [secs],
    });
  } else {
    env.AE.writeDataPoint({
      indexes: [videoId],
      blobs: [videoId, service, country, 'play', source],
      doubles: [1],
    });
  }

  return new Response('ok');
}

export function onRequestOptions() {
  return new Response(null, { status: 204 });
}
