const CACHE = 'pkk-v1';
const RSS_TTL  = 5 * 60 * 1000;   // RSS: 5分
const PAGE_TTL = 30 * 60 * 1000;  // 記事ページ: 30分

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // プロキシ経由のリクエストだけキャッシュ対象
  if (!url.includes('corsproxy.io') && !url.includes('allorigins.win') && !url.includes('codetabs.com')) return;

  e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);

  if (cached) {
    const age = Date.now() - parseInt(cached.headers.get('x-cached-at') || '0');
    const isRss = req.url.includes('/feed/');
    const ttl = isRss ? RSS_TTL : PAGE_TTL;
    if (age < ttl) return cached; // 新鮮なキャッシュを返す
  }

  try {
    const res = await fetch(req);
    if (res.ok) {
      // x-cached-at ヘッダーを付けて保存
      const headers = new Headers(res.headers);
      headers.set('x-cached-at', String(Date.now()));
      const body = await res.arrayBuffer();
      const newRes = new Response(body, { status: res.status, headers });
      cache.put(req, newRes.clone());
      return newRes;
    }
    return res;
  } catch(e) {
    if (cached) return cached; // ネットワークエラー時は古いキャッシュで返す
    throw e;
  }
}
