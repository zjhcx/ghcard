import { cardPath, parseCardRoute } from '@/lib/routes';
import { loadCard, GitHubError } from '@/lib/github';
import { loadSvgAvatar, renderCardSvg, renderErrorSvg } from '@/lib/svg-card';
const contentType = 'image/svg+xml; charset=utf-8';
export async function GET(request: Request, { params }: { params: Promise<{ segments: string[] }> }) {
    let parsed: ReturnType<typeof parseCardRoute>;
    try { parsed = parseCardRoute((await params).segments); }
    catch { return new Response(renderErrorSvg('无效的卡片路由，请检查类型、尺寸和标识。'), { status: 400, headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
    try {
        const url = new URL(request.url);
        const heatmap = url.searchParams.get('heatmap') === '1';
        const data = await loadCard(parsed.target, parsed.size === 'l', heatmap);
        if (parsed.auto || parsed.target.type !== data.type) {
            const destination = new URL(cardPath(parsed.size, { type: data.type, id: data.id }),url);
            if (url.searchParams.get('theme') === 'dark') destination.searchParams.set('theme','dark');
            if (heatmap) destination.searchParams.set('heatmap','1');
            return Response.redirect(destination,307);
        }
        const avatar = await loadSvgAvatar(data);
        const svg = renderCardSvg(data,parsed.size,url.searchParams.get('theme') === 'dark' ? 'dark' : 'light',avatar);
        return new Response(svg, { headers: {
            'Content-Type': contentType, 'Content-Disposition': 'inline; filename="github-card.svg"',
            'Cache-Control': 'public, max-age=300, s-maxage=300', 'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
        } });
    } catch (error) {
        return new Response(renderErrorSvg(error instanceof Error ? error.message : '卡片暂时不可用。'), {
            status: error instanceof GitHubError ? error.status : 502,
            headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        });
    }
}
