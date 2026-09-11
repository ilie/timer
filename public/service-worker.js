const cacheName = 'exam-clock-v1';

const hashedAssetPath = '/assets/';

const pageFallback = '/';

const isOurs = (request) => request.method === 'GET' && new URL(request.url).origin === self.location.origin;

const keep = async (request, response) => {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
};

const fromCacheOrNetwork = async (request) => {
    const cached = await caches.match(request);
    if (cached !== undefined) {
        return cached;
    }
    const response = await fetch(request);
    if (response.ok) {
        await keep(request, response.clone());
    }
    return response;
};

const fromNetworkOrCache = async (request) => {
    try {
        const response = await fetch(request);
        if (response.ok) {
            await keep(request, response.clone());
        }
        return response;
    } catch (unreachable) {
        const cached = (await caches.match(request)) ?? (await caches.match(pageFallback));
        if (cached !== undefined) {
            return cached;
        }
        throw unreachable;
    }
};

const answer = (request) =>
    new URL(request.url).pathname.startsWith(hashedAssetPath)
        ? fromCacheOrNetwork(request)
        : fromNetworkOrCache(request);

const dropEarlierCaches = async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== cacheName).map((name) => caches.delete(name)));
};

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(dropEarlierCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
    if (!isOurs(event.request)) {
        return;
    }
    event.respondWith(answer(event.request));
});
