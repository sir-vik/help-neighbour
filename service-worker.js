const CACHE_NAME = "neighbourly-v7";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./neighbourly-icon-192.png",
  "./neighbourly-icon-512.png"
];


// INSTALL
self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();

});


// ACTIVATE
self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))

      );

    }).then(() => {

      return self.clients.claim();

    })

  );

});


// FETCH
self.addEventListener("fetch", event => {

  const request = event.request;

  // Only handle normal HTTP/HTTPS requests.
  if (
    request.method !== "GET" ||
    (request.url.startsWith("http://") === false &&
     request.url.startsWith("https://") === false)
  ) {
    return;
  }

  event.respondWith(

    fetch(request)
      .then(response => {

        if (
          response &&
          response.status === 200
        ) {

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {

            cache.put(request, responseClone);

          });

        }

        return response;

      })

      .catch(() => {

        return caches.match(request);

      })

  );

});
