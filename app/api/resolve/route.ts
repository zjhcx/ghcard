import { NextResponse } from 'next/server';
import { cardPath, parseGitHubLink, sizes, type Size } from '@/lib/routes';
import { github, GitHubError, type Account, type Entry } from '@/lib/github';
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const size = params.get('size') || 'm';
    if (!sizes.includes(size as Size))
        return NextResponse.json({ error: '无效尺寸' }, { status: 400 });
    try {
        const target = parseGitHubLink(params.get('url') || '');
        if (target.type === 'account') {
            const account = await github<Account>(`/users/${encodeURIComponent(target.id[0])}`);
            target.type = account.type === 'Organization' ? 'org' : 'user';
        }
        if (target.type === 'issue') {
            const issue = await github<Entry>(`/repos/${target.id.slice(0, 2).map(encodeURIComponent).join('/')}/issues/${target.id[2]}`);
            if (issue.pull_request)
                target.type = 'pr';
        }
        return NextResponse.json({ path: cardPath(size as Size, target), type: target.type });
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : '解析失败' }, { status: error instanceof GitHubError ? error.status : 400 });
    }
}
