import type { CardData } from './github';
import type { Size } from './routes';
import { escapeXml, heatmapMarkup } from './heatmap';
export type SvgTheme = 'light' | 'dark';
const widths = { s: 340, m: 420, l: 640 };
const palettes = {
    light: { bg: '#ffffff', subtle: '#f6f8fa', border: '#d0d7de', fg: '#1f2328', muted: '#59636e', accent: '#0969da', green: '#1a7f37', red: '#cf222e' },
    dark: { bg: '#0d1117', subtle: '#151b23', border: '#30363d', fg: '#e6edf3', muted: '#9198a1', accent: '#4493f8', green: '#3fb950', red: '#f85149' },
};
const compact = (n?: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0);
function measure(text: string, font: number) { return Array.from(text).reduce((n,c) => n + (/[\u2e80-\uffff]/.test(c) ? font : font * .58), 0); }
function lines(value: string, width: number, font: number, limit: number): string[] {
    const chunks: string[] = [];
    let line = '';
    for (const char of Array.from(value.replace(/\r/g, ''))) {
        if (char === '\n' || measure(line + char, font) > width) {
            chunks.push(line); line = char === '\n' ? '' : char;
        } else line += char;
    }
    if (line) chunks.push(line);
    if (chunks.length > limit) {
        const last = chunks[limit - 1] || '';
        chunks[limit - 1] = Array.from(last).slice(0,-2).join('') + '…';
    }
    return chunks.slice(0,limit);
}
export function renderCardSvg(data: CardData, size: Size, theme: SvgTheme = 'light', avatar?: string): string {
    const w = widths[size]; const p = palettes[theme]; const parts: string[] = []; let y = 0;
    const rect = (x: number, yy: number, width: number, height: number, fill: string, radius = 0) => `<rect x="${x}" y="${yy}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"/>`;
    const text = (x: number, yy: number, value: unknown, font = 13, color = p.fg, bold = false) => `<text x="${x}" y="${yy}" fill="${color}" font-size="${font}"${bold ? ' font-weight="600"' : ''}>${escapeXml(value)}</text>`;
    const rule = (yy: number) => `<path d="M0 ${yy}H${w}" stroke="${p.border}"/>`;
    function block(value: string | null | undefined, font = 13, color = p.muted, limit = 3, x = 16, width = w - 32) {
        if (!value) return;
        for (const line of lines(value, width, font, limit)) { parts.push(text(x,y,line,font,color)); y += font + 7; }
    }
    function avatarAt(x: number, yy: number, diameter: number, initial: string) {
        const cx = x + diameter / 2; const cy = yy + diameter / 2;
        parts.push(`<defs><clipPath id="avatar"><circle cx="${cx}" cy="${cy}" r="${diameter/2}"/></clipPath></defs>`, `<circle cx="${cx}" cy="${cy}" r="${diameter/2}" fill="${p.accent}"/>`);
        if (avatar && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)) parts.push(`<image x="${x}" y="${yy}" width="${diameter}" height="${diameter}" href="${avatar}" clip-path="url(#avatar)"/>`);
        else parts.push(`<text x="${cx}" y="${cy + diameter*.15}" text-anchor="middle" fill="#ffffff" font-size="${diameter*.4}">${escapeXml(initial.slice(0,1).toUpperCase())}</text>`);
    }
    const a = data.account; const r = data.repository; const e = data.entry;
    const title = a?.name || a?.login || r?.name || e?.title || e?.name || e?.tag_name || e?.commit?.message.split('\n')[0] || 'GitHub Card';
    if (size === 's') {
        if (a) avatarAt(14,14,40,a.login);
        const x = a ? 66 : 16;
        const displayTitle = lines(title,w-x-16,14,1)[0] || title;
        parts.push(text(x,29,displayTitle,14,p.fg,true));
        const subtitle = a ? `@${a.login} · ${compact(a.followers)} followers` : `${data.id.slice(0,2).join('/')} ${e?.number ? '#'+e.number : e?.sha?.slice(0,7) || e?.tag_name || ''}`;
        parts.push(text(x,48,lines(subtitle,w-x-16,12,1)[0],12,p.muted)); y = 68;
    } else if (a) {
        if (size === 'l') {
            parts.push(`<defs><linearGradient id="banner"><stop stop-color="${data.type === 'org' ? '#1f883d' : '#0969da'}"/><stop offset="1" stop-color="#8250df"/></linearGradient></defs>`,rect(0,0,w,96,'url(#banner)'));
            avatarAt(20,52,88,a.login); parts.push(text(126,125,lines(title,w-146,22,1)[0],22,p.fg,true),text(126,147,`@${a.login}`,14,p.muted)); y = 174;
        } else {
            avatarAt(16,16,56,a.login); parts.push(text(86,36,lines(title,w-102,16,1)[0],16,p.fg,true),text(86,56,`@${a.login}`,12,p.muted)); y = 92;
        }
        block(a.bio || a.description,13,p.fg,size === 'l' ? 4 : 2);
        block([a.location,a.company].filter(Boolean).join(' · '),12,p.muted,2); y += 6;
        parts.push(rule(y));
        const stats: [string,number][] = [['Repositories',a.public_repos],['Followers',a.followers],['Following',a.following]];
        for (let i=0;i<stats.length;i++) { const x = 16 + i * w/3; parts.push(text(x,y+27,compact(stats[i][1]),18,p.fg,true),text(x,y+46,stats[i][0],11,p.muted)); }
        y += 62;
        if (size === 'l' && data.repositories?.length) {
            parts.push(rule(y)); y += 25; parts.push(text(16,y,'Recently updated repositories',12,p.muted,true)); y += 15;
            const repositories = data.repositories.slice(0,6); const rw = (w - 44)/2;
            repositories.forEach((repo,index) => {
                const x = 16 + (index%2)*(rw+12); const yy = y + Math.floor(index/2)*100;
                parts.push(`<rect x="${x}" y="${yy}" width="${rw}" height="88" rx="8" fill="${p.bg}" stroke="${p.border}"/>`,text(x+12,yy+23,lines(repo.name,rw-24,13,1)[0],13,p.accent,true));
                const description = lines(repo.description || '',rw-24,11,2);
                description.forEach((line,j)=>parts.push(text(x+12,yy+42+j*15,line,11,p.muted)));
                parts.push(text(x+12,yy+75,`${repo.language || ''}  ★ ${compact(repo.stargazers_count)}  · Forks ${compact(repo.forks_count)}`,11,p.muted));
            }); y += Math.ceil(repositories.length/2)*100;
        }
        if (size === 'l' && data.type === 'user' && data.contributionsEnabled) {
            parts.push(rule(y)); y += 26;
            const calendar = data.contributions?.calendar;
            parts.push(text(16,y,calendar ? `${calendar.total.toLocaleString('en')} contributions in the last year` : 'Contributions in the last year',12,p.muted,true)); y += 14;
            if (calendar) { parts.push(`<g transform="translate(16 ${y})">${heatmapMarkup(calendar,w-32,theme)}</g>`); y += 127; }
            else { y += 16; parts.push(text(16,y,data.contributions?.error || '贡献数据暂时不可用。',12,p.muted)); y += 20; }
        }
        y += 12;
    } else {
        parts.push(rect(0,0,w,42,p.subtle),text(16,26,lines(data.id.slice(0,2).join(' / '),w-110,13,1)[0],13,p.fg,true),text(w-80,26,data.type.toUpperCase(),11,p.muted),rule(42)); y = 72;
        block(`${title}${e?.number ? ' #'+e.number : ''}`,size === 'l' ? 20 : 16,p.fg,3);
        const status = data.type === 'pr' ? e?.merged ? 'Merged' : e?.draft ? 'Draft' : e?.state : data.type === 'issue' ? e?.state : e?.prerelease ? 'Pre-release' : '';
        block([status,e?.tag_name,e?.sha?.slice(0,7),e?.user?.login || e?.author?.login || e?.commit?.author.name].filter(Boolean).join(' · '),12,p.muted,2);
        block(r?.description || e?.body || e?.commit?.message.split('\n').slice(1).join('\n'),13,p.muted,size === 'l' ? 12 : 3);
        if (e?.head && e.base) block(`${e.head.label} → ${e.base.label}`,12,p.accent,2);
        if (e?.labels?.length) block(e.labels.map(label=>label.name).join(' · '),11,p.accent,2);
        if (size === 'l' && e?.assets?.length) {
            y += 8;parts.push(text(16,y,'Assets',12,p.muted,true));y+=24;
            e.assets.slice(0,6).forEach(asset => block(`${asset.name} · ${(asset.size/1048576).toFixed(1)} MB · ${compact(asset.download_count)} downloads`,12,p.fg,2));
        }
        if (size === 'l' && e?.files?.length) {
            y += 8;parts.push(text(16,y,'Changed files',12,p.muted,true));y+=24;
            e.files.slice(0,6).forEach(file => block(`${file.filename}  +${file.additions} −${file.deletions}`,12,p.fg,2));
        }
        y += 6;parts.push(rule(y));y+=24;
        const footer = r ? `★ ${compact(r.stargazers_count)}  · Forks ${compact(r.forks_count)}  · Issues ${compact(r.open_issues_count)}${r.language ? ' · '+r.language : ''}` : data.type === 'release' ? `${e?.assets?.length || 0} assets · ${compact(e?.assets?.reduce((n,a)=>n+a.download_count,0))} downloads` : ['commit','pr'].includes(data.type) ? `${e?.changed_files ?? e?.files?.length ?? 0} files  · +${e?.stats?.additions ?? e?.additions ?? 0} −${e?.stats?.deletions ?? e?.deletions ?? 0} · ${e?.comments ?? 0} comments` : `${e?.comments ?? 0} comments`;
        block(footer,11,p.muted,2); y += 4;
    }
    const h = Math.ceil(y);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(title)}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif"><title>${escapeXml(title)} · GitHub ${data.type}</title><defs><clipPath id="card"><rect width="${w}" height="${h}" rx="12"/></clipPath></defs><g clip-path="url(#card)">${rect(0,0,w,h,p.bg)}${parts.join('')}</g><rect x="0.5" y="0.5" width="${w-1}" height="${h-1}" rx="11.5" fill="none" stroke="${p.border}"/></svg>`;
}
export function renderErrorSvg(message: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="110" role="img" aria-label="${escapeXml(message)}"><rect x=".5" y=".5" width="419" height="109" rx="12" fill="#fff" stroke="#d0d7de"/><text x="16" y="30" font-family="Arial,sans-serif" font-size="14" fill="#cf222e">GitHub Cards</text>${lines(message,388,12,3).map((line,i)=>`<text x="16" y="${54+i*18}" font-family="Arial,sans-serif" font-size="12" fill="#59636e">${escapeXml(line)}</text>`).join('')}</svg>`;
}
export async function loadSvgAvatar(data: CardData): Promise<string | undefined> {
    const avatar = data.account?.avatar_url;
    if (!avatar) return;
    try {
        const url = new URL(avatar);
        if (url.protocol !== 'https:' || url.hostname !== 'avatars.githubusercontent.com') return;
        url.searchParams.set('s','192');
        const response = await fetch(url,{next:{revalidate:3600},signal:AbortSignal.timeout(3000)});
        const mime = response.headers.get('content-type')?.split(';')[0];
        if (!response.ok || !mime || !['image/png','image/jpeg','image/webp'].includes(mime)) return;
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 1024*1024) return;
        return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch { return; }
}
