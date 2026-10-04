import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCard, github, GitHubError } from '../lib/github.ts';
const originalFetch = globalThis.fetch;
function mock(data: unknown, status = 200) {
    const paths: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => { paths.push(String(url)); return new Response(JSON.stringify(data), { status }); }) as typeof fetch;
    return paths;
}
test('detects an organization from GitHub instead of guessing its name', async () => {
    try {
        const paths = mock({ type: 'Organization', login: 'vercel' });
        assert.equal((await loadCard({ type: 'account', id: ['vercel'] })).type, 'org');
        assert.deepEqual(paths, ['https://api.github.com/users/vercel']);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
test('handles release tags containing slashes as one API parameter', async () => {
    try {
        const paths = mock({ tag_name: 'release/v1' });
        await loadCard({ type: 'release', id: ['owner', 'repo', 'release', 'v1'] });
        assert.equal(paths[0], 'https://api.github.com/repos/owner/repo/releases/tags/release%2Fv1');
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
test('corrects an issue URL that GitHub identifies as a pull request', async () => {
    try {
        const paths = mock({ pull_request: { url: 'https://api.github.com/repos/a/b/pulls/12' } });
        assert.equal((await loadCard({ type: 'issue', id: ['a', 'b', '12'] })).type, 'pr');
        assert.deepEqual(paths, ['https://api.github.com/repos/a/b/issues/12', 'https://api.github.com/repos/a/b/pulls/12']);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
test('reports missing resources and rate limiting clearly', async () => {
    try {
        mock({}, 404);
        await assert.rejects(github('/users/missing'), (e: unknown) => e instanceof GitHubError && e.status === 404);
        mock({}, 403);
        await assert.rejects(github('/users/octocat'), (e: unknown) => e instanceof GitHubError && e.status === 429);
        globalThis.fetch = async () => { throw new Error('network failure'); };
        await assert.rejects(github('/users/octocat'), (e: unknown) => e instanceof GitHubError && e.status === 502);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});

test('large user cards do not request contributions by default', async () => {
    const paths: string[] = [];
    try {
        globalThis.fetch = (async (url) => {
            paths.push(String(url));
            return Response.json(String(url).includes('/repos?') ? [] : {type:'User',login:'octocat'});
        }) as typeof fetch;
        const card = await loadCard({type:'user',id:['octocat']},true);
        assert.equal(card.contributionsEnabled,false);
        assert.equal(card.contributions,undefined);
        assert.equal(paths.length,2);
        assert.ok(paths.every(path=>path.startsWith('https://api.github.com/users/')));
    } finally { globalThis.fetch = originalFetch; }
});
