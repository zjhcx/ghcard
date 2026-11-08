import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContributions, normalizeContributions } from '../lib/contributions.ts';
import { heatmapMarkup } from '../lib/heatmap.ts';
const days = [ { date: '2024-02-28', count: 0, level: 0 }, { date: '2024-02-29', count: 5, level: 3 }, { date: '2024-03-01', count: 2, level: 1 } ];
test('sorts daily contributions, supports leap days and derives totals from displayed days', () => {
    const calendar = normalizeContributions([...days].reverse(), 'public');
    assert.equal(calendar.total, 7); assert.deepEqual(calendar.days, days);
});
test('rejects malformed, missing and duplicate dates rather than inventing zeroes', () => {
    for (const input of [[],null,[days[0],days[0]],[days[0],days[2]],[{date:'2024-02-30',count:1,level:1}],[{...days[0],count:-1}],[{...days[0],level:5}]]) assert.throws(()=>normalizeContributions(input,'public'));
});
test('rejects sparse days and totals outside the safe integer range', () => {
    assert.throws(() => normalizeContributions(new Array(1), 'public'), /贡献数据格式无效/);
    const sparse = [days[0], , days[2]];
    assert.throws(() => normalizeContributions(sparse, 'public'), /贡献数据格式无效/);
    assert.equal(normalizeContributions([{ ...days[0], count: Number.MAX_SAFE_INTEGER }], 'public').total, Number.MAX_SAFE_INTEGER);
    assert.throws(() => normalizeContributions([
        { ...days[0], count: Number.MAX_SAFE_INTEGER },
        { ...days[1], count: 1 },
    ], 'public'), /总数超出有效范围/);
});
test('rejects empty calendars and invalid rendering widths explicitly', () => {
    assert.throws(() => heatmapMarkup({ days: [], total: 0, source: 'public' }), RangeError);
    const calendar = normalizeContributions(days, 'public');
    for (const width of [NaN, Infinity, -Infinity, -1, 0, 28, 359]) {
        assert.throws(() => heatmapMarkup(calendar, width), RangeError);
    }
});
test('keeps a maximum-size calendar inside the SVG at the minimum supported width', () => {
    const start = Date.UTC(2023, 11, 30); // Saturday gives the largest leading offset.
    const calendar = normalizeContributions(Array.from({ length: 400 }, (_, index) => ({
        date: new Date(start + index * 86400000).toISOString().slice(0, 10), count: 0, level: 0,
    })), 'public');
    const svg = heatmapMarkup(calendar, 360);
    const cells = [...svg.matchAll(/data-date="[^"]+" data-l="\d" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
    assert.equal(cells.length, 400);
    for (const cell of cells) {
        assert.ok(Number(cell[3]) > 0 && Number(cell[4]) > 0);
        assert.ok(Number(cell[1]) + Number(cell[3]) <= 360);
    }
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
});
test('positions days by UTC weekday, adds month labels, tooltips and theme colors', () => {
    const svg = heatmapMarkup(normalizeContributions(days,'public'));
    assert.match(svg,/data-date="2024-02-28" data-l="0" x="28.00" y="55.00"/);
    assert.match(svg,/2024-02-29 · 5 次贡献/); assert.match(svg,/2月/); assert.match(svg,/7 次贡献/);
    assert.match(heatmapMarkup(normalizeContributions(days,'public'),608,'dark'),/#26a641/);
});
test('loads official GraphQL when token exists, otherwise uses public last-year API', async () => {
    const savedFetch = globalThis.fetch; const savedToken = process.env.GITHUB_TOKEN;
    try {
        process.env.GITHUB_TOKEN = 'test-token';
        globalThis.fetch = (async (url, options) => {
            assert.equal(String(url),'https://api.github.com/graphql');
            assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer test-token');
            assert.equal(new Headers(options?.headers).get('User-Agent'),'ghcard');
            assert.equal(JSON.parse(String(options?.body)).variables.login,'octocat');
            const contributionDays = days.map(d => ({
                date: d.date,
                contributionCount: d.count,
                contributionLevel: ['NONE','FIRST_QUARTILE','SECOND_QUARTILE','THIRD_QUARTILE','FOURTH_QUARTILE'][d.level],
            }));
            return Response.json({ data: { user: { contributionsCollection: {
                contributionCalendar: { weeks: [{ contributionDays }] },
            } } } });
        }) as typeof fetch;
        assert.equal((await loadContributions('octocat')).calendar?.source,'github');
        delete process.env.GITHUB_TOKEN;
        globalThis.fetch = (async (url,options) => {
            assert.equal(String(url),'https://github-contributions-api.jogruber.de/v4/octocat?y=last');
            assert.equal(new Headers(options?.headers).has('Authorization'),false);
            return Response.json({contributions:days});
        }) as typeof fetch;
        assert.equal((await loadContributions('octocat')).calendar?.total,7);
        globalThis.fetch = async () => { throw new Error('timeout'); };
        const result = await loadContributions('octocat'); assert.ok(result.error); assert.equal(result.calendar,undefined);
    } finally { globalThis.fetch = savedFetch; if (savedToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = savedToken; }
});
