import { loadContributions, type ContributionResult } from '@/lib/contributions';
import { heatmapMarkup } from '@/lib/heatmap';
export function ContributionHeatmap({ result, login }: { result?: ContributionResult; login: string }) {
    const calendar = result?.calendar;
    return <section className="gh-body contribution-panel" aria-label="贡献热力图">
        <div className="row contribution-heading"><h2 className="section-label">{calendar ? `${calendar.total.toLocaleString('en')} contributions in the last year` : 'Contributions in the last year'}</h2><a className="sm muted" href={`https://github.com/${encodeURIComponent(login)}?tab=overview`} target="_blank" rel="noreferrer">查看贡献</a></div>
        {calendar ? <div className="contribution-scroll" dangerouslySetInnerHTML={{ __html: heatmapMarkup(calendar) }}/> : <p className="sm muted contribution-unavailable">{result?.error || '贡献数据暂时不可用。'}</p>}
    </section>;
}

export async function LiveContributionHeatmap({ login }: { login: string }) {
    return <ContributionHeatmap login={login} result={await loadContributions(login)}/>;
}
