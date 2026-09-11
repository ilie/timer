import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../config/storage';

describe('store bootstrap', () => {
    it('hydrates from storage as soon as the module loads', async () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                centreNumber: 'ZZ999',
                sessions: [],
                break: { timer: { status: 'idle' }, minutes: 15 },
            }),
        );
        const { getSnapshot } = await import('./boardStore');
        expect(getSnapshot().centreNumber).toBe('ZZ999');
    });
});
