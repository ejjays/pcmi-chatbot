const CACHE_NAME = 'pcmi-chatbot-v1';
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'styles.css',
    'script.js',
    'manifest.json',
    'offline.html',
    
    // Android Splash Screen
    'images/splash-android.png',
    
    // Images - Core UI
    'images/pcmi-logo.png',
    'images/pcmi-logo-192.png',
    'images/pcmi-logo-512.png',
    
    // Avatar Images
    'images/avatars/pcmi-bot.png',
    'images/avatars/thinking.gif',
    'images/avatars/verified-badge.svg',
    
    // Service Images
    'images/services/church-location.png',
    'images/services/youth-fellowship.jpg',
    'images/services/cellgroup.jpg',
    'images/services/sunday-service.gif',
    'images/services/discipleship.jpg',
    'images/prayer-warrior.jpg',
    
    // Suggestion Icons
    'images/suggestions/clock.gif',
    'images/suggestions/location.gif',
    'images/suggestions/connect.gif',
    'images/suggestions/fellowship.gif',
    // External Resources
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0',
    
    // Firebase Scripts (though these might be handled differently due to being external)
    'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js'
];

// Install Service Worker - Force waiting until all assets are cached
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching all assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => console.warn('Cache put error:', err));

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('offline.html');
            }
            // Return default image for image requests
            if (event.request.destination === 'image') {
              return caches.match('images/pcmi-logo.png');
            }
            return new Response('Offline content not available');
          });
      })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache files individually and handle failures
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              // Continue with other files even if one fails
              return null;
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});