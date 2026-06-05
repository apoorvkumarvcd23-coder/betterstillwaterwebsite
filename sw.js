/* Stilwater PWA service worker.
 *
 * Strategy is intentionally conservative so it can never serve stale content
 * to an online user (the site is updated frequently):
 *   - Non-GET, cross-origin, and /api/ requests  -> always go to the network
 *     (never cached, never intercepted in a way that could break auth/API).
 *   - Same-origin GET (HTML, CSS, JS, images, fonts) -> NETWORK FIRST. On a
 *     successful response we refresh the cache copy; only if the network fails
 *     (offline) do we fall back to the cache, and navigations fall back to the
 *     offline page.
 * Bump CACHE_VERSION to force old caches to be cleared on the next visit.
 */
const CACHE_VERSION = "v1";
const CACHE_NAME = "stilwater-" + CACHE_VERSION;
const OFFLINE_URL = "/offline.html";

// Minimal app shell precached so the app still opens while offline.
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/css/index.css",
  "/images/stilwater-logov3.png",
  "/images/icons/icon-192.png",
  "/images/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll fails the whole install if one URL 404s — add individually so a
      // single missing asset can't block the SW from installing.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn("[sw] precache skip", url, err))
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never touch POST/PUT/etc.

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass
  if (url.pathname.startsWith("/api/")) return; // never cache API calls
  if (url.pathname.startsWith("/auth/")) return; // never cache auth flows

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(req);
        // Cache a copy of successful, basic (same-origin) responses.
        if (fresh && fresh.status === 200 && fresh.type === "basic") {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (_err) {
        const cached = await cache.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const offline = await cache.match(OFFLINE_URL);
          if (offline) return offline;
        }
        throw _err;
      }
    })()
  );
});
