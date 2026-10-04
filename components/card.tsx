import { Suspense } from 'react';
import { ContributionHeatmap, LiveContributionHeatmap } from '@/components/contribution-heatmap';
import { Github } from '@/components/github-icon';
import Image from 'next/image';
import { GitCommitHorizontal, GitPullRequest, CircleDot, Tag, BookOpen, Star, GitFork, Users, MapPin, Building2, MessageSquare, Download, Package, CheckCircle2, GitBranch } from 'lucide-react';
import type { CardData, Account } from '@/lib/github';
import type { Size } from '@/lib/routes';
const count = (n?: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0);
const date = (d?: string) => d ? new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
function Avatar({ account, size = 40, square = false }: {
    account?: Account;
    size?: number;
    square?: boolean;
}) {
    return <span className={`avatar ${square ? 'sq' : ''}`} style={{ width: size, height: size }}>{account?.login?.slice(0, 1)}{account?.avatar_url && <Image src={account.avatar_url} alt={`${account.login} 的头像`} width={size} height={size} unoptimized/>}</span>;
}
function Stats({ items }: {
    items: [
        string,
        number
    ][];
}) { return <div className="stat-grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>{items.map(([label, n]) => <div key={label}><div className="v">{count(n)}</div><div className="k">{label}</div></div>)}</div>; }
function Profile({ data, size }: {
    data: CardData;
    size: Size;
}) {
    const a = data.account!;
    const org = data.type === 'org';
    if (size === 's')
        return <div className="s-wrap"><Avatar account={a} square={org}/><div className="s-main"><div className="s-title">{a.name || a.login}</div><div className="s-sub">@{a.login} · {count(a.followers)} followers</div></div><a className="btn" href={a.html_url} target="_blank" rel="noreferrer">Follow</a></div>;
    return <>{size === 'l' && <div className={`banner ${org ? 'org' : ''}`}/>}<div className="gh-body" style={size === 'l' ? { paddingTop: 0 } : undefined}><div className={size === 'l' ? 'profile-top' : 'row profile-row'}><Avatar account={a} size={size === 'l' ? 96 : 56} square={org}/><div style={{ flex: 1, minWidth: 0 }}><h1 className={size === 'l' ? 'title-l ellipsis' : 'title-m ellipsis'}>{a.name || a.login}</h1><div className="muted">@{a.login}</div>{size === 'm' && <p className="clamp-2 sm profile-bio">{a.bio || a.description}</p>}</div><Github className="ic ic-20 muted"/></div>{size === 'l' && <p>{a.bio || a.description}</p>}<div className="row wrap muted sm profile-meta">{a.location && <span className="row"><MapPin className="ic"/>{a.location}</span>}{a.company && <span className="row"><Building2 className="ic"/>{a.company}</span>}{size === 'l' && <span>Joined {date(a.created_at)}</span>}</div>{size === 'l' && <div className="row muted sm profile-meta"><Users className="ic"/>{count(a.followers)} followers · {count(a.following)} following</div>}</div><Stats items={[["Repositories", a.public_repos], ["Followers", a.followers], ["Following", a.following]]}/>{size === 'l' && !!data.repositories?.length && <div className="gh-body"><div className="section-label">Recently updated repositories</div><div className="pinned">{data.repositories.map(r => <div key={r.full_name}><a className="row bold" href={r.html_url} target="_blank" rel="noreferrer"><BookOpen className="ic"/>{r.name}</a><p className="sm muted clamp-2">{r.description}</p><div className="row sm muted">{r.language && <span>{r.language}</span>}<Star className="ic ic-12"/>{count(r.stargazers_count)}<GitFork className="ic ic-12"/>{count(r.forks_count)}</div></div>)}</div></div>}{size === 'l' && !org && data.contributionsEnabled && (data.contributions ? <ContributionHeatmap result={data.contributions} login={a.login}/> : <Suspense fallback={<section className="gh-body contribution-panel"><p className="sm muted" role="status">正在加载贡献热力图…</p></section>}><LiveContributionHeatmap login={a.login}/></Suspense>)}</>;
}
export function Card({ data, size }: {
    data: CardData;
    size: Size;
}) {
    if (data.account)
        return <article className={`gh-card gh-card--${size}`}><Profile data={data} size={size}/></article>;
    const e = data.entry;
    const r = data.repository;
    const type = data.type;
    const Icon = type === 'release' ? Tag : type === 'commit' ? GitCommitHorizontal : type === 'pr' ? GitPullRequest : type === 'issue' ? CircleDot : BookOpen;
    const title = r?.name || e?.title || e?.name || e?.tag_name || e?.commit?.message.split('\n')[0] || 'Release';
    const author = e?.user || e?.author || r?.owner;
    const url = r?.html_url || e?.html_url;
    const state = type === 'pr' ? e?.merged ? 'merged' : e?.draft ? 'draft' : e?.state === 'closed' ? 'closed' : 'open' : e?.state === 'closed' ? e.state_reason === 'completed' ? 'done' : 'closed' : 'open';
    const badge = ['pr', 'issue'].includes(type) ? <span className={`state ${state} sm-state`}>{state === 'done' ? 'Completed' : state[0].toUpperCase() + state.slice(1)}</span> : type === 'release' ? <span className="badge green">{e?.prerelease ? 'Pre-release' : 'Release'}</span> : type === 'commit' && e?.commit?.verification.verified ? <span className="badge green"><CheckCircle2 className="ic ic-12"/>Verified</span> : null;
    if (size === 's')
        return <article className="gh-card gh-card--s"><div className="s-wrap">{type === 'commit' ? <Avatar account={author} size={32}/> : <span className="icon-bubble green"><Icon className="ic"/></span>}<div className="s-main"><a className="s-title fg" href={url} target="_blank" rel="noreferrer">{title}</a><div className="s-sub">{data.id.slice(0, 2).join('/')} {e?.number ? `#${e.number}` : ''}{e?.tag_name ? ` · ${e.tag_name}` : ''}</div></div>{type === 'commit' ? <span className="chip accent mono">{e?.sha?.slice(0, 7)}</span> : badge || <Github className="ic muted"/>}</div></article>;
    return <article className={`gh-card gh-card--${size}`}><div className="gh-head"><BookOpen className="ic"/><span className="repo ellipsis">{data.id[0]} / <b>{data.id[1]}</b></span><Github className="ic logo"/></div><div className="gh-body"><div className="row title-row"><Icon className="ic ic-20 ok"/><h1 className={size === 'l' ? 'title-l' : 'title-m'}><a className="fg" href={url} target="_blank" rel="noreferrer">{title}</a>{e?.number && <span className="num"> #{e.number}</span>}</h1></div><div className="row wrap entry-meta">{badge}{e?.tag_name && <span className="chip"><Tag className="ic ic-12"/>{e.tag_name}</span>}{e?.sha && <span className="chip accent mono">{e.sha.slice(0, 7)}</span>}{author && <><Avatar account={author} size={20}/><span className="sm muted">{author.login}</span></>}<span className="sm muted">{date(e?.published_at || e?.created_at || e?.commit?.author.date || r?.updated_at)}</span></div>{e?.head && e.base && <div className="row wrap muted sm"><GitBranch className="ic"/><span className="chip">{e.head.label}</span>→<span className="chip">{e.base.label}</span></div>}{(r?.description || e?.body || e?.commit?.message.includes('\n')) && <p className={`card-description ${size === 'm' ? 'clamp-3 muted' : ''}`}>{r?.description || e?.body || e?.commit?.message.split('\n').slice(1).join('\n')}</p>}{!!e?.labels?.length && <div className="row wrap">{e.labels.map(label => <span key={label.name} className="badge">{label.name}</span>)}</div>}{r?.topics && <div className="row wrap">{r.topics.map(t => <span className="chip accent" key={t}>{t}</span>)}</div>}{size === 'l' && !!e?.assets?.length && <><div className="hr"/><div className="section-label">Assets · {e.assets.length}</div><div className="list">{e.assets.map(asset => <div key={asset.id}><Package className="ic muted"/><a className="grow ellipsis bold" href={asset.browser_download_url}>{asset.name}</a><span className="sm muted">{(asset.size / 1048576).toFixed(1)} MB</span><span className="row sm muted"><Download className="ic ic-12"/>{count(asset.download_count)}</span></div>)}</div></>}{size === 'l' && !!e?.files?.length && <><div className="hr"/><div className="section-label">Changed files · {e.files.length}</div><div className="list">{e.files.slice(0, 10).map(f => <div key={f.filename}><span className="grow mono ellipsis">{f.filename}</span><span className="add">+{f.additions}</span><span className="del">−{f.deletions}</span></div>)}</div>{e.files.length > 10 && <p className="sm muted">在 GitHub 查看全部文件</p>}</>}</div><div className="gh-foot">{r ? <><span className="row"><Star className="ic ic-12"/>{count(r.stargazers_count)}</span><span className="row"><GitFork className="ic ic-12"/>{count(r.forks_count)}</span><span className="row"><CircleDot className="ic ic-12"/>{count(r.open_issues_count)}</span>{r.language && <span className="right">{r.language}</span>}</> : type === 'release' ? <><span className="row"><Package className="ic ic-12"/>{e?.assets?.length || 0} assets</span><span className="row"><Download className="ic ic-12"/>{count(e?.assets?.reduce((n, a) => n + a.download_count, 0))}</span></> : <>{(type === 'commit' || type === 'pr') && <><span>{e?.changed_files ?? e?.files?.length ?? 0} files</span><span className="add">+{e?.stats?.additions ?? e?.additions ?? 0}</span><span className="del">−{e?.stats?.deletions ?? e?.deletions ?? 0}</span></>}<span className="row"><MessageSquare className="ic ic-12"/>{e?.comments ?? 0} comments</span></>}</div></article>;
}
