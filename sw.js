/* Smart Division - Service Worker (کارکردنی ئۆفلاین)
   هەر کاتێک فایلەکانت گۆڕی (بەتایبەت html2canvas، فۆنت، player.png)
   ژمارەی CACHE_VERSION بگۆڕە بۆ نموونە v2 */
const CACHE_VERSION = 'v1';
const CACHE = 'smart-division-' + CACHE_VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './html2canvas.min.js',
  './vazirmatn.woff2',
  './player.png'
];

// دامەزراندن: هەموو فایلەکان هەڵدەگرێت (ئەگەر یەکێکیان نەبوو، ئەوانی تر هەر هەڵدەگیرێن)
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async url => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && res.ok) await cache.put(url, res);
      } catch (e) { /* فایلەکە نەبوو یان ئینتەرنێت نییە */ }
    }));
    await self.skipWaiting();
  })());
});

// چالاککردن: کاشی کۆن دەسڕێتەوە
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('smart-division-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // لاپەڕەی سەرەکی: یەکەم جار ئینتەرنێت (نوێترین کۆد)، ئەگەر نەبوو لە کاشەوە
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match(req, { ignoreSearch: true })) ||
               (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               Response.error();
      }
    })());
    return;
  }

  // فایلەکانی تر: یەکەم جار لە کاشەوە، لە پشتەوە نوێدەکرێتەوە
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const refresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) return hit;
    return (await refresh) || Response.error();
  })());
});
