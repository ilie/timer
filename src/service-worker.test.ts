import { beforeEach, describe, expect, it, vi } from 'vitest';

const origin = 'https://clock.vlec.es';

type Listener = (event: unknown) => void;

type FakeResponse = { ok: boolean; body: string; clone: () => FakeResponse };

const listeners = new Map<string, Listener>();

const requestFor = (path: string, method = 'GET') => ({ method, url: `${origin}${path}` });

const otherOriginRequest = () => ({ method: 'GET', url: 'https://example.com/a.js' });

const responseFor = (body: string, ok = true): FakeResponse => {
    const response: FakeResponse = { ok, body, clone: () => response };
    return response;
};

const keyOf = (request: string | { url: string }) =>
    typeof request === 'string' ? `${origin}${request}` : request.url;

const caches = {
    stores: new Map<string, Map<string, FakeResponse>>(),
    open(name: string) {
        const store = caches.stores.get(name) ?? new Map<string, FakeResponse>();
        caches.stores.set(name, store);
        return Promise.resolve({
            put: (request: string | { url: string }, response: FakeResponse) => {
                store.set(keyOf(request), response);
                return Promise.resolve();
            },
        });
    },
    match(request: string | { url: string }) {
        for (const store of caches.stores.values()) {
            const found = store.get(keyOf(request));
            if (found !== undefined) {
                return Promise.resolve(found);
            }
        }
        return Promise.resolve(undefined);
    },
    keys: () => Promise.resolve([...caches.stores.keys()]),
    delete: (name: string) => Promise.resolve(caches.stores.delete(name)),
};

const fetchResult = { response: responseFor('from the network'), fails: false };

const fetchSpy = vi.fn(() =>
    fetchResult.fails ? Promise.reject(new Error('offline')) : Promise.resolve(fetchResult.response),
);

const claim = vi.fn(() => Promise.resolve());

const answerTo = async (request: { method: string; url: string }): Promise<FakeResponse | undefined> => {
    let answered: Promise<FakeResponse> | undefined;
    listeners.get('fetch')?.({ request, respondWith: (given: Promise<FakeResponse>) => (answered = given) });
    return answered === undefined ? undefined : await answered;
};

const runLifecycle = async (name: string): Promise<void> => {
    const waited: Promise<unknown>[] = [];
    listeners.get(name)?.({ waitUntil: (given: Promise<unknown>) => waited.push(given) });
    await Promise.all(waited);
};

beforeEach(async () => {
    listeners.clear();
    caches.stores.clear();
    fetchSpy.mockClear();
    claim.mockClear();
    fetchResult.response = responseFor('from the network');
    fetchResult.fails = false;
    vi.stubGlobal('self', {
        location: { origin },
        addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
        skipWaiting: () => Promise.resolve(),
        clients: { claim },
    });
    vi.stubGlobal('caches', caches);
    vi.stubGlobal('fetch', fetchSpy);
    vi.resetModules();
    await import('../public/service-worker.js');
});

describe('the board after the network drops', () => {
    it('keeps a copy of the page as it serves it', async () => {
        await answerTo(requestFor('/'));

        expect((await caches.match('/'))?.body).toBe('from the network');
    });

    it('serves the copy when the page cannot be reached', async () => {
        await answerTo(requestFor('/'));
        fetchResult.fails = true;

        const answer = await answerTo(requestFor('/'));

        expect(answer?.body).toBe('from the network');
    });

    it('falls back to the board itself for a page it has never seen', async () => {
        await answerTo(requestFor('/'));
        fetchResult.fails = true;

        const answer = await answerTo(requestFor('/index.html'));

        expect(answer?.body).toBe('from the network');
    });

    it('refuses to invent an answer it has no copy of', async () => {
        fetchResult.fails = true;

        await expect(answerTo(requestFor('/'))).rejects.toThrow('offline');
    });
});

describe('serving what the build has already hashed', () => {
    it('takes a hashed asset from its copy without asking the network again', async () => {
        await answerTo(requestFor('/assets/index-abc123.js'));
        fetchSpy.mockClear();

        const answer = await answerTo(requestFor('/assets/index-abc123.js'));

        expect(answer?.body).toBe('from the network');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('asks the network every time for the page, so a new build is never masked', async () => {
        await answerTo(requestFor('/'));
        fetchResult.response = responseFor('a newer build');

        const answer = await answerTo(requestFor('/'));

        expect(answer?.body).toBe('a newer build');
    });
});

describe('taking over', () => {
    it('drops the caches an earlier version left behind', async () => {
        caches.stores.set('exam-clock-v0', new Map());
        await answerTo(requestFor('/'));

        await runLifecycle('activate');

        expect([...caches.stores.keys()]).toEqual(['exam-clock-v1']);
        expect(claim).toHaveBeenCalled();
    });

    it('leaves another origin to answer for itself', async () => {
        expect(await answerTo(otherOriginRequest())).toBeUndefined();
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('leaves anything that is not a plain read alone', async () => {
        expect(await answerTo(requestFor('/', 'POST'))).toBeUndefined();
    });
});
