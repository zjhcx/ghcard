// GitHub requires an explicit User-Agent. Workers fetch does not add Node's default.
// Keep REST and GraphQL consistent and credentials on the server only.
export function githubHeaders(authenticate = true): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ghcard',
        'X-GitHub-Api-Version': '2022-11-28',
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (authenticate && token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

// GHPROXY follows the prefix convention: https://proxy.example/https://api.github.com/...
// Read at request time so Worker runtime variables work without a rebuild.
export function githubRequest(path: string): { url: string; headers: Record<string, string> } {
    const upstream = `https://api.github.com${path}`;
    const proxy = process.env.GHPROXY?.trim();
    if (!proxy) return { url: upstream, headers: githubHeaders() };
    const base = new URL(proxy);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
        throw new Error('GHPROXY 必须是无凭据、查询参数或片段的 HTTPS 代理前缀');
    return {
        url: `${base.href.replace(/\/+$/, '')}/${upstream}`,
        // Never disclose the server's GitHub token to a third-party proxy.
        headers: githubHeaders(false),
    };
}
