// ── Chart Manager (FOM Design System) ──
const Charts = (() => {
    const instances = {};
    const COLORS = {
        primary: '#00c6b2', primaryDark: '#009f8f', primaryLight: '#33d2c2',
        secondary: '#0071de', secondaryLight: '#338de5',
        accent: '#e81818', highlight: '#f9cb00',
        success: '#77b502', warning: '#f2c91b', blue: '#0091c6',
        purple: '#9404c9', orange: '#d98e00', teal: '#00c6b2',
        pink: '#e84393', grey: '#9a9a9a'
    };
    const PALETTE = ['#00c6b2','#0071de','#f9cb00','#e81818','#77b502','#9404c9','#0091c6','#d98e00','#e84393','#9a9a9a','#004f47','#005ab2'];
    const CAT_COLORS = {
        'Allgemein': '#00c6b2',
        'Bachelor': '#0071de',
        'Master': '#9404c9',
        'Studienform': '#d98e00',
        'Beratung & Service': '#77b502',
        'Hochschulbereiche': '#0091c6',
        'Standorte': '#f9cb00',
        'Sonstige': '#9a9a9a'
    };

    function render(id, config) {
        const el = document.getElementById(id);
        if (!el) return null;
        if (instances[id]) instances[id].destroy();
        instances[id] = new Chart(el, config);
        return instances[id];
    }

    function fmt(n) {
        return n.toLocaleString('de-DE');
    }

    function shortenPath(p) {
        return p.replace(/^\/de\//, '/').replace(/\.html$/, '').replace(/^\/hochschulbereiche\/[^/]+\//, '').split('/').pop() || p;
    }

    // ── Traffic Distribution: Category Donut ──
    function categoryDonut(id, pages, categories) {
        const catSessions = {};
        categories.forEach(c => catSessions[c] = 0);
        pages.forEach(p => {
            if (catSessions[p.category] !== undefined) catSessions[p.category] += p.sessions;
        });
        const labels = Object.keys(catSessions).filter(k => catSessions[k] > 0);
        const data = labels.map(k => catSessions[k]);
        const colors = labels.map(k => CAT_COLORS[k] || '#9a9a9a');

        render(id, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: colors, borderWidth: 3, borderColor: '#fff' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 10, weight: 'bold' } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = data.reduce((a, b) => a + b, 0);
                                return ctx.label + ': ' + fmt(ctx.raw) + ' (' + Math.round(ctx.raw / total * 100) + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    // ── Traffic Distribution: Bar List (HTML) ──
    function trafficBars(containerId, pages, categories, onSelect) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const sorted = [...pages].sort((a, b) => b.sessions - a.sessions);
        const maxSessions = sorted[0]?.sessions || 1;
        const top = sorted.slice(0, 25);

        let html = '<div class="traffic-bar-container">';
        top.forEach(p => {
            const pct = (p.sessions / maxSessions) * 100;
            const color = CAT_COLORS[p.category] || '#9a9a9a';
            const sessStr = p.sessions >= 1000 ? Math.round(p.sessions / 1000) + 'k' : p.sessions;
            html += `<div class="traffic-bar-row" data-path="${p.path}" title="${p.label} · ${fmt(p.sessions)} Sessions · ${p.category}">
                <div class="traffic-bar-label">${p.label}</div>
                <div class="traffic-bar-wrap">
                    <div class="traffic-bar-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                <div class="traffic-bar-value">${sessStr}</div>
            </div>`;
        });
        html += '</div>';
        el.innerHTML = html;

        if (onSelect) {
            el.querySelectorAll('.traffic-bar-row').forEach(row => {
                row.addEventListener('click', () => onSelect(row.dataset.path));
            });
        }
    }

    // ── Treemap ──
    function trafficTreemap(id, pages, categories, onSelect) {
        const sorted = [...pages].sort((a, b) => b.sessions - a.sessions).slice(0, 50);
        const treeData = sorted.map(p => ({
            label: p.label,
            sessions: p.sessions,
            category: p.category,
            path: p.path
        }));

        render(id, {
            type: 'treemap',
            data: {
                datasets: [{
                    tree: treeData,
                    key: 'sessions',
                    groups: ['category', 'label'],
                    backgroundColor: (ctx) => {
                        if (!ctx.raw || !ctx.raw._data) return '#e6e6e6';
                        const cat = ctx.raw._data.category || ctx.raw._data.label;
                        return (CAT_COLORS[cat] || COLORS.grey) + 'cc';
                    },
                    borderColor: '#fff',
                    borderWidth: 2,
                    spacing: 1,
                    labels: {
                        display: true,
                        align: 'center',
                        position: 'middle',
                        color: '#fff',
                        font: { size: 10, weight: 'bold' },
                        formatter: (ctx) => {
                            if (!ctx.raw || !ctx.raw._data) return '';
                            const label = ctx.raw._data.label || '';
                            const s = ctx.raw._data.sessions;
                            if (ctx.raw.w < 60 || ctx.raw.h < 25) return '';
                            const sessStr = s >= 1000 ? Math.round(s / 1000) + 'k' : s;
                            return label.length > 18 ? label.substring(0, 16) + '…' : label;
                        }
                    }
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const raw = items[0]?.raw;
                                if (!raw?._data) return '';
                                return raw._data.label || raw._data.category || '';
                            },
                            label: (ctx) => {
                                if (!ctx.raw?._data) return '';
                                return fmt(ctx.raw._data.sessions) + ' Sessions';
                            }
                        }
                    }
                },
                onClick: (evt, elements) => {
                    if (elements.length > 0 && onSelect) {
                        const raw = elements[0].element?.$context?.raw;
                        if (raw?._data?.path) onSelect(raw._data.path);
                    }
                }
            }
        });
    }

    // ── Tab: Übersicht / Traffic ──
    function trendLine(id, daily) {
        render(id, {
            type: 'line',
            data: {
                labels: daily.map(d => { const p = d.date.split('-'); return p[2] + '.' + p[1]; }),
                datasets: [
                    {
                        label: 'Seitenaufrufe', data: daily.map(d => d.pv),
                        borderColor: COLORS.primary, backgroundColor: 'rgba(0,198,178,0.08)',
                        fill: true, tension: 0.3, pointRadius: 1.5, pointHoverRadius: 5, borderWidth: 2
                    },
                    {
                        label: 'Sessions', data: daily.map(d => d.sessions),
                        borderColor: COLORS.secondary, backgroundColor: 'transparent',
                        fill: false, tension: 0.3, pointRadius: 1.5, pointHoverRadius: 5, borderWidth: 2,
                        borderDash: [5, 3]
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { weight: 'bold' } } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 15 } },
                    y: { beginAtZero: true, grid: { color: '#f2f0f0' } }
                }
            }
        });
    }

    // ── Traffic Tab: Metric-Switchable Trend ──
    function trendLineMetric(id, daily, metric) {
        const configs = {
            'pv-sessions': {
                datasets: [
                    { label: 'Seitenaufrufe', data: daily.map(d => d.pv), borderColor: COLORS.primary, backgroundColor: 'rgba(0,198,178,0.08)', fill: true },
                    { label: 'Sessions', data: daily.map(d => d.sessions), borderColor: COLORS.secondary, borderDash: [5, 3] }
                ],
                yFormat: v => fmt(v)
            },
            'bounce-engagement': {
                datasets: [
                    { label: 'Bounce Rate', data: daily.map(d => (d.bounceRate || 0) * 100), borderColor: COLORS.accent, backgroundColor: 'rgba(232,24,24,0.06)', fill: true },
                    { label: 'Engagement Rate', data: daily.map(d => (d.engRate || 0) * 100), borderColor: COLORS.success, borderDash: [5, 3] }
                ],
                yFormat: v => v.toFixed(1) + '%'
            },
            'users': {
                datasets: [
                    { label: 'Nutzer', data: daily.map(d => d.users), borderColor: COLORS.secondary, backgroundColor: 'rgba(0,113,222,0.08)', fill: true },
                    { label: 'Neue Nutzer', data: daily.map(d => d.newUsers || 0), borderColor: COLORS.highlight, borderDash: [5, 3] }
                ],
                yFormat: v => fmt(v)
            }
        };

        const cfg = configs[metric] || configs['pv-sessions'];
        const labels = daily.map(d => { const p = d.date.split('-'); return p[2] + '.' + p[1]; });

        const datasets = cfg.datasets.map(ds => ({
            ...ds,
            tension: 0.3, pointRadius: 1.5, pointHoverRadius: 5, borderWidth: 2,
            backgroundColor: ds.backgroundColor || 'transparent', fill: ds.fill || false
        }));

        render(id, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { weight: 'bold' } } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 15 } },
                    y: { beginAtZero: true, grid: { color: '#f2f0f0' }, ticks: { callback: cfg.yFormat } }
                }
            }
        });
    }

    // ── Tab: Quellen ──
    function sourcesDoughnut(id, sources) {
        const grouped = {};
        sources.forEach(s => { const ch = s.channel || 'Sonstige'; grouped[ch] = (grouped[ch] || 0) + s.sessions; });
        const labels = Object.keys(grouped);
        const data = Object.values(grouped);

        render(id, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: PALETTE.slice(0, labels.length), borderWidth: 3, borderColor: '#fff' }] },
            options: {
                responsive: true,
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } }
            }
        });
    }

    function paidVsOrganic(id, sources) {
        const buckets = { 'Paid': 0, 'Organic Search': 0, 'Direct': 0, 'Referral': 0, 'Sonstige': 0 };
        sources.forEach(s => {
            const ch = (s.channel || '').toLowerCase();
            if (ch.includes('paid') || ch.includes('cross-network') || ch.includes('display')) buckets['Paid'] += s.sessions;
            else if (ch.includes('organic')) buckets['Organic Search'] += s.sessions;
            else if (ch.includes('direct')) buckets['Direct'] += s.sessions;
            else if (ch.includes('referral')) buckets['Referral'] += s.sessions;
            else buckets['Sonstige'] += s.sessions;
        });
        const labels = Object.keys(buckets).filter(k => buckets[k] > 0);
        const data = labels.map(k => buckets[k]);
        const colors = [COLORS.accent, COLORS.success, COLORS.secondary, COLORS.primary, COLORS.grey];

        render(id, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Sessions', data, backgroundColor: colors.slice(0, labels.length), borderRadius: 8 }] },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => { const total = data.reduce((a, b) => a + b, 0); return fmt(ctx.raw) + ' Sessions (' + Math.round(ctx.raw / total * 100) + '%)'; } } }
                },
                scales: { x: { beginAtZero: true, grid: { color: '#f2f0f0' } }, y: { grid: { display: false } } }
            }
        });
    }

    // ── Tab: Geräte ──
    function deviceDoughnut(id, devices) {
        const labels = devices.map(d => d.device + ' (' + Math.round(d.sessions / devices.reduce((a, b) => a + b.sessions, 0) * 100) + '%)');
        render(id, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: devices.map(d => d.sessions), backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.highlight], borderWidth: 3, borderColor: '#fff' }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } } } }
        });
    }

    function deviceDuration(id, devices) {
        render(id, {
            type: 'bar',
            data: { labels: devices.map(d => d.device), datasets: [{ label: 'Ø Sitzungsdauer (Sek.)', data: devices.map(d => Math.round(d.avgDuration)), backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.highlight], borderRadius: 8 }] },
            options: {
                responsive: true, plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: '#f2f0f0' }, ticks: { callback: v => v + 's' } }, x: { grid: { display: false } } }
            }
        });
    }

    function citiesBar(id, cities) {
        const top = cities.slice(0, 10);
        render(id, {
            type: 'bar',
            data: { labels: top.map(c => c.city), datasets: [{ label: 'Sessions', data: top.map(c => c.sessions), backgroundColor: COLORS.primary, borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f2f0f0' } }, x: { grid: { display: false } } } }
        });
    }

    function eventsBar(id, events) {
        const all = events;
        render(id, {
            type: 'bar',
            data: { labels: all.map(e => e.name), datasets: [{ label: 'Anzahl', data: all.map(e => e.count), backgroundColor: PALETTE.slice(0, all.length), borderRadius: 8 }] },
            options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: '#f2f0f0' } }, y: { grid: { display: false } } } }
        });
    }

    // ── Tab: Conversions ──
    function funnelBar(id, funnel) {
        render(id, {
            type: 'bar',
            data: { labels: funnel.map(f => f.step), datasets: [{ label: 'Nutzer', data: funnel.map(f => f.count), backgroundColor: PALETTE.slice(0, funnel.length), borderRadius: 8 }] },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => { const total = funnel[0]?.count || 1; return fmt(ctx.raw) + ' (' + (ctx.raw / total * 100).toFixed(1) + '%)'; } } } },
                scales: { x: { beginAtZero: true, grid: { color: '#f2f0f0' } }, y: { grid: { display: false } } }
            }
        });
    }

    function conversionPagesBar(id, pages) {
        const top = pages.filter(p => p.conversions > 0).slice(0, 12);
        if (top.length === 0) return;
        render(id, {
            type: 'bar',
            data: { labels: top.map(p => shortenPath(p.page)), datasets: [{ label: 'Conversions', data: top.map(p => p.conversions), backgroundColor: COLORS.accent, borderRadius: 8 }] },
            options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: '#f2f0f0' }, ticks: { stepSize: 1 } }, y: { grid: { display: false } } } }
        });
    }

    // ── Conversion Rate by Source ──
    function convBySource(id, sources) {
        const buckets = {};
        sources.forEach(s => {
            const ch = s.channel || 'Sonstige';
            if (!buckets[ch]) buckets[ch] = { sessions: 0, conversions: 0 };
            buckets[ch].sessions += s.sessions;
            buckets[ch].conversions += (s.conversions || 0);
        });
        const entries = Object.entries(buckets)
            .map(([ch, d]) => ({ channel: ch, rate: d.sessions > 0 ? (d.conversions / d.sessions * 100) : 0, sessions: d.sessions, conversions: d.conversions }))
            .filter(e => e.sessions > 50)
            .sort((a, b) => b.rate - a.rate);

        if (entries.length === 0) return;

        render(id, {
            type: 'bar',
            data: {
                labels: entries.map(e => e.channel),
                datasets: [
                    { label: 'Conv. Rate (%)', data: entries.map(e => e.rate), backgroundColor: COLORS.primary, borderRadius: 8, yAxisID: 'y' },
                    { label: 'Sessions', data: entries.map(e => e.sessions), backgroundColor: COLORS.grey + '44', borderRadius: 8, yAxisID: 'y2' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { weight: 'bold' } } },
                    tooltip: { callbacks: { label: ctx => ctx.dataset.label === 'Conv. Rate (%)' ? ctx.raw.toFixed(2) + '%' : fmt(ctx.raw) + ' Sessions' } }
                },
                scales: {
                    y: { grid: { display: false } },
                    x: { beginAtZero: true, grid: { color: '#f2f0f0' }, ticks: { callback: v => v.toFixed(1) + '%' } },
                    y2: { display: false }
                }
            }
        });
    }

    // ── Sankey Diagram ──
    function sankeyChart(id, followUpPages, currentPageLabel) {
        if (!followUpPages || followUpPages.length === 0) return;

        const fromLabel = currentPageLabel || 'Landing Page';

        // Filter out self-references and entries with 0 users, take top 12
        const top = [...followUpPages]
            .filter(p => p.users > 0 && shortenPath(p.page) !== fromLabel && p.page !== '/')
            .sort((a, b) => b.users - a.users)
            .slice(0, 12);

        if (top.length === 0) return;

        // Ensure unique "to" labels (avoid duplicates)
        const usedLabels = new Set();
        const data = [];
        const labels = {};
        labels[fromLabel] = fromLabel;

        top.forEach(p => {
            let toLabel = shortenPath(p.page) || p.page;
            // Avoid duplicate labels
            if (usedLabels.has(toLabel)) toLabel = toLabel + ' (' + p.page.split('/').slice(-2, -1)[0] + ')';
            if (toLabel === fromLabel) toLabel = toLabel + ' (Seite)';
            usedLabels.add(toLabel);
            labels[toLabel] = toLabel;
            data.push({ from: fromLabel, to: toLabel, flow: p.users });
        });

        // Color map for nodes with conversions
        const convSet = new Set();
        top.forEach((p, i) => {
            if (p.conversions > 0) convSet.add(Array.from(usedLabels)[i]);
        });

        render(id, {
            type: 'sankey',
            data: {
                datasets: [{
                    label: 'Nutzer-Pfade',
                    data: data,
                    colorFrom: COLORS.primary,
                    colorTo: COLORS.secondary,
                    colorMode: 'gradient',
                    labels: labels,
                    size: 'max',
                    nodeWidth: 12,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                if (!ctx.raw) return '';
                                return ctx.raw.from + ' → ' + ctx.raw.to + ': ' + fmt(ctx.raw.flow) + ' Nutzer';
                            }
                        }
                    }
                }
            }
        });
    }

    // ── Export helpers ──
    function getChartImage(id) {
        return instances[id]?.toBase64Image() || null;
    }

    return {
        trendLine, trendLineMetric, sourcesDoughnut, paidVsOrganic,
        deviceDoughnut, deviceDuration, citiesBar,
        eventsBar, funnelBar, conversionPagesBar,
        categoryDonut, trafficBars, trafficTreemap,
        convBySource, sankeyChart, getChartImage,
        PALETTE, COLORS, CAT_COLORS
    };
})();
