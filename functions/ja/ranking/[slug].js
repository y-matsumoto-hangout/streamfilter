import { renderRankingPage, SLUG_CONFIG } from '../../_lib/ranking-render.js';

export async function onRequestGet({ env, params }) {
  const slug = String(params.slug || '').toLowerCase();
  const cfg = SLUG_CONFIG[slug];
  if (!cfg) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  return renderRankingPage(env, { ...cfg, lang: 'ja' });
}
