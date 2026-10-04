import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderCardSvg, renderErrorSvg } from '../lib/svg-card.ts';
import { normalizeContributions } from '../lib/contributions.ts';
import { Card } from '../components/card.tsx';
import type { Account, CardData } from '../lib/github.ts';
import { GET } from '../app/[...segments]/route.ts';
const calendar = normalizeContributions([{date:'2024-02-29',count:5,level:3}],'public');
const user: CardData = {type:'user',id:['octocat'],account:{login:'octocat',name:'Test <script> & "user"',bio:'A developer',public_repos:10,followers:20,following:30} as Account,contributions:{calendar},contributionsEnabled:true};
test('renders standalone native SVG with heatmap only on large user cards', () => {
    const large = renderCardSvg(user,'l');
    assert.match(large,/width="640"/); assert.match(large,/data-date="2024-02-29"/); assert.match(large,/&lt;script&gt; &amp; &quot;user&quot;/);
    assert.doesNotMatch(large,/<script|foreignObject|<html/);
    assert.doesNotMatch(renderCardSvg({...user, contributionsEnabled: undefined},'l'),/data-date|Contributions in the last year/);
    assert.doesNotMatch(renderToStaticMarkup(createElement(Card,{data:{...user, contributionsEnabled:undefined},size:'l'})),/贡献热力图|data-date/);
    for (const size of ['s','m'] as const) assert.doesNotMatch(renderCardSvg(user,size),/data-date/);
    assert.doesNotMatch(renderCardSvg({...user,type:'org'},'l'),/data-date/);
    assert.match(renderCardSvg(user,'l','dark'),/#26a641/);
});
test('renders the same heatmap in large HTML cards and preserves unavailable-data message', () => {
    assert.match(renderToStaticMarkup(createElement(Card,{data:user,size:'l'})),/data-date="2024-02-29"/);
    const unavailable = {...user,contributions:{error:'贡献数据暂时不可用'}};
    assert.match(renderToStaticMarkup(createElement(Card,{data:unavailable,size:'l'})),/贡献数据暂时不可用/);
    assert.doesNotMatch(renderCardSvg(unavailable,'l'),/data-date/);
});
test('default route returns SVG content type, auto redirect and SVG errors', async () => {
    const saved = globalThis.fetch;
    try {
        globalThis.fetch = async () => Response.json(user.account);
        const response = await GET(new Request('http://localhost/m/user/octocat'),{params:Promise.resolve({segments:['m','user','octocat']})});
        assert.equal(response.status,200); assert.match(response.headers.get('content-type')!,/^image\/svg\+xml/); assert.match(await response.text(),/<svg/);
        const auto = await GET(new Request('http://localhost/a/octocat?theme=dark&heatmap=1'),{params:Promise.resolve({segments:['a','octocat']})});
        assert.equal(auto.status,307); assert.equal(auto.headers.get('location'),'http://localhost/m/user/octocat?theme=dark&heatmap=1');
        const invalid = await GET(new Request('http://localhost/x/user'),{params:Promise.resolve({segments:['x','user']})});
        assert.equal(invalid.status,400); assert.match(await invalid.text(),/<svg/);
        globalThis.fetch = async () => new Response('{}',{status:404});
        const missing = await GET(new Request('http://localhost/m/user/missing'),{params:Promise.resolve({segments:['m','user','missing']})});
        assert.equal(missing.status,404); assert.match(missing.headers.get('content-type')!,/image\/svg/);
    } finally { globalThis.fetch = saved; }
    assert.doesNotMatch(renderErrorSvg('<script>alert(1)</script>'),/<script>/);
});
