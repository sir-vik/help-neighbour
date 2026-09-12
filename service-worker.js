const CACHE_NAME = "neighbourly-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./login.html",
  "./register.html",
  "./style.css",
  "./script.js",
  "./admin.html",
  "./admin.js",
  "./manifest.json",
  "./neighbourly-icon-192.png",
  "./neighbourly-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
