const CACHE = "football-pwa-v10";
const FILES = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("fetch", e => {
  // Ne pas intercepter les appels API ESPN
  if (e.request.url.includes("espn.com")) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
