// ── FOM · Build Your Analytics – Report Builder ──
const App = (() => {
    let DATA = null;
    let INDEX = null;
    let reportCounter = 0;

    function init(data, index) {
        DATA = data;
        INDEX = index;
        setupLogin();
        setupAskInput();
        setupBlocks();
    }

    // ── Login ──
    function setupLogin() {
        const input = document.getElementById('password-input');
        const btn = document.getElementById('login-btn');
        function check() {
            if (input.value === 'Fom!1991') {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
            } else {
                document.getElementById('login-error').style.display = 'block';
                input.value = '';
                input.focus();
            }
        }
        btn.addEventListener('click', check);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    }

    // ── AI Ask Input ──
    function setupAskInput() {
        const input = document.getElementById('ask-input');
        const btn = document.getElementById('ask-btn');
        const loading = document.getElementById('ask-loading');
        const keySetup = document.getElementById('key-setup');
        const keyInput = document.getElementById('key-input');
        const keySave = document.getElementById('key-save');

        // Show key setup if no key stored
        if (!AI.hasKey()) keySetup.style.display = 'flex';

        keySave.addEventListener('click', () => {
            const k = keyInput.value.trim();
            if (k) {
                AI.setKey(k);
                keySetup.style.display = 'none';
            }
        });

        keyInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') keySave.click();
        });

        async function ask() {
            const q = input.value.trim();
            if (!q) return;
            if (!AI.hasKey()) {
                keySetup.style.display = 'flex';
                keyInput.focus();
                return;
            }
            btn.disabled = true;
            loading.classList.add('visible');
            try {
                const config = await AI.ask(q);
                addReport(config);
                input.value = '';
            } catch (e) {
                console.error(e);
            }
            btn.disabled = false;
            loading.classList.remove('visible');
        }

        btn.addEventListener('click', ask);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
    }

    // ── Block Cards ──
    function setupBlocks() {
        document.querySelectorAll('.block-card').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.block;
                const configs = {
                    kpis: { type: 'kpis', pageFilter: 'all', title: 'Traffic-Überblick', subtitle: 'KPIs & Täglicher Trend' },
                    trend: { type: 'trend', pageFilter: 'all', title: 'Trend-Analyse', subtitle: 'Zeitlicher Verlauf der Metriken' },
                    funnel: { type: 'funnel', pageFilter: 'all', title: 'Conversion-Report', subtitle: 'Funnel & Schlüsselereignisse' },
                    sources: { type: 'sources', pageFilter: 'all', title: 'Traffic-Quellen', subtitle: 'Kanäle & Herkunft' },
                    devices: { type: 'devices', pageFilter: 'all', title: 'Geräte-Split', subtitle: 'Mobile, Desktop, Tablet' },
                    geo: { type: 'geo', pageFilter: 'all', title: 'Geo-Analyse', subtitle: 'Top-Städte nach Sessions' },
                    events: { type: 'events', pageFilter: 'all', title: 'Events', subtitle: 'Alle Interaktionen auf der Seite' },
                    topPages: { type: 'topPages', pageFilter: 'all', title: 'Top-Seiten', subtitle: 'Alle Seiten nach Sessions' }
                };
                addReport(configs[type] || configs.kpis);
            });
        });
    }

    // ── Data Helpers ──

    function getPage(pageFilter) {
        if (!pageFilter || pageFilter === 'all') return DATA.pages[0]; // Default: Startseite
        if (pageFilter.startsWith('category:')) {
            const cat = pageFilter.replace('category:', '');
            const catPages = INDEX.pages.filter(p => p.category === cat).sort((a, b) => b.sessions - a.sessions);
            if (catPages.length > 0) {
                return DATA.pages.find(p => p.path === catPages[0].path) || DATA.pages[0];
            }
            return DATA.pages[0];
        }
        if (pageFilter.startsWith('path:')) {
            const path = pageFilter.replace('path:', '');
            return DATA.pages.find(p => p.path === path) || DATA.pages[0];
        }
        // Try direct match
        return DATA.pages.find(p => p.path === pageFilter) ||
               DATA.pages.find(p => p.path.includes(pageFilter)) ||
               DATA.pages[0];
    }

    function filterDaily(page, dateRange) {
        if (!page?.daily) return [];
        const start = dateRange?.start || DATA.dateRange.start;
        const end = dateRange?.end || DATA.dateRange.end;
        return page.daily.filter(d => d.date >= start && d.date <= end);
    }

    function aggregateDaily(daily) {
        if (daily.length === 0) return { pv: 0, sessions: 0, users: 0, newUsers: 0, engRate: 0, bounceRate: 0, avgDuration: 0, conversions: 0 };
        const sum = (arr, key) => arr.reduce((a, d) => a + (d[key] || 0), 0);
        const avg = (arr, key) => arr.length ? arr.reduce((a, d) => a + (d[key] || 0), 0) / arr.length : 0;
        return {
            pv: sum(daily, 'pv'), sessions: sum(daily, 'sessions'),
            users: sum(daily, 'users'), newUsers: sum(daily, 'newUsers'),
            engRate: avg(daily, 'engRate'), bounceRate: avg(daily, 'bounceRate'),
            avgDuration: avg(daily, 'avgDuration'), conversions: sum(daily, 'conversions')
        };
    }

    function fmtNum(n) { return n.toLocaleString('de-DE'); }

    function getPageLabel(path) {
        const idx = INDEX.pages.find(p => p.path === path);
        return idx?.label || path;
    }

    // ── Build Page Selector ──
    function buildPageSelector(selected) {
        let html = '<select class="report-page-select">';
        DATA.pages.forEach(p => {
            const label = getPageLabel(p.path);
            const sel = p.path === selected ? ' selected' : '';
            html += '<option value="' + p.path + '"' + sel + '>' + label + '</option>';
        });
        html += '</select>';
        return html;
    }

    // ── Add Report Card ──
    function addReport(config) {
        const area = document.getElementById('report-area');
        const empty = document.getElementById('report-empty');
        if (empty) empty.style.display = 'none';

        const id = 'report-' + (++reportCounter);
        const page = getPage(config.pageFilter);
        const daily = filterDaily(page, config.dateRange);

        const card = document.createElement('div');
        card.className = 'report-card';
        card.id = id;

        // Header
        card.innerHTML = `
            <div class="report-card-header">
                <div>
                    <div class="report-card-title">${esc(config.title || 'Analyse')}</div>
                    <div class="report-card-subtitle">${esc(config.subtitle || '')}</div>
                </div>
                <div class="report-card-controls">
                    ${buildPageSelector(page.path)}
                    <button class="report-close" title="Entfernen">&times;</button>
                </div>
            </div>
            <div class="report-card-body" id="${id}-body"></div>
        `;

        area.insertBefore(card, area.firstChild);

        // Close button
        card.querySelector('.report-close').addEventListener('click', () => {
            card.remove();
            if (area.querySelectorAll('.report-card').length === 0 && empty) {
                empty.style.display = 'block';
            }
        });

        // Page selector change
        card.querySelector('.report-page-select').addEventListener('change', (e) => {
            const newPage = DATA.pages.find(p => p.path === e.target.value);
            if (newPage) renderReportBody(id + '-body', config.type, newPage, config.dateRange);
        });

        // Render body
        renderReportBody(id + '-body', config.type, page, config.dateRange);
    }

    // ── Render Report Body ──
    function renderReportBody(containerId, type, page, dateRange) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const daily = filterDaily(page, dateRange);
        const agg = aggregateDaily(daily);
        const days = daily.length || 1;

        el.innerHTML = ''; // Clear previous content

        switch (type) {
            case 'kpis':
                renderKPIs(el, agg, days);
                if (daily.length > 0) {
                    const trendDiv = addChartWrap(el, 'Täglicher Verlauf', 300);
                    Charts.trendLine(trendDiv.querySelector('canvas').id, daily);
                }
                break;

            case 'trend':
                renderKPIsMini(el, agg);
                const trendDiv = addChartWrap(el, 'Traffic-Trend', 320);
                if (daily.length > 0) Charts.trendLine(trendDiv.querySelector('canvas').id, daily);
                break;

            case 'sources':
                if (page.sources?.length) {
                    const grid = document.createElement('div');
                    grid.className = 'grid-2';
                    const d1 = addChartWrap(grid, 'Nach Kanal');
                    Charts.sourcesDoughnut(d1.querySelector('canvas').id, page.sources);
                    const d2 = addChartWrap(grid, 'Paid vs. Organic');
                    Charts.paidVsOrganic(d2.querySelector('canvas').id, page.sources);
                    el.appendChild(grid);
                    const tableDiv = document.createElement('div');
                    tableDiv.id = containerId + '-table';
                    el.appendChild(tableDiv);
                    Tables.sourcesTable(tableDiv.id, page.sources);
                } else {
                    el.innerHTML = '<div class="empty">Keine Quellen-Daten für diese Seite verfügbar.</div>';
                }
                break;

            case 'devices':
                if (page.devices?.length) {
                    const grid = document.createElement('div');
                    grid.className = 'grid-2';
                    const d1 = addChartWrap(grid, 'Geräteverteilung');
                    Charts.deviceDoughnut(d1.querySelector('canvas').id, page.devices);
                    const d2 = addChartWrap(grid, 'Ø Sitzungsdauer');
                    Charts.deviceDuration(d2.querySelector('canvas').id, page.devices);
                    el.appendChild(grid);
                } else {
                    el.innerHTML = '<div class="empty">Keine Geräte-Daten verfügbar.</div>';
                }
                break;

            case 'geo':
                if (page.cities?.length) {
                    const d = addChartWrap(el, 'Top-Städte nach Sessions');
                    Charts.citiesBar(d.querySelector('canvas').id, page.cities);
                } else {
                    el.innerHTML = '<div class="empty">Keine Geo-Daten verfügbar.</div>';
                }
                break;

            case 'events':
                if (page.events?.length) {
                    const d = addChartWrap(el, 'Alle Events');
                    Charts.eventsBar(d.querySelector('canvas').id, page.events);
                } else {
                    el.innerHTML = '<div class="empty">Keine Event-Daten verfügbar.</div>';
                }
                break;

            case 'funnel':
                if (page.conversions?.funnel?.length) {
                    const funnelData = page.conversions.funnel
                        .filter(f => f.count > 0 && f.step !== 'Sessions gesamt' && f.step !== 'Conversions')
                        .map(f => ({ step: f.step, count: f.count }))
                        .sort((a, b) => b.count - a.count);
                    if (funnelData.length > 0) {
                        const d = addChartWrap(el, 'Conversion-Funnel');
                        Charts.funnelBar(d.querySelector('canvas').id, funnelData);
                    }
                }
                if (page.conversions?.followUpPages?.length) {
                    const d = addChartWrap(el, 'Seiten mit Conversions');
                    Charts.conversionPagesBar(d.querySelector('canvas').id, page.conversions.followUpPages);
                }
                if (page.sources?.length) {
                    const d = addChartWrap(el, 'Conversion-Rate nach Quelle', 260);
                    Charts.convBySource(d.querySelector('canvas').id, page.sources);
                }
                if (!page.conversions?.funnel?.length) {
                    el.innerHTML = '<div class="empty">Keine Conversion-Daten verfügbar.</div>';
                }
                break;

            case 'paths':
                if (page.conversions?.followUpPages?.length) {
                    const d = addChartWrap(el, 'Nutzer-Pfade (Sankey)', 380);
                    Charts.sankeyChart(d.querySelector('canvas').id, page.conversions.followUpPages, getPageLabel(page.path));
                    const flowDiv = document.createElement('div');
                    flowDiv.id = containerId + '-flow';
                    el.appendChild(flowDiv);
                    Tables.flowTable(flowDiv.id, page.conversions.followUpPages);
                } else {
                    el.innerHTML = '<div class="empty">Keine Pfad-Daten verfügbar.</div>';
                }
                break;

            case 'topPages':
                const allPages = INDEX.pages
                    .sort((a, b) => b.sessions - a.sessions)
                    .map(p => ({ ...p, category: p.category || 'Sonstige' }));
                const barsDiv = document.createElement('div');
                barsDiv.id = containerId + '-bars';
                el.appendChild(barsDiv);
                Charts.trafficBars(barsDiv.id, allPages, INDEX.categories, (path) => {
                    // When clicking a page bar, add a KPI report for that page
                    const clickedPage = DATA.pages.find(p => p.path === path);
                    if (clickedPage) {
                        addReport({
                            type: 'kpis',
                            pageFilter: 'path:' + path,
                            title: getPageLabel(path),
                            subtitle: 'Detailanalyse'
                        });
                    }
                });
                break;

            case 'comparison':
                renderKPIs(el, agg, days);
                if (daily.length > 0) {
                    const td = addChartWrap(el, 'Verlauf', 280);
                    Charts.trendLine(td.querySelector('canvas').id, daily);
                }
                break;

            default:
                renderKPIs(el, agg, days);
                break;
        }
    }

    // ── Render Helpers ──

    function renderKPIs(container, agg, days) {
        const grid = document.createElement('div');
        grid.className = 'kpi-grid';
        grid.innerHTML = `
            <div class="kpi"><div class="kpi-label">Seitenaufrufe</div><div class="kpi-val">${fmtNum(agg.pv)}</div><div class="kpi-sub">Ø ${Math.round(agg.pv/days)}/Tag</div></div>
            <div class="kpi"><div class="kpi-label">Sessions</div><div class="kpi-val">${fmtNum(agg.sessions)}</div><div class="kpi-sub">Ø ${Math.round(agg.sessions/days)}/Tag</div></div>
            <div class="kpi"><div class="kpi-label">Nutzer</div><div class="kpi-val">${fmtNum(agg.users)}</div><div class="kpi-sub">${Math.round(agg.newUsers/Math.max(agg.users,1)*100)}% neu</div></div>
            <div class="kpi accent"><div class="kpi-label">Engagement</div><div class="kpi-val">${(agg.engRate*100).toFixed(1).replace('.',',')}%</div><div class="kpi-sub">Rate</div></div>
            <div class="kpi accent"><div class="kpi-label">Bounce</div><div class="kpi-val">${(agg.bounceRate*100).toFixed(1).replace('.',',')}%</div><div class="kpi-sub">Rate</div></div>
            <div class="kpi"><div class="kpi-label">Ø Dauer</div><div class="kpi-val">${Math.round(agg.avgDuration)}s</div><div class="kpi-sub">Sitzung</div></div>
            <div class="kpi"><div class="kpi-label">Seiten/Sitzung</div><div class="kpi-val">${agg.sessions > 0 ? (agg.pv/agg.sessions).toFixed(1).replace('.',',') : '–'}</div><div class="kpi-sub">Navigation</div></div>
            <div class="kpi ${agg.conversions > 0 ? 'accent' : 'danger'}"><div class="kpi-label">Conversions</div><div class="kpi-val">${fmtNum(agg.conversions)}</div><div class="kpi-sub">${agg.sessions > 0 ? (agg.conversions/agg.sessions*100).toFixed(1).replace('.',',') + '%' : '–'}</div></div>
        `;
        container.appendChild(grid);
    }

    function renderKPIsMini(container, agg) {
        const grid = document.createElement('div');
        grid.className = 'kpi-grid';
        grid.innerHTML = `
            <div class="kpi"><div class="kpi-label">Sessions</div><div class="kpi-val">${fmtNum(agg.sessions)}</div></div>
            <div class="kpi"><div class="kpi-label">Nutzer</div><div class="kpi-val">${fmtNum(agg.users)}</div></div>
            <div class="kpi accent"><div class="kpi-label">Engagement</div><div class="kpi-val">${(agg.engRate*100).toFixed(1).replace('.',',')}%</div></div>
            <div class="kpi ${agg.conversions > 0 ? 'accent' : ''}"><div class="kpi-label">Conversions</div><div class="kpi-val">${fmtNum(agg.conversions)}</div></div>
        `;
        container.appendChild(grid);
    }

    function addChartWrap(container, title, height) {
        const wrap = document.createElement('div');
        wrap.className = 'chart-wrap';
        const canvasId = 'chart-' + (++reportCounter) + '-' + Math.random().toString(36).substr(2, 5);
        wrap.innerHTML = '<h3>' + esc(title) + '</h3>' +
            (height ? '<div style="height:' + height + 'px">' : '<div>') +
            '<canvas id="' + canvasId + '"></canvas></div>';
        container.appendChild(wrap);
        return wrap;
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    return { init };
})();
