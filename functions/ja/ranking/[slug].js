import { renderRankingPage, SLUG_CONFIG } from '../../_lib/ranking-render.js';

export async function onRequestGet({ env, params, request }) {
  let slug = String(params.slug || '').toLowerCase();

  // Strip legacy .html suffix and 301 to the clean URL (already-indexed pages, external links)
  if (slug.endsWith('.html')) {
    const url = new URL(request.url);
    return Response.redirect(url.origin + url.pathname.replace(/\.html$/, ''), 301);
  }

  const cfg = SLUG_CONFIG[slug];
  if (!cfg) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  return renderRankingPage(env, { ...cfg, lang: 'ja' });
}
