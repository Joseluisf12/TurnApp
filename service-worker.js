self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("turnapp-cache").then(cache => {
      // CORRECCIÓN: Eliminamos de la lista los archivos que no existen
      // para evitar el error 404 y permitir que la app se cargue.
      return cache.addAll([
        "./",
        "./index.html",
        "./app.css",
        "./app.js"
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
