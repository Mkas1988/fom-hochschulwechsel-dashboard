// ── Dynamic Table Rendering with Sorting ──
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

    // ── Sortable header helper ──
    function makeSortable(containerId, data, columns, renderRow, defaultSort, defaultDir) {
        const el = document.getElementById(containerId);
        if (!el) return;

        let sortCol = defaultSort || 0;
        let sortDir = defaultDir || 'desc';

        function renderTable() {
            const sorted = [...data].sort((a, b) => {
                const va = columns[sortCol].val(a);
                const vb = columns[sortCol].val(b);
                if (typeof va === 'number' && typeof vb === 'number') {
                    return sortDir === 'asc' ? va - vb : vb - va;
                }
                return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
            });

            let html = '<table class="data-table"><thead><tr>';
            columns.forEach((col, i) => {
                const cls = (col.num ? ' class="num"' : '') + (i === sortCol ? ' class="sorted sorted-' + sortDir + (col.num ? ' num' : '') + '"' : '');
                html += `<th${cls} data-col="${i}">${col.label}<span class="sort-icon"></span></th>`;
            });
            html += '</tr></thead><tbody>';
            sorted.forEach(row => { html += renderRow(row, data); });
            html += '</tbody></table>';

            // Export button
            html += `<div class="export-bar"><button class="export-btn" data-table="${containerId}">CSV Export</button></div>`;

            el.innerHTML = html;

            // Sort click handlers
            el.querySelectorAll('th[data-col]').forEach(th => {
                th.addEventListener('click', () => {
                    const col = parseInt(th.dataset.col);
                    if (col === sortCol) {
                        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        sortCol = col;
                        sortDir = 'desc';
                    }
                    renderTable();
                });
            });

            // CSV export handler
            el.querySelector('.export-btn')?.addEventListener('click', () => {
                const csvHeader = columns.map(c => c.label).join(';');
                const csvRows = sorted.map(row => columns.map(c => c.csv ? c.csv(row) : c.val(row)).join(';'));
                const csv = csvHeader + '\n' + csvRows.join('\n');
                downloadCSV(csv, containerId + '.csv');
            });
        }

        renderTable();
    }

    function downloadCSV(csv, filename) {
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Sources Table ──
    function sourcesTable(containerId, sources) {
        const totalSessions = sources.reduce((a, s) => a + s.sessions, 0);

        const columns = [
            { label: 'Kanal', val: s => s.channel || 'Sonstige', csv: s => s.channel || 'Sonstige' },
            { label: 'Quelle / Medium', val: s => s.source + ' / ' + s.medium, csv: s => s.source + ' / ' + s.medium },
            { label: 'Sessions', num: true, val: s => s.sessions },
            { label: 'Nutzer', num: true, val: s => s.users },
            { label: 'Anteil', num: true, val: s => s.sessions / totalSessions, csv: s => pct(s.sessions / totalSessions) },
            { label: 'Engagement', num: true, val: s => s.engRate, csv: s => pct(s.engRate) },
            { label: 'Ø Dauer', num: true, val: s => s.avgDuration, csv: s => Math.round(s.avgDuration) + 's' }
        ];

        makeSortable(containerId, sources, columns, (s) => {
            return `<tr>
                <td>${channelBadge(s.channel)}</td>
                <td>${s.source} / ${s.medium}</td>
                <td class="num">${fmt(s.sessions)}</td>
                <td class="num">${fmt(s.users)}</td>
                <td class="num">${pct(s.sessions / totalSessions)}</td>
                <td class="num">${pct(s.engRate)}</td>
                <td class="num">${Math.round(s.avgDuration)}s</td>
            </tr>`;
        }, 2, 'desc');
    }

    // ── Follow-Up Table ──
    function followUpTable(containerId, pages) {
        const columns = [
            { label: 'Folgeseite', val: p => p.page },
            { label: 'Nutzer', num: true, val: p => p.users },
            { label: 'Seitenaufrufe', num: true, val: p => p.pv },
            { label: 'Conversions', num: true, val: p => p.conversions },
            { label: 'Conv. Rate', num: true, val: p => p.users > 0 ? p.conversions / p.users : 0, csv: p => p.users > 0 && p.conversions > 0 ? (p.conversions / p.users * 100).toFixed(1) + '%' : '–' }
        ];

        makeSortable(containerId, pages.slice(0, 20), columns, (p) => {
            const isConv = p.conversions > 0;
            const rate = p.users > 0 && p.conversions > 0
                ? (p.conversions / p.users * 100).toFixed(1).replace('.', ',') + '%'
                : '–';
            return `<tr class="${isConv ? 'conv-highlight' : ''}">
                <td>${p.page}</td>
                <td class="num">${fmt(p.users)}</td>
                <td class="num">${fmt(p.pv)}</td>
                <td class="num">${isConv ? '<strong>' + p.conversions + '</strong>' : '0'}</td>
                <td class="num">${isConv ? '<strong>' + rate + '</strong>' : '–'}</td>
            </tr>`;
        }, 1, 'desc');
    }

    // ── Flow Table ──
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
                <div class="flow-count" style="width:100px;color:${p.conversions > 0 ? 'var(--success)' : 'var(--text-muted)'}">
                    ${p.conversions > 0 ? p.conversions + ' Conv.' : '–'}
                </div>
            </div>`;
        });

        html += '</div>';
        el.innerHTML = html;
    }

    return { sourcesTable, followUpTable, flowTable, downloadCSV };
})();
