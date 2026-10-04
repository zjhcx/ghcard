import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGitHubLink, parseCardRoute, cardPath } from '../lib/routes.ts';
test('identifies supported GitHub URL types', () => {
    const cases: [
        string,
        string,
        string[]
    ][] = [
        ['https://github.com/octocat', 'account', ['octocat']],
        ['https://github.com/orgs/vercel', 'org', ['vercel']],
        ['https://github.com/vercel/next.js.git/', 'repo', ['vercel', 'next.js']],
        ['https://github.com/vercel/next.js/pull/123/files?x=1#diff', 'pr', ['vercel', 'next.js', '123']],
        ['https://github.com/vercel/next.js/issues/42', 'issue', ['vercel', 'next.js', '42']],
        ['https://github.com/vercel/next.js/commit/abcdef123', 'commit', ['vercel', 'next.js', 'abcdef123']],
        ['https://github.com/vercel/next.js/releases/tag/v1%2Bbeta', 'release', ['vercel', 'next.js', 'v1+beta']],
        ['https://github.com/vercel/next.js/releases/tag/release/v1', 'release', ['vercel', 'next.js', 'release', 'v1']],
        ['https://github.com/vercel/next.js/releases/latest', 'release', ['vercel', 'next.js', 'latest']],
    ];
    for (const [url, type, id] of cases)
        assert.deepEqual(parseGitHubLink(url), { type, id });
});
test('rejects unrelated hosts, invalid IDs and unsupported GitHub pages', () => {
    for (const input of ['octocat', 'http://github.com/octocat', 'https://github.com.evil.com/a', 'https://user:secret@github.com/a', 'https://github.com/search', 'https://github.com/a/b/tree/main', 'https://github.com/a/b/pull/0', 'https://github.com/a/b/commit/nope', 'https://github.com/a/%2F', 'https://github.com/a/%ZZ'])
        assert.throws(() => parseGitHubLink(input));
});
test('card paths preserve repo context and encode release tags', () => {
    assert.equal(cardPath('l', { type: 'release', id: ['owner', 'repo', 'v1+beta'] }), '/l/release/owner/repo/v1%2Bbeta');
    assert.deepEqual(parseCardRoute(['l', 'release', 'owner', 'repo', 'v1+beta']).target, { type: 'release', id: ['owner', 'repo', 'v1+beta'] });
});
test('auto routes support usernames and complete repository identifiers', () => {
    assert.deepEqual(parseCardRoute(['a', 'octocat']), { size: 'm', target: { type: 'account', id: ['octocat'] }, auto: true });
    assert.equal(parseCardRoute(['a', 'owner', 'repo', 'issues', '12']).target.type, 'issue');
    assert.equal(parseCardRoute(['a', 'https://github.com/vercel/next.js']).target.type, 'repo');
});
test('rejects malformed direct routes', () => {
    for (const route of [['x', 'user', 'octocat'], ['m', 'user'], ['m', 'repo', 'owner'], ['m', 'commit', 'a', 'b', 'nope'], ['m', 'pr', 'a', 'b', '-1'], ['m', 'org', '..'], ['a']])
        assert.throws(() => parseCardRoute(route));
});
