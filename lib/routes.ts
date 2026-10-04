export const sizes = ['s', 'm', 'l'] as const;
export type Size = typeof sizes[number];
export const types = ['user', 'org', 'repo', 'release', 'commit', 'pr', 'issue'] as const;
export type CardType = typeof types[number];
export interface Target {
    type: CardType | 'account';
    id: string[];
}
const reserved = new Set(['settings', 'login', 'signup', 'search', 'explore', 'marketplace', 'notifications', 'new', 'features', 'topics', 'collections', 'sponsors', 'organizations']);
function valid(parts: string[]) {
    if (parts.some(p => !p || p === '.' || p === '..' || /[\\\x00-\x1f\x7f]/.test(p)))
        throw new Error('链接标识无效');
}
export function parseGitHubLink(input: string): Target {
    let url: URL;
    try {
        url = new URL(input.trim());
    }
    catch {
        throw new Error('请输入完整的 GitHub 链接，例如 https://github.com/octocat');
    }
    if (url.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(url.hostname) || url.username || url.password || url.port)
        throw new Error('请输入 https://github.com/ 开头的链接');
    let parts: string[];
    try {
        parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    }
    catch {
        throw new Error('链接编码无效');
    }
    valid(parts);
    if (parts.some(p => p.includes('/')))
        throw new Error('链接路径无效');
    if (!parts.length || reserved.has(parts[0].toLowerCase()))
        throw new Error('请输入用户、组织、仓库、Release、Commit、PR 或 Issue 的链接');
    if (parts[0] === 'orgs' && parts.length === 2)
        return { type: 'org', id: [parts[1]] };
    if (parts.length === 1)
        return { type: 'account', id: parts };
    const [owner, rawRepo, kind, ...rest] = parts;
    const repo = rawRepo.replace(/\.git$/, '');
    if (!repo)
        throw new Error('仓库名无效');
    const base = [owner, repo];
    if (parts.length === 2)
        return { type: 'repo', id: base };
    if (kind === 'commit' && rest.length === 1 && /^[a-f0-9]{7,40}$/i.test(rest[0]))
        return { type: 'commit', id: [...base, ...rest] };
    if (['pull', 'issues'].includes(kind) && rest.length >= 1 && /^[1-9]\d*$/.test(rest[0]) && (rest.length === 1 || (kind === 'pull' && rest.length === 2 && ['files', 'commits', 'checks'].includes(rest[1]))))
        return { type: kind === 'pull' ? 'pr' : 'issue', id: [...base, rest[0]] };
    if (kind === 'releases' && rest[0] === 'tag' && rest.length >= 2)
        return { type: 'release', id: [...base, ...rest.slice(1)] };
    if (kind === 'releases' && (rest.length === 0 || (rest.length === 1 && rest[0] === 'latest')))
        return { type: 'release', id: [...base, 'latest'] };
    throw new Error('暂不支持此 GitHub 页面，请使用用户、组织、仓库、版本发布、提交、PR 或 Issue 链接');
}
export function cardPath(size: Size, target: Target): string {
    return '/' + [size, target.type === 'account' ? 'user' : target.type, ...target.id].map(encodeURIComponent).join('/');
}
export function parseCardRoute(segments: string[]): {
    size: Size;
    target: Target;
    auto: boolean;
} {
    if (segments[0] === 'a') {
        const id = segments.slice(1);
        valid(id);
        if (!id.length)
            throw new Error('缺少 GitHub 标识');
        const input = id.join('/');
        return { size: 'm', target: parseGitHubLink(input.startsWith('https://') ? input : `https://github.com/${input}`), auto: true };
    }
    const [size, type, ...id] = segments;
    valid(id);
    if (!sizes.includes(size as Size) || !types.includes(type as CardType))
        throw new Error('无效卡片路由');
    if (['user', 'org'].includes(type) ? id.length !== 1 : type === 'repo' ? id.length !== 2 : type === 'release' ? id.length < 3 : id.length !== 3)
        throw new Error('卡片标识不完整');
    if (['issue', 'pr'].includes(type) && !/^[1-9]\d*$/.test(id[2]))
        throw new Error('Issue / PR 编号无效');
    if (type === 'commit' && !/^[a-f0-9]{7,40}$/i.test(id[2]))
        throw new Error('提交 ID 无效');
    return { size: size as Size, target: { type: type as CardType, id }, auto: false };
}
