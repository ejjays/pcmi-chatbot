const CACHE_NAME = 'pcmi-chatbot-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    '/offline.html',
    
    // Images - Core UI
    '/images/pcmi-logo.png',
    '/images/pcmi-logo-192.png',
    '/images/pcmi-logo-512.png',
    
    // Avatar Images
    '/images/avatars/pcmi-bot.png',
    '/images/avatars/thinking.gif',
    '/images/avatars/verified-badge.svg',
    
    // Service Images
    '/images/services/church-location.png',
    '/images/services/youth-fellowship.jpg',
    '/images/services/cellgroup.jpg',
    '/images/services/sunday-service.gif',
    '/images/services/discipleship.jpg',
    '/images/services/prayer-warrior.jpg',
    
    // Suggestion Icons
    '/images/suggestions/clock.gif',
    '/images/suggestions/location.gif',
    '/images/suggestions/connect.gif',
    '/images/suggestions/fellowship.gif',
    
    // External Resources
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0',
    
    // Firebase Scripts (though these might be handled differently due to being external)
    'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch new
        return response || fetch(event.request)
          .then((response) => {
            // Cache new responses for static assets
            if (event.request.url.startsWith('http') && event.request.method === 'GET') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          });
      })
      .catch(() => {
        // Offline fallback
        return caches.match('/offline.html');
      })
  );
});