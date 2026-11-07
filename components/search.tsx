'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, Link2, LoaderCircle } from 'lucide-react';
import { parseGitHubLink, type Size } from '@/lib/routes';
export function Search() {
    const pathname = usePathname();
    const [url, setUrl] = useState('');
    const [size, setSize] = useState<Size>('m');
    const [heatmap, setHeatmap] = useState(false);
    let profileLink = false;
    try { profileLink = parseGitHubLink(url).type === 'account'; } catch { /* Validate on submit. */ }
    const canShowHeatmap = size === 'l' && profileLink;
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy)
            return;
        setError('');
        try {
            parseGitHubLink(url);
        }
        catch (error) {
            setError((error as Error).message);
            return;
        }
        setBusy(true);
        try {
            const response = await fetch(`/api/resolve?${new URLSearchParams({ url, size, ...(heatmap && canShowHeatmap ? { heatmap: '1' } : {}) })}`, { signal: AbortSignal.timeout(20000) });
            const result = await response.json() as { path?: string; error?: string };
            if (!response.ok || !result.path)
                throw new Error(result.error || '暂时无法解析链接，请重试。');
            window.location.assign(pathname?.startsWith('/h') ? '/h' + result.path : result.path);
        }
        catch (error) {
            setError(error instanceof Error && error.name === 'TimeoutError' ? '请求超时，请重试。' : error instanceof Error ? error.message : '暂时无法解析链接，请重试。');
        }
        finally {
            setBusy(false);
        }
    }
    return <div className="search-content"><form onSubmit={submit}><div className={`search-box ${error ? 'invalid' : ''}`}><Link2 size={20} className="muted"/><input aria-label="GitHub 完整链接" aria-describedby="search-hint search-error" placeholder="https://github.com/…" value={url} onChange={e => { setUrl(e.target.value); setError(''); }} required type="text" autoComplete="off" spellCheck={false}/><button type="submit" aria-label="生成卡片" disabled={busy}>{busy ? <LoaderCircle className="spinner" size={20}/> : <ArrowRight size={20}/>}</button></div><div className="search-options"><p id="search-hint">粘贴 GitHub 链接，自动识别类型</p><fieldset className="size-switch"><legend className="sr-only">卡片尺寸</legend>{(['s', 'm', 'l'] as const).map(s => <button key={s} type="button" aria-pressed={size === s} className={size === s ? 'selected' : ''} onClick={() => setSize(s)}>{s.toUpperCase()}</button>)}</fieldset></div><div className="heatmap-option"><label><input type="checkbox" checked={heatmap} disabled={!canShowHeatmap || busy} onChange={e => setHeatmap(e.target.checked)} aria-describedby="heatmap-hint"/>显示提交热力图</label><span id="heatmap-hint">仅适用于用户大卡（L），展示过去一年的 GitHub 贡献</span></div><p className="search-error" id="search-error" role="alert">{error}</p></form><div className="examples"><span>试试看</span>{[['用户', 'https://github.com/octocat'], ['组织', 'https://github.com/vercel'], ['仓库', 'https://github.com/vercel/next.js'], ['Release', 'https://github.com/vercel/next.js/releases/latest']].map(([label, link]) => <button key={label} onClick={() => { setUrl(link); setError(''); }}>{label}</button>)}</div></div>;
}
