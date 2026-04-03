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
        if (!el) return;
        if (instances[id]) instances[id].destroy();
        instances[id] = new Chart(el, config);
    }

    function fmt(n) {
        return n.toLocaleString('de-DE');
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
                responsive: true,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, padding: 12, font: { size: 11, weight: 'bold' } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = data.reduce((a, b) => a + b, 0);
                                return ctx.label + ': ' + fmt(ctx.raw) + ' Sessions (' + Math.round(ctx.raw / total * 100) + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    // ── Traffic Distribution: Bar List (HTML, not Chart.js) ──
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

        // Click handler
        if (onSelect) {
            el.querySelectorAll('.traffic-bar-row').forEach(row => {
                row.addEventListener('click', () => {
                    onSelect(row.dataset.path);
                });
            });
        }
    }

    // ── Tab: Übersicht ──
    function trendLine(id, daily) {
        render(id, {
            type: 'line',
            data: {
                labels: daily.map(d => {
                    const p = d.date.split('-');
                    return p[2] + '.' + p[1];
                }),
                datasets: [
                    {
                        label: 'Seitenaufrufe',
                        data: daily.map(d => d.pv),
                        borderColor: COLORS.primary,
                        backgroundColor: 'rgba(0,198,178,0.08)',
                        fill: true, tension: 0.3, pointRadius: 1.5,
                        pointHoverRadius: 5, borderWidth: 2, yAxisID: 'y'
                    },
                    {
                        label: 'Sessions',
                        data: daily.map(d => d.sessions),
                        borderColor: COLORS.secondary,
                        backgroundColor: 'transparent',
                        fill: false, tension: 0.3, pointRadius: 1.5,
                        pointHoverRadius: 5, borderWidth: 2,
                        borderDash: [5, 3], yAxisID: 'y'
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

    // ── Tab: Quellen ──
    function sourcesDoughnut(id, sources) {
        const grouped = {};
        sources.forEach(s => {
            const ch = s.channel || 'Sonstige';
            grouped[ch] = (grouped[ch] || 0) + s.sessions;
        });
        const labels = Object.keys(grouped);
        const data = Object.values(grouped);

        render(id, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: PALETTE.slice(0, labels.length), borderWidth: 3, borderColor: '#fff' }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } }
                }
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
            data: {
                labels,
                datasets: [{ label: 'Sessions', data, backgroundColor: colors.slice(0, labels.length), borderRadius: 8 }]
            },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = data.reduce((a, b) => a + b, 0);
                                return fmt(ctx.raw) + ' Sessions (' + Math.round(ctx.raw / total * 100) + '%)';
                            }
                        }
                    }
                },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f2f0f0' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // ── Tab: Geräte ──
    function deviceDoughnut(id, devices) {
        const labels = devices.map(d => d.device + ' (' + Math.round(d.sessions / devices.reduce((a, b) => a + b.sessions, 0) * 100) + '%)');
        render(id, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: devices.map(d => d.sessions), backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.highlight], borderWidth: 3, borderColor: '#fff' }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } } }
            }
        });
    }

    function deviceDuration(id, devices) {
        render(id, {
            type: 'bar',
            data: {
                labels: devices.map(d => d.device),
                datasets: [{
                    label: 'Ø Sitzungsdauer (Sek.)',
                    data: devices.map(d => Math.round(d.avgDuration)),
                    backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.highlight],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f2f0f0' }, ticks: { callback: v => v + 's' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function citiesBar(id, cities) {
        const top = cities.slice(0, 10);
        render(id, {
            type: 'bar',
            data: {
                labels: top.map(c => c.city),
                datasets: [{
                    label: 'Sessions',
                    data: top.map(c => c.sessions),
                    backgroundColor: COLORS.primary,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f2f0f0' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // ── Tab: Events ──
    function eventsBar(id, events) {
        const all = events.slice(0, 8);
        render(id, {
            type: 'bar',
            data: {
                labels: all.map(e => e.name),
                datasets: [{
                    label: 'Anzahl',
                    data: all.map(e => e.count),
                    backgroundColor: PALETTE.slice(0, all.length),
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f2f0f0' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // ── Tab: Conversions ──
    function funnelBar(id, funnel) {
        render(id, {
            type: 'bar',
            data: {
                labels: funnel.map(f => f.step),
                datasets: [{
                    label: 'Nutzer',
                    data: funnel.map(f => f.count),
                    backgroundColor: PALETTE.slice(0, funnel.length),
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = funnel[0]?.count || 1;
                                return fmt(ctx.raw) + ' (' + Math.round(ctx.raw / total * 100 * 10) / 10 + '%)';
                            }
                        }
                    }
                },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f2f0f0' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    function conversionPagesBar(id, pages) {
        const top = pages.filter(p => p.conversions > 0).slice(0, 12);
        if (top.length === 0) return;
        render(id, {
            type: 'bar',
            data: {
                labels: top.map(p => p.page.replace(/^\/de\//, '/').replace(/\.html$/, '').split('/').pop() || p.page),
                datasets: [{
                    label: 'Conversions',
                    data: top.map(p => p.conversions),
                    backgroundColor: COLORS.accent,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f2f0f0' }, ticks: { stepSize: 1 } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    return {
        trendLine, sourcesDoughnut, paidVsOrganic,
        deviceDoughnut, deviceDuration, citiesBar,
        eventsBar, funnelBar, conversionPagesBar,
        categoryDonut, trafficBars,
        PALETTE, COLORS, CAT_COLORS
    };
})();
