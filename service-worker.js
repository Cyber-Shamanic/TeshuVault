const CACHE_NAME = "teshuvault-v0.0.1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/styles.css",
  "./assets/js/content.js",
  "./assets/js/markdown.js",
  "./assets/js/app.js",
  "./assets/images/favicon.svg",
  "./assets/images/icon-512.png",
  "./assets/images/teshuvah-hero.webp",
  "./assets/images/tree-of-return.webp",
  "./assets/images/study-gateway.webp",
  "./CHANGELOG.md",
  "./TODO.md",
  "./SOURCES.md",
  "./docs/complete-path.md",
  "./docs/interpretations.md",
  "./docs/kabbalistic-map.md",
  "./docs/forty-day-practice.md"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match("./index.html")))
  );
});
