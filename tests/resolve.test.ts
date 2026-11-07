import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/resolve/route.ts';

test('resolver enables heatmap only for large user cards', async () => {
    const savedFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => Response.json({ type: 'User' });
        for (const [url, size, expected] of [
            ['https://github.com/octocat', 'l', '/l/user/octocat?heatmap=1'],
            ['https://github.com/octocat', 'm', '/m/user/octocat'],
            ['https://github.com/octocat', 's', '/s/user/octocat'],
            ['https://github.com/vercel/next.js', 'l', '/l/repo/vercel/next.js'],
        ]) {
            const params = new URLSearchParams({ url, size, heatmap: '1' });
            const response = await GET(new Request(`http://localhost/api/resolve?${params}`));
            assert.equal(response.status, 200);
            assert.equal((await response.json() as { path: string }).path, expected);
        }
        globalThis.fetch = async () => Response.json({ type: 'Organization' });
        const org = await GET(new Request('http://localhost/api/resolve?url=https://github.com/vercel&size=l&heatmap=1'));
        assert.equal((await org.json() as { path: string }).path, '/l/org/vercel');
        globalThis.fetch = async () => Response.json({ type: 'User' });
        for (const suffix of ['', '&heatmap=0', '&heatmap=true']) {
            const response = await GET(new Request(`http://localhost/api/resolve?url=https://github.com/octocat&size=l${suffix}`));
            assert.equal((await response.json() as { path: string }).path, '/l/user/octocat');
        }
    } finally {
        globalThis.fetch = savedFetch;
    }
});
