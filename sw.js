const CACHE_NAME = 'pushup-tracker-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install - cache files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - serve from cache, fall back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes('/') && 'focus' in client) {
                        client.focus();
                        client.postMessage({ action: 'showActionPanel' });
                        return;
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow('/?action=pushup');
                }
            })
    );
});

// Push notification handler (for future server-push support)
self.addEventListener('push', event => {
    const options = {
        body: 'Do your push-ups now!',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'pushup-reminder',
        requireInteraction: true,
        actions: [
            { action: 'done', title: '✅ Done' },
            { action: 'skip', title: '❌ Skip' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Time for push-ups, Bitch! 💪', options)
    );
});

// Handle notification action buttons
self.addEventListener('notificationclick', event => {
    const action = event.action;
    event.notification.close();

    if (action === 'done' || action === 'skip') {
        // Send message to client
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(clientList => {
                    clientList.forEach(client => {
                        client.postMessage({ 
                            action: action === 'done' ? 'logDone' : 'logSkip' 
                        });
                    });
                })
        );
    } else {
        // Default click - open app
        event.waitUntil(
            clients.openWindow('/?action=pushup')
        );
    }
});
