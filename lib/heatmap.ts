import type { ContributionCalendar } from './contributions';
export const heatmapColors = { light: ['#ebedf0','#9be9a8','#40c463','#30a14e','#216e39'], dark: ['#161b22','#0e4429','#006d32','#26a641','#39d353'] };
export function escapeXml(value: unknown): string {
    return String(value ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
}
export function heatmapMarkup(calendar: ContributionCalendar, width = 608, theme: 'light' | 'dark' = 'light'): string {
    const { days, total } = calendar;
    const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
    const columns = Math.ceil((offset + days.length) / 7);
    const step = Math.min(11, (width - 28) / columns);
    const cell = step - 2;
    const startX = 28;
    const colors = heatmapColors[theme];
    const fg = theme === 'dark' ? '#9198a1' : '#59636e';
    const text = (x: number, y: number, content: string) => `<text x="${x}" y="${y}" fill="${fg}" font-size="9">${escapeXml(content)}</text>`;
    const months: string[] = [];
    let lastMonth = '';
    let lastLabelX = -100;
    const cells = days.map((day, index) => {
        const position = offset + index;
        const x = startX + Math.floor(position / 7) * step;
        const y = 22 + (position % 7) * step;
        const month = day.date.slice(0,7);
        if (month !== lastMonth) {
            if (x - lastLabelX >= 26 && x < width - 24) { months.push(text(x,12,`${Number(day.date.slice(5,7))}月`)); lastLabelX = x; }
            lastMonth = month;
        }
        return `<rect data-date="${escapeXml(day.date)}" data-l="${day.level}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="2" fill="${colors[day.level]}"><title>${escapeXml(day.date)} · ${day.count} 次贡献</title></rect>`;
    });
    const bottom = 22 + 7 * step + 14;
    const legendX = width - 100;
    const legend = colors.map((color, level) => `<rect data-l="${level}" x="${legendX + level * 11}" y="${bottom - 8}" width="9" height="9" rx="2" fill="${color}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.ceil(bottom+8)}" viewBox="0 0 ${width} ${Math.ceil(bottom+8)}" role="img" aria-label="${total} 次贡献，${days[0].date} 至 ${days[days.length-1].date}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif"><title>过去一年贡献热力图</title>${months.join('')}${text(0,22+step+7,'一')}${text(0,22+step*3+7,'三')}${text(0,22+step*5+7,'五')}${cells.join('')}${text(0,bottom,`${days[0].date} — ${days[days.length-1].date}`)}${text(legendX-24,bottom,'少')}${legend}${text(legendX+60,bottom,'多')}</svg>`;
}
