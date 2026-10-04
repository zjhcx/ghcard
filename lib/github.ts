import { loadContributions, type ContributionResult } from './contributions';
import type { CardType, Target } from './routes';
export class GitHubError extends Error {
    constructor(message: string, public status = 502) { super(message); }
}
export interface Account {
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
    type: string;
    bio: string | null;
    description?: string;
    company: string | null;
    location: string | null;
    blog: string;
    email: string | null;
    followers: number;
    following: number;
    public_repos: number;
    created_at: string;
}
export interface Repository {
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    updated_at: string;
    topics?: string[];
    owner: Account;
    default_branch: string;
}
export interface Entry {
    html_url: string;
    title?: string;
    body?: string | null;
    number?: number;
    state?: string;
    state_reason?: string;
    draft?: boolean;
    merged?: boolean;
    comments?: number;
    user?: Account;
    author?: Account;
    created_at?: string;
    published_at?: string;
    name?: string;
    tag_name?: string;
    prerelease?: boolean;
    target_commitish?: string;
    assets?: {
        id: number;
        name: string;
        size: number;
        download_count: number;
        browser_download_url: string;
    }[];
    zipball_url?: string;
    sha?: string;
    commit?: {
        message: string;
        author: {
            name: string;
            date: string;
        };
        verification: {
            verified: boolean;
        };
    };
    stats?: {
        additions: number;
        deletions: number;
    };
    files?: {
        filename: string;
        additions: number;
        deletions: number;
        status: string;
    }[];
    additions?: number;
    deletions?: number;
    changed_files?: number;
    commits?: number;
    head?: {
        label: string;
    };
    base?: {
        label: string;
    };
    labels?: {
        name: string;
        color: string;
    }[];
    pull_request?: {
        url: string;
    };
    reactions?: Record<string, number>;
}
export interface CardData {
    type: CardType;
    id: string[];
    account?: Account;
    repository?: Repository;
    repositories?: Repository[];
    entry?: Entry;
    contributions?: ContributionResult;
    contributionsEnabled?: boolean;
}
export async function github<T>(path: string): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (process.env.GITHUB_TOKEN)
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    let response: Response;
    try {
        response = await fetch(`https://api.github.com${path}`, { headers, next: { revalidate: 300 }, signal: AbortSignal.timeout(12000) });
    }
    catch {
        throw new GitHubError('暂时无法连接 GitHub，请稍后重试。');
    }
    if (!response.ok) {
        if (response.status === 404)
            throw new GitHubError('GitHub 上找不到该内容，或它属于私有项目。', 404);
        if (response.status === 403 || response.status === 429)
            throw new GitHubError('GitHub API 请求受到限制，请稍后重试，或为服务器配置 GITHUB_TOKEN。', 429);
        if (response.status === 401)
            throw new GitHubError('服务器的 GitHub Token 无效，请检查配置。', 401);
        throw new GitHubError('GitHub 暂时未能返回数据，请稍后重试。');
    }
    return response.json() as Promise<T>;
}
const encoded = (parts: string[]) => parts.map(encodeURIComponent).join('/');
export async function loadCard(target: Target, detailed = false, includeContributions = false): Promise<CardData> {
    const { id } = target;
    if (target.type === 'account' || target.type === 'user' || target.type === 'org') {
        const account = await github<Account>(`/users/${encoded(id)}`);
        const type = account.type === 'Organization' ? 'org' : 'user';
        const [repositories, contributions] = await Promise.all([
            detailed ? github<Repository[]>(`/users/${encoded(id)}/repos?sort=updated&per_page=6`).catch(() => []) : Promise.resolve([]),
            detailed && includeContributions && type === 'user' ? loadContributions(account.login) : Promise.resolve(undefined),
        ]);
        return { type, id, account, repositories, contributions, contributionsEnabled: detailed && includeContributions && type === 'user' };
    }
    if (target.type === 'repo')
        return { type: 'repo', id, repository: await github<Repository>(`/repos/${encoded(id)}`) };
    const prefix = `/repos/${encoded(id.slice(0, 2))}`;
    const suffix = target.type === 'release' ? id.slice(2).join('/') === 'latest' ? '/releases/latest' : `/releases/tags/${encodeURIComponent(id.slice(2).join('/'))}` : `/${target.type === 'commit' ? 'commits' : target.type === 'pr' ? 'pulls' : 'issues'}/${encodeURIComponent(id[2])}`;
    let entry = await github<Entry>(prefix + suffix);
    let type = target.type;
    if (type === 'issue' && entry.pull_request) {
        type = 'pr';
        entry = await github<Entry>(`${prefix}/pulls/${encodeURIComponent(id[2])}`);
    }
    return { type, id, entry };
}
