// ── Dynamic Table Rendering ──
const Tables = (() => {

    function fmt(n) {
        if (typeof n !== 'number') return n;
        return n.toLocaleString('de-DE');
    }

    function pct(n) {
        return (n * 100).toFixed(1).replace('.', ',') + '%';
    }

    function channelBadge(channel) {
        const ch = (channel || '').toLowerCase();
        let cls = 'badge-other';
        if (ch.includes('paid search') || ch.includes('cross-network')) cls = 'badge-paid';
        else if (ch.includes('organic')) cls = 'badge-organic';
        else if (ch.includes('direct')) cls = 'badge-direct';
        else if (ch.includes('social')) cls = 'badge-social';
        else if (ch.includes('display')) cls = 'badge-display';
        else if (ch.includes('referral')) cls = 'badge-referral';
        return `<span class="badge ${cls}">${channel}</span>`;
    }

    function sourcesTable(containerId, sources) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const totalSessions = sources.reduce((a, s) => a + s.sessions, 0);
        const sorted = [...sources].sort((a, b) => b.sessions - a.sessions);

        let html = `<table class="data-table">
            <thead><tr>
                <th>Kanal</th>
                <th>Quelle / Medium</th>
                <th class="num">Sessions</th>
                <th class="num">Nutzer</th>
                <th class="num">Anteil</th>
                <th class="num">Engagement</th>
                <th class="num">Ø Dauer</th>
            </tr></thead><tbody>`;

        sorted.forEach(s => {
            html += `<tr>
                <td>${channelBadge(s.channel)}</td>
                <td>${s.source} / ${s.medium}</td>
                <td class="num">${fmt(s.sessions)}</td>
                <td class="num">${fmt(s.users)}</td>
                <td class="num">${pct(s.sessions / totalSessions)}</td>
                <td class="num">${pct(s.engRate)}</td>
                <td class="num">${Math.round(s.avgDuration)}s</td>
            </tr>`;
        });

        html += '</tbody></table>';
        el.innerHTML = html;
    }

    function followUpTable(containerId, pages) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const sorted = [...pages].sort((a, b) => b.users - a.users);

        let html = `<table class="data-table">
            <thead><tr>
                <th>Folgeseite</th>
                <th class="num">Nutzer</th>
                <th class="num">Seitenaufrufe</th>
                <th class="num">Conversions</th>
                <th class="num">Conv. Rate</th>
            </tr></thead><tbody>`;

        sorted.slice(0, 20).forEach(p => {
            const isConv = p.conversions > 0;
            const rate = p.users > 0 && p.conversions > 0
                ? (p.conversions / p.users * 100).toFixed(1).replace('.', ',') + '%'
                : '–';
            html += `<tr class="${isConv ? 'conv-highlight' : ''}">
                <td>${p.page}</td>
                <td class="num">${fmt(p.users)}</td>
                <td class="num">${fmt(p.pv)}</td>
                <td class="num">${isConv ? '<strong>' + p.conversions + '</strong>' : '0'}</td>
                <td class="num">${isConv ? '<strong>' + rate + '</strong>' : '–'}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        el.innerHTML = html;
    }

    function flowTable(containerId, followUpPages) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const sorted = [...followUpPages].sort((a, b) => b.users - a.users);
        const maxUsers = sorted[0]?.users || 1;

        let html = '<div class="flow-container">';
        html += '<h3 style="font-size:0.9rem;margin-bottom:14px;">Nutzer-Pfade nach Landing Page</h3>';

        sorted.slice(0, 15).forEach(p => {
            const width = Math.max(5, (p.users / maxUsers) * 100);
            const label = p.page.replace(/^\/de\//, '/').replace(/\.html$/, '');
            html += `<div class="flow-row">
                <div class="flow-from" style="flex:2">
                    <div>${label}</div>
                    <div class="flow-bar" style="width:${width}%;${p.conversions > 0 ? 'background:var(--success)' : ''}"></div>
                </div>
                <div class="flow-count">${fmt(p.users)} Nutzer</div>
                <div class="flow-count" style="width:100px;color:${p.conversions > 0 ? 'var(--success)' : 'var(--text-muted)'}">${p.conversions > 0 ? p.conversions + ' Conv.' : '–'}</div>
            </div>`;
        });

        html += '</div>';
        el.innerHTML = html;
    }

    return { sourcesTable, followUpTable, flowTable };
})();
