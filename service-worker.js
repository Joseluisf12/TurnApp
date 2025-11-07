self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("turnapp-cache").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./app.css",
        "./logo.svg",
        "./manual.html"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
// --- Forzar actualización inmediata ---
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => clients.claim());
