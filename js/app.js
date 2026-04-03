// ── FOM Web-Analyse App ──
const App = (() => {
    let DATA = null;       // detailed data (data.json)
    let INDEX = null;      // all pages index (pages-index.json)
    let state = {
        pagePath: '',
        dateStart: '',
        dateEnd: '',
        activeTab: 'overview'
    };

    // ── Init ──
    function init(detailedData, pageIndex) {
        DATA = detailedData;
        INDEX = pageIndex;
        state.dateStart = DATA.dateRange.start;
        state.dateEnd = DATA.dateRange.end;

        setupLogin();
        populateDropdown();
        setupDatepicker();
        setupTabs();
        setupPresets();
    }

    // ── Login ──
    function setupLogin() {
        const input = document.getElementById('password-input');
        const btn = document.getElementById('login-btn');

        function check() {
            if (input.value === 'Fom!1991') {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                renderAll();
            } else {
                document.getElementById('login-error').style.display = 'block';
                input.value = '';
                input.focus();
            }
        }

        btn.addEventListener('click', check);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    }

    // ── Dropdown with optgroups ──
    function populateDropdown() {
        const sel = document.getElementById('page-select');
        const categories = INDEX.categories;
        const pages = INDEX.pages;

        // Group pages by category
        const groups = {};
        categories.forEach(cat => groups[cat] = []);
        pages.forEach(p => {
            if (groups[p.category]) groups[p.category].push(p);
        });

        // Build optgroups
        categories.forEach(cat => {
            const items = groups[cat];
            if (!items || items.length === 0) return;

            const optgroup = document.createElement('optgroup');
            optgroup.label = cat + ' (' + items.length + ')';

            items.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.path;
                const sessions = p.sessions >= 1000 ? Math.round(p.sessions / 1000) + 'k' : p.sessions;
                opt.textContent = p.label + '  ·  ' + sessions + ' Sessions';
                // Mark pages with detailed data
                const hasDetail = DATA.pages.some(dp => dp.path === p.path);
                if (!hasDetail) opt.style.color = '#999';
                sel.appendChild(opt);
            });

            sel.appendChild(optgroup);
        });

        // Select first page
        if (DATA.pages.length > 0) {
            state.pagePath = DATA.pages[0].path;
            sel.value = state.pagePath;
        }

        sel.addEventListener('change', () => {
            state.pagePath = sel.value;
            renderAll();
        });
    }

    // ── Datepicker ──
    function setupDatepicker() {
        const startEl = document.getElementById('date-start');
        const endEl = document.getElementById('date-end');
        const applyBtn = document.getElementById('date-apply');

        startEl.value = state.dateStart;
        endEl.value = state.dateEnd;
        startEl.min = DATA.dateRange.start;
        startEl.max = DATA.dateRange.end;
        endEl.min = DATA.dateRange.start;
        endEl.max = DATA.dateRange.end;

        applyBtn.addEventListener('click', () => {
            state.dateStart = startEl.value;
            state.dateEnd = endEl.value;
            clearPresetActive();
            renderAll();
        });
    }

    // ── Presets ──
    function setupPresets() {
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const days = parseInt(btn.dataset.days);
                const end = new Date(DATA.dateRange.end);
                const start = new Date(end);

                if (days === 0) {
                    document.getElementById('date-start').value = DATA.dateRange.start;
                    document.getElementById('date-end').value = DATA.dateRange.end;
                    state.dateStart = DATA.dateRange.start;
                    state.dateEnd = DATA.dateRange.end;
                } else {
                    start.setDate(end.getDate() - days);
                    const s = start.toISOString().split('T')[0];
                    document.getElementById('date-start').value = s;
                    document.getElementById('date-end').value = DATA.dateRange.end;
                    state.dateStart = s;
                    state.dateEnd = DATA.dateRange.end;
                }

                clearPresetActive();
                btn.classList.add('active');
                renderAll();
            });
        });
    }

    function clearPresetActive() {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    }

    // ── Tabs ──
    function setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.activeTab = btn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById('tab-' + state.activeTab).classList.add('active');
                renderTab(state.activeTab);
            });
        });
    }

    // ── Get current page data ──
    function getDetailedPage() {
        return DATA.pages.find(p => p.path === state.pagePath);
    }

    function getIndexPage() {
        return INDEX.pages.find(p => p.path === state.pagePath);
    }

    function getFilteredDaily() {
        const page = getDetailedPage();
        if (!page || !page.daily) return [];
        return page.daily.filter(d => d.date >= state.dateStart && d.date <= state.dateEnd);
    }

    function aggregateDaily(daily) {
        if (daily.length === 0) return { pv: 0, sessions: 0, users: 0, newUsers: 0, engRate: 0, bounceRate: 0, avgDuration: 0, conversions: 0 };
        const sum = (arr, key) => arr.reduce((a, d) => a + (d[key] || 0), 0);
        const avg = (arr, key) => arr.length ? arr.reduce((a, d) => a + (d[key] || 0), 0) / arr.length : 0;
        return {
            pv: sum(daily, 'pv'),
            sessions: sum(daily, 'sessions'),
            users: sum(daily, 'users'),
            newUsers: sum(daily, 'newUsers'),
            engRate: avg(daily, 'engRate'),
            bounceRate: avg(daily, 'bounceRate'),
            avgDuration: avg(daily, 'avgDuration'),
            conversions: sum(daily, 'conversions')
        };
    }

    // ── Render ──
    function renderAll() {
        const detailed = getDetailedPage();
        const indexPage = getIndexPage();
        const noDataBanner = document.getElementById('no-data-banner');

        if (!detailed && indexPage) {
            // Show basic info from index
            if (noDataBanner) {
                noDataBanner.style.display = 'block';
                noDataBanner.querySelector('.page-name').textContent = indexPage.label;
                noDataBanner.querySelector('.page-sessions').textContent = fmtNum(indexPage.sessions);
            }
            setText('kpi-pv', '–');
            setText('kpi-pv-sub', '');
            setText('kpi-sessions', fmtNum(indexPage.sessions));
            setText('kpi-sessions-sub', 'Gesamtzeitraum');
            setText('kpi-users', '–');
            setText('kpi-users-sub', '');
            setText('kpi-engagement', '–');
            setText('kpi-bounce', '–');
            setText('kpi-duration', '–');
            setText('kpi-pages', '–');
            setText('kpi-conversions', '–');
            setText('kpi-conversions-sub', '');
            clearCharts();
        } else {
            if (noDataBanner) noDataBanner.style.display = 'none';
            renderKPIs();
            renderTab(state.activeTab);
        }
    }

    function clearCharts() {
        // Clear all chart canvases and tables
        ['chart-trend','chart-traffic-trend','chart-sources-donut','chart-paid-organic',
         'chart-device-donut','chart-device-duration','chart-cities','chart-events',
         'chart-funnel','chart-conv-pages'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const ctx = el.getContext('2d');
                ctx.clearRect(0, 0, el.width, el.height);
            }
        });
        ['table-sources','table-followup','flow-container'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<div class="empty-state">Detaildaten für diese Seite nicht verfügbar. Nur Sessions-Gesamtzahl aus GA4 vorhanden.</div>';
        });
    }

    function renderKPIs() {
        const daily = getFilteredDaily();
        const agg = aggregateDaily(daily);
        const days = daily.length || 1;

        setText('kpi-pv', fmtNum(agg.pv));
        setText('kpi-pv-sub', 'Ø ' + Math.round(agg.pv / days) + '/Tag');
        setText('kpi-sessions', fmtNum(agg.sessions));
        setText('kpi-sessions-sub', 'Ø ' + Math.round(agg.sessions / days) + '/Tag');
        setText('kpi-users', fmtNum(agg.users));
        setText('kpi-users-sub', Math.round(agg.newUsers / Math.max(agg.users, 1) * 100) + '% neue Nutzer');
        setText('kpi-engagement', (agg.engRate * 100).toFixed(1).replace('.', ',') + '%');
        setText('kpi-bounce', (agg.bounceRate * 100).toFixed(1).replace('.', ',') + '%');
        setText('kpi-duration', Math.round(agg.avgDuration) + 's');
        setText('kpi-pages', agg.sessions > 0 ? (agg.pv / agg.sessions).toFixed(2).replace('.', ',') : '–');
        setText('kpi-conversions', fmtNum(agg.conversions));

        const convRate = agg.sessions > 0 ? (agg.conversions / agg.sessions * 100).toFixed(1).replace('.', ',') + '%' : '–';
        setText('kpi-conversions-sub', convRate + ' Conv. Rate');

        const convCard = document.getElementById('kpi-conversions')?.closest('.kpi-card');
        if (convCard) {
            convCard.className = 'kpi-card ' + (agg.conversions > 0 ? 'highlight' : 'danger');
        }
    }

    function renderTab(tab) {
        const page = getDetailedPage();
        if (!page) return;
        const daily = getFilteredDaily();

        switch (tab) {
            case 'overview':
                Charts.trendLine('chart-trend', daily);
                break;
            case 'traffic':
                Charts.trendLine('chart-traffic-trend', daily);
                break;
            case 'sources':
                if (page.sources?.length) {
                    Charts.sourcesDoughnut('chart-sources-donut', page.sources);
                    Charts.paidVsOrganic('chart-paid-organic', page.sources);
                    Tables.sourcesTable('table-sources', page.sources);
                }
                break;
            case 'devices':
                if (page.devices?.length) {
                    Charts.deviceDoughnut('chart-device-donut', page.devices);
                    Charts.deviceDuration('chart-device-duration', page.devices);
                }
                if (page.cities?.length) Charts.citiesBar('chart-cities', page.cities);
                if (page.events?.length) Charts.eventsBar('chart-events', page.events);
                break;
            case 'conversions':
                if (page.conversions?.funnel?.length) Charts.funnelBar('chart-funnel', page.conversions.funnel);
                if (page.conversions?.followUpPages?.length) {
                    Charts.conversionPagesBar('chart-conv-pages', page.conversions.followUpPages);
                    Tables.followUpTable('table-followup', page.conversions.followUpPages);
                }
                break;
            case 'paths':
                if (page.conversions?.followUpPages?.length) {
                    Tables.flowTable('flow-container', page.conversions.followUpPages);
                }
                break;
        }
    }

    // ── Helpers ──
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function fmtNum(n) {
        return n.toLocaleString('de-DE');
    }

    return { init };
})();
