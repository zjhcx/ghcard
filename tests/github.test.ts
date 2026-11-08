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
        mock({ message: 'API rate limit exceeded' }, 403);
        await assert.rejects(github('/users/octocat'), (e: unknown) => e instanceof GitHubError && e.status === 429);
        globalThis.fetch = async () => { throw new Error('network failure'); };
        await assert.rejects(github('/users/octocat'), (e: unknown) => e instanceof GitHubError && e.status === 502);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});

test('sends an explicit User-Agent on Workers, with optional server authentication', async () => {
    const savedToken = process.env.GITHUB_TOKEN;
    try {
        for (const token of [undefined, '  ', ' test-token ']) {
            if (token === undefined) delete process.env.GITHUB_TOKEN;
            else process.env.GITHUB_TOKEN = token;
            globalThis.fetch = async (_url, options) => {
                const headers = new Headers(options?.headers);
                assert.equal(headers.get('User-Agent'), 'ghcard');
                assert.equal(headers.get('Accept'), 'application/vnd.github+json');
                assert.equal(headers.get('X-GitHub-Api-Version'), '2022-11-28');
                assert.equal(headers.get('Authorization'), token?.trim() ? 'Bearer test-token' : null);
                return Response.json({ login: 'octocat' });
            };
            await github('/users/octocat');
        }
    } finally {
        globalThis.fetch = originalFetch;
        if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
        else process.env.GITHUB_TOKEN = savedToken;
    }
});

test('distinguishes forbidden responses from primary and secondary rate limits', async () => {
    try {
        const cases = [
            { status: 403, headers: {}, message: 'User agent required', expected: 403 },
            { status: 403, headers: {}, message: 'Resource not accessible by personal access token', expected: 403 },
            { status: 403, headers: { 'x-ratelimit-remaining': '0' }, message: '', expected: 429 },
            { status: 403, headers: { 'retry-after': '60' }, message: '', expected: 429 },
            { status: 403, headers: {}, message: 'You have exceeded a secondary rate limit.', expected: 429 },
            { status: 429, headers: {}, message: '', expected: 429 },
        ];
        for (const entry of cases) {
            globalThis.fetch = async () => Response.json({ message: entry.message }, { status: entry.status, headers: entry.headers as HeadersInit });
            await assert.rejects(github('/users/octocat'), (e: unknown) => e instanceof GitHubError && e.status === entry.expected);
        }
        globalThis.fetch = async () => new Response('Forbidden', { status: 403 });
        await assert.rejects(github('/users/octocat'), (e: unknown) => e instanceof GitHubError && e.status === 403);
    } finally { globalThis.fetch = originalFetch; }
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
