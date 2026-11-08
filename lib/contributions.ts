import { githubHeaders } from './github-headers';

export interface ContributionDay { date: string; count: number; level: number }
export interface ContributionCalendar { days: ContributionDay[]; total: number; source: 'github' | 'public' }
export interface ContributionResult { calendar?: ContributionCalendar; error?: string }
const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
export function normalizeContributions(input: unknown, source: ContributionCalendar['source']): ContributionCalendar {
    if (!Array.isArray(input) || input.length === 0 || input.length > 400) throw new Error('贡献数据不完整');
    // Array.from visits sparse entries too, so missing days cannot bypass validation.
    const days: ContributionDay[] = Array.from(input, day => {
        if (!day || typeof day !== 'object') throw new Error('贡献数据格式无效');
        const { date, count, level } = day;
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date || !Number.isSafeInteger(count) || count < 0 || !Number.isInteger(level) || level < 0 || level > 4) throw new Error('贡献数据格式无效');
        return { date, count, level };
    }).sort((a,b) => a.date.localeCompare(b.date));
    for (let i = 1; i < days.length; i++) {
        if (Date.parse(days[i].date) - Date.parse(days[i-1].date) !== 86400000) throw new Error('贡献数据包含重复或缺失日期');
    }
    const total = days.reduce((sum, day) => {
        const next = sum + day.count;
        if (!Number.isSafeInteger(next)) throw new Error('贡献数据总数超出有效范围');
        return next;
    }, 0);
    return { days, total, source };
}
const query = `query Contributions($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;
export async function loadContributions(login: string): Promise<ContributionResult> {
    if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(login)) return { error: '无法读取此用户的贡献数据' };
    try {
        const headers = githubHeaders();
        if (headers.Authorization) {
            const response = await fetch('https://api.github.com/graphql', {
                method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables: { login } }), next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) throw new Error('贡献接口请求失败');
            const result = await response.json() as { errors?: unknown[]; data?: { user?: { contributionsCollection?: { contributionCalendar?: { weeks?: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[] } } } } };
            if (result.errors?.length) throw new Error('贡献接口请求失败');
            const weeks = result.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
            if (!Array.isArray(weeks)) throw new Error('贡献数据不完整');
            const days = weeks.flatMap(week => {
                if (!Array.isArray(week.contributionDays)) throw new Error('贡献数据不完整');
                return week.contributionDays.map((day: { date: string; contributionCount: number; contributionLevel: string }) => ({ date: day.date, count: day.contributionCount, level: levels.indexOf(day.contributionLevel) }));
            });
            return { calendar: normalizeContributions(days, 'github') };
        }
        // Public profile contributions only. Never send the GitHub token to this service.
        const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(login)}?y=last`, {
            next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error('贡献接口请求失败');
        const result = await response.json() as { contributions?: unknown };
        return { calendar: normalizeContributions(result.contributions, 'public') };
    } catch {
        return { error: '贡献数据暂时不可用，请稍后重试。' };
    }
}
