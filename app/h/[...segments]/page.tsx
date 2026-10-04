import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card } from '@/components/card';
import { loadCard, GitHubError, type CardData } from '@/lib/github';
import { parseCardRoute, cardPath, type Size } from '@/lib/routes';
export default async function CardPage({ params, searchParams }: {
    searchParams: Promise<{ heatmap?: string | string[] }>;
    params: Promise<{
        segments: string[];
    }>;
}) {
    const { segments } = await params;
    const heatmap = (await searchParams).heatmap === '1';
    const suffix = heatmap ? '?heatmap=1' : '';
    let parsed: ReturnType<typeof parseCardRoute>;
    try {
        parsed = parseCardRoute(segments);
    }
    catch {
        notFound();
    }
    let data: CardData;
    try {
        data = await loadCard(parsed.target, parsed.size === 'l', false);
        data.contributionsEnabled = heatmap && parsed.size === 'l' && data.type === 'user';
    }
    catch (error) {
        if (error instanceof GitHubError && error.status === 404)
            notFound();
        return <main className="message-page"><h1>暂时无法加载卡片</h1><p>{error instanceof Error ? error.message : '请稍后重试。'}</p><a className="btn" href={'/h/' + segments.map(encodeURIComponent).join('/') + suffix}>重新加载</a><Link className="btn" href="/">返回首页</Link></main>;
    }
    const target = { type: data.type, id: data.id };
    if (parsed.auto || parsed.target.type !== data.type)
        redirect('/h' + cardPath(parsed.size, target) + suffix);
    const url = data.account?.html_url || data.repository?.html_url || data.entry?.html_url;
    return <main className="preview"><div className="preview-toolbar"><Link className="row muted" href="/"><ArrowLeft size={15}/>新的卡片</Link><nav className="size-switch" aria-label="卡片尺寸">{(['s', 'm', 'l'] as Size[]).map(s => <Link key={s} className={s === parsed.size ? 'selected' : ''} href={'/h' + cardPath(s, target) + suffix} aria-current={s === parsed.size ? 'page' : undefined}>{s.toUpperCase()}</Link>)}</nav></div><div className="card-stage"><Card data={data} size={parsed.size}/></div><div className="preview-caption"><a href={cardPath(parsed.size, target) + suffix}>查看 SVG</a><span>{data.type.toUpperCase()} · {({ s: 340, m: 420, l: 640 })[parsed.size]}px</span><a className="row" href={url} target="_blank" rel="noreferrer">在 GitHub 查看<ExternalLink size={12}/></a></div></main>;
}
