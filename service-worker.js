const CACHE_NAME = 'pcmi-chatbot-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    '/offline.html',
    
    // Android Splash Screen
    '/images/splash-android.png',
    
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
  // Check if request is for an image
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => caches.match('/images/pcmi-logo.png'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request)
          .then(response => {
            return response || caches.match('offline.html');
          });
      })
  );
});