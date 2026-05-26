import { renderRankingPage } from '../../_lib/ranking-render.js';

export async function onRequestGet({ env }) {
  return renderRankingPage(env, {
    period: 'all',
    country: 'global',
    sort: 'plays',
    lang: 'ja',
  });
}
