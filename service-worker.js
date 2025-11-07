self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("turnapp-cache").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./app.css",
        "./app.js",
        "./logo.svg",
        "./manual.html"
      ]);
    })
  );

  // Activar la versión nueva al instante
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Tomar control inmediato de todas las pestañas abiertas
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
