import { test } from 'node:test';
import assert from 'node:assert/strict';
import { github, GitHubError } from '../lib/github.ts';

test('GHPROXY prefixes REST API URLs without forwarding GitHub credentials', async () => {
    const savedProxy = process.env.GHPROXY;
    const savedToken = process.env.GITHUB_TOKEN;
    const savedFetch = globalThis.fetch;
    try {
        process.env.GITHUB_TOKEN = 'private-token';
        for (const proxy of ['https://proxy.example', ' https://proxy.example/prefix/ ']) {
            process.env.GHPROXY = proxy;
            globalThis.fetch = async (url, options) => {
                assert.equal(String(url), `${proxy.trim().replace(/\/+$/, '')}/https://api.github.com/repos/a/b/releases/tags/v%2F1?per_page=6`);
                const headers = new Headers(options?.headers);
                assert.equal(headers.get('Authorization'), null);
                assert.equal(headers.get('User-Agent'), 'ghcard');
                return Response.json({ name: 'v/1' });
            };
            assert.deepEqual(await github('/repos/a/b/releases/tags/v%2F1?per_page=6'), { name: 'v/1' });
        }
        delete process.env.GITHUB_TOKEN;
        await github('/repos/a/b/releases/tags/v%2F1?per_page=6');
        process.env.GHPROXY = '  ';
        globalThis.fetch = async (url, options) => {
            assert.equal(String(url), 'https://api.github.com/users/octocat');
            assert.equal(new Headers(options?.headers).get('Authorization'), null);
            return Response.json({ login: 'octocat' });
        };
        await github('/users/octocat');
        for (const proxy of ['invalid', 'http://proxy.example', 'https://user:pass@proxy.example', 'https://proxy.example?key=x', 'https://proxy.example/#fragment']) {
            process.env.GHPROXY = proxy;
            globalThis.fetch = async () => { assert.fail('invalid proxy must not fetch'); };
            await assert.rejects(github('/users/octocat'), (e: unknown) => e instanceof GitHubError && e.status === 500 && /GHPROXY/.test(e.message));
        }
    } finally {
        globalThis.fetch = savedFetch;
        if (savedProxy === undefined) delete process.env.GHPROXY; else process.env.GHPROXY = savedProxy;
        if (savedToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = savedToken;
    }
});
