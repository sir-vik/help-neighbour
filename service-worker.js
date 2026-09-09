const CACHE_NAME = "neighbourly-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./login.html",
  "./register.html",
  "./style.css",
  "./script.js",
  "./admin.html",
  "./admin.js",
  "./manifest.json",
  "./neighbourly-logo.png.jpeg",
  "./neighbourly-favicon.png.jpeg"
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
