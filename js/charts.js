// ── Chart Manager ──
const Charts = (() => {
    const instances = {};
    const COLORS = {
        primary: '#003366', primaryLight: '#004d99', accent: '#e63946',
        success: '#2ecc71', warning: '#f39c12', blue: '#3498db',
        purple: '#9b59b6', orange: '#e67e22', teal: '#1abc9c',
        pink: '#e84393', grey: '#95a5a6'
    };
    const PALETTE = ['#003366','#e63946','#2ecc71','#f39c12','#3498db','#9b59b6','#e67e22','#1abc9c','#e84393','#95a5a6','#34495e','#c0392b'];

    function render(id, config) {
        const el = document.getElementById(id);
        if (!el) return;
        if (instances[id]) instances[id].destroy();
        instances[id] = new Chart(el, config);
    }

    function fmt(n) {
        return n.toLocaleString('de-DE');
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
                        backgroundColor: 'rgba(0,51,102,0.08)',
                        fill: true, tension: 0.3, pointRadius: 1.5,
                        pointHoverRadius: 5, borderWidth: 2, yAxisID: 'y'
                    },
                    {
                        label: 'Sessions',
                        data: daily.map(d => d.sessions),
                        borderColor: COLORS.accent,
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
                    legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 15 } },
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' } }
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
                datasets: [{ data, backgroundColor: PALETTE.slice(0, labels.length), borderWidth: 2, borderColor: '#fff' }]
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
        const colors = [COLORS.accent, COLORS.success, COLORS.blue, COLORS.teal, COLORS.grey];

        render(id, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ label: 'Sessions', data, backgroundColor: colors.slice(0, labels.length), borderRadius: 6 }]
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
                    x: { beginAtZero: true, grid: { color: '#f0f0f0' } },
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
                datasets: [{ data: devices.map(d => d.sessions), backgroundColor: [COLORS.primary, COLORS.accent, COLORS.warning], borderWidth: 2, borderColor: '#fff' }]
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
                    backgroundColor: [COLORS.primary, COLORS.accent, COLORS.warning],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { callback: v => v + 's' } },
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
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // ── Tab: Events ──
    function eventsBar(id, events) {
        const filtered = events.filter(e => e.name !== 'page_view' && e.name !== 'session_start' && e.name !== 'first_visit');
        const all = events.slice(0, 8);
        render(id, {
            type: 'bar',
            data: {
                labels: all.map(e => e.name),
                datasets: [{
                    label: 'Anzahl',
                    data: all.map(e => e.count),
                    backgroundColor: PALETTE.slice(0, all.length),
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f0f0f0' } },
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
                    borderRadius: 6
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
                    x: { beginAtZero: true, grid: { color: '#f0f0f0' } },
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
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { stepSize: 1 } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    return {
        trendLine, sourcesDoughnut, paidVsOrganic,
        deviceDoughnut, deviceDuration, citiesBar,
        eventsBar, funnelBar, conversionPagesBar,
        PALETTE, COLORS
    };
})();
