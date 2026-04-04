// ── FOM Webseite Analyse App ──
const App = (() => {
    let DATA = null;
    let INDEX = null;
    let state = {
        pagePath: '',
        dateStart: '',
        dateEnd: '',
        activeTab: 'overview',
        selectedConversions: new Set(),
        trafficMetric: 'pv-sessions'
    };

    // Tabs where date filter has no effect
    const NON_DATE_TABS = ['sources', 'devices', 'conversions', 'paths'];

    // ── Conversion definitions ──
    const KEY_CONVERSIONS = {
        'thank-you-page-anmeldung': 'Online-Anmeldung',
        'thank-you-page-infomaterial': 'Infomaterial-Bestellung',
        'thank-you-page-dualmatch': 'DualMatch-Anfrage',
        'anmeldung': 'Anmeldung (Formular)',
        'studienberatung': 'Studienberatung',
        'studienberatung-oa': 'Studienberatung (Online)'
    };

    const GENERAL_CONVERSIONS = {
        'Sessions gesamt': 'Sessions',
        'Conversions': 'Gesamt-Conversions',
        'bachelor': 'Bachelor-Seiten',
        'master': 'Master-Seiten',
        'dual': 'Dual-Seiten',
        'studiengangsfinder': 'Studiengangsfinder',
        'sofortcheck': 'Sofortcheck',
        'kontakt': 'Kontakt',
        '/info-material/': 'Infomaterial-Seite',
        '/': 'Startseite',
        'de': 'DE-Seite',
        'last-call-bachelor': 'Last Call Bachelor',
        'last-call-bachelor-dual': 'Last Call Dual',
        'international-master': 'Internat. Master',
        '120-ects-master': '120-ECTS Master',
        '90-ects-master': '90-ECTS Master',
        '60-ects-master': '60-ECTS Master',
        'business-administration-ba': 'Business Admin. (BA)'
    };

    const ALL_CONV_LABELS = { ...KEY_CONVERSIONS, ...GENERAL_CONVERSIONS };

    // ── Init ──
    function init(detailedData, pageIndex) {
        DATA = detailedData;
        INDEX = pageIndex;
        state.dateStart = DATA.dateRange.start;
        state.dateEnd = DATA.dateRange.end;

        Object.keys(KEY_CONVERSIONS).forEach(k => state.selectedConversions.add(k));

        setupLogin();
        setupFilterToggle();
        populateDropdown();
        setupDatepicker();
        setupTabs();
        setupPresets();
        setupConversionFilter();
        setupMetricToggle();
        updateDateDimming();
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

    // ── Mobile Filter Toggle ──
    function setupFilterToggle() {
        const toggle = document.getElementById('filter-toggle');
        const bar = document.getElementById('filter-bar');
        if (toggle && bar) {
            toggle.addEventListener('click', () => {
                bar.classList.toggle('open');
                toggle.textContent = bar.classList.contains('open') ? 'Filter ▴' : 'Filter ▾';
            });
        }
    }

    // ── Date Filter Dimming ──
    function updateDateDimming() {
        const dates = document.getElementById('filter-dates');
        if (dates) {
            dates.classList.toggle('dimmed', NON_DATE_TABS.includes(state.activeTab));
        }
    }

    // ── Page Dropdowns ──
    const SUB_CATEGORIES = ['Bachelor', 'Master'];

    function getMainPages() {
        const pages = INDEX.pages;
        const mainPages = [];

        INDEX.categories.forEach(cat => {
            const catPages = pages.filter(p => p.category === cat);
            if (catPages.length === 0) return;

            if (SUB_CATEGORIES.includes(cat)) {
                const overviews = catPages.filter(p =>
                    p.path.includes('bachelor.html') || p.path.includes('master.html') ||
                    p.label.toLowerCase().includes('alle ') || p.label.toLowerCase().includes('übersicht')
                );
                (overviews.length > 0 ? overviews : [catPages[0]]).forEach(p => mainPages.push({ ...p, _cat: cat }));
            } else {
                catPages.forEach(p => mainPages.push({ ...p, _cat: cat }));
            }
        });

        return mainPages;
    }

    function getSubPages(category) {
        return INDEX.pages
            .filter(p => p.category === category)
            .filter(p => {
                const l = p.label.toLowerCase();
                return !l.includes('alle ') && !l.includes('übersicht');
            })
            .sort((a, b) => b.sessions - a.sessions);
    }

    function populateDropdown() {
        const sel = document.getElementById('page-select');
        const subSel = document.getElementById('sub-select');
        const mainPages = getMainPages();

        const groups = {};
        INDEX.categories.forEach(cat => groups[cat] = []);
        mainPages.forEach(p => { if (groups[p._cat]) groups[p._cat].push(p); });

        INDEX.categories.forEach(cat => {
            const items = groups[cat];
            if (!items || items.length === 0) return;
            const optgroup = document.createElement('optgroup');
            optgroup.label = cat;
            items.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.path;
                opt.dataset.category = p._cat;
                const sessions = p.sessions >= 1000 ? Math.round(p.sessions / 1000) + 'k' : p.sessions;
                opt.textContent = p.label + '  ·  ' + sessions + ' Sessions';
                if (!DATA.pages.some(dp => dp.path === p.path)) opt.style.color = '#9a9a9a';
                optgroup.appendChild(opt);
            });
            sel.appendChild(optgroup);
        });

        if (DATA.pages.length > 0) {
            state.pagePath = DATA.pages[0].path;
            sel.value = state.pagePath;
        }

        sel.addEventListener('change', () => {
            const opt = sel.options[sel.selectedIndex];
            state.pagePath = sel.value;
            updateSubDropdown(opt?.dataset?.category);
            renderAll();
        });

        subSel.addEventListener('change', () => {
            if (subSel.value) {
                state.pagePath = subSel.value;
                renderAll();
            }
        });

        const initOpt = sel.options[sel.selectedIndex];
        updateSubDropdown(initOpt?.dataset?.category);
    }

    function updateSubDropdown(category) {
        const subSel = document.getElementById('sub-select');
        const subGroup = document.getElementById('sub-select-group');

        if (!category || !SUB_CATEGORIES.includes(category)) {
            subGroup.style.display = 'none';
            return;
        }

        const subPages = getSubPages(category);
        if (subPages.length === 0) { subGroup.style.display = 'none'; return; }

        subSel.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '– ' + category + '-Studiengang wählen –';
        subSel.appendChild(defaultOpt);

        subPages.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.path;
            const sessions = p.sessions >= 1000 ? Math.round(p.sessions / 1000) + 'k' : p.sessions;
            opt.textContent = p.label + '  ·  ' + sessions + ' Sessions';
            if (!DATA.pages.some(dp => dp.path === p.path)) opt.style.color = '#9a9a9a';
            subSel.appendChild(opt);
        });

        subGroup.style.display = 'flex';
        subSel.value = '';
    }

    function selectPage(path) {
        const sel = document.getElementById('page-select');
        const subSel = document.getElementById('sub-select');

        const mainOpt = Array.from(sel.options).find(o => o.value === path);
        if (mainOpt) {
            state.pagePath = path;
            sel.value = path;
            updateSubDropdown(mainOpt.dataset?.category);
        } else {
            const indexPage = INDEX.pages.find(p => p.path === path);
            if (indexPage && SUB_CATEGORIES.includes(indexPage.category)) {
                const overviewOpt = Array.from(sel.options).find(o => o.dataset?.category === indexPage.category);
                if (overviewOpt) {
                    sel.value = overviewOpt.value;
                    updateSubDropdown(indexPage.category);
                    subSel.value = path;
                }
            }
            state.pagePath = path;
        }

        renderAll();
    }

    // ── Conversion Filter ──
    function setupConversionFilter() {
        const keyContainer = document.getElementById('conv-chips-key');
        const generalContainer = document.getElementById('conv-chips-general');

        const availableSteps = new Set();
        DATA.pages.forEach(p => {
            if (p.conversions?.funnel) {
                p.conversions.funnel.forEach(f => availableSteps.add(f.step));
            }
        });

        Object.entries(KEY_CONVERSIONS).forEach(([step, label]) => {
            if (!availableSteps.has(step)) return;
            keyContainer.appendChild(createChip(step, label, true));
        });

        Object.entries(GENERAL_CONVERSIONS).forEach(([step, label]) => {
            if (!availableSteps.has(step)) return;
            generalContainer.appendChild(createChip(step, label, false));
        });
    }

    function createChip(step, label, isKey) {
        const chip = document.createElement('span');
        chip.className = 'chip' + (isKey ? ' key-chip' : '') + (state.selectedConversions.has(step) ? ' active' : '');
        chip.dataset.step = step;
        chip.textContent = label;

        chip.addEventListener('click', () => {
            if (state.selectedConversions.has(step)) {
                state.selectedConversions.delete(step);
                chip.classList.remove('active');
            } else {
                state.selectedConversions.add(step);
                chip.classList.add('active');
            }
            if (state.activeTab === 'conversions') renderTab('conversions');
        });

        return chip;
    }

    // ── Metric Toggle ──
    function setupMetricToggle() {
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.trafficMetric = btn.dataset.metric;
                if (state.activeTab === 'traffic') renderTab('traffic');
            });
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
                document.querySelectorAll('.tab-panel').forEach(c => c.classList.remove('active'));
                document.getElementById('tab-' + state.activeTab).classList.add('active');
                updateDateDimming();
                renderTab(state.activeTab);
            });
        });
    }

    // ── Data Helpers ──
    function getDetailedPage() { return DATA.pages.find(p => p.path === state.pagePath); }
    function getIndexPage() { return INDEX.pages.find(p => p.path === state.pagePath); }

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
            pv: sum(daily, 'pv'), sessions: sum(daily, 'sessions'),
            users: sum(daily, 'users'), newUsers: sum(daily, 'newUsers'),
            engRate: avg(daily, 'engRate'), bounceRate: avg(daily, 'bounceRate'),
            avgDuration: avg(daily, 'avgDuration'), conversions: sum(daily, 'conversions')
        };
    }

    function filterConversionFunnel(funnel) {
        if (!funnel) return [];
        if (state.selectedConversions.size === 0) return [];
        return funnel
            .filter(f => state.selectedConversions.has(f.step))
            .map(f => ({ step: ALL_CONV_LABELS[f.step] || f.step, count: f.count }));
    }

    function getTrafficDistPages() {
        const isFullRange = state.dateStart === DATA.dateRange.start && state.dateEnd === DATA.dateRange.end;

        const detailedPages = DATA.pages.map(dp => {
            const daily = dp.daily ? dp.daily.filter(d => d.date >= state.dateStart && d.date <= state.dateEnd) : [];
            const sessions = daily.reduce((sum, d) => sum + (d.sessions || 0), 0);
            const indexEntry = INDEX.pages.find(ip => ip.path === dp.path);
            return {
                path: dp.path,
                label: indexEntry?.label || dp.label || dp.path,
                sessions, category: indexEntry?.category || 'Sonstige'
            };
        });

        if (isFullRange) {
            const detailedPaths = new Set(detailedPages.map(p => p.path));
            const otherPages = INDEX.pages.filter(p => !detailedPaths.has(p.path));
            return [...detailedPages, ...otherPages].sort((a, b) => b.sessions - a.sessions);
        }
        return detailedPages.sort((a, b) => b.sessions - a.sessions);
    }

    // ── KPI Renderers (tab-specific) ──

    function renderOverviewKPIs(agg, days) {
        setText('kpi-ov-pv', fmtNum(agg.pv));
        setText('kpi-ov-pv-sub', 'Ø ' + Math.round(agg.pv / days) + '/Tag');
        setText('kpi-ov-sessions', fmtNum(agg.sessions));
        setText('kpi-ov-sessions-sub', 'Ø ' + Math.round(agg.sessions / days) + '/Tag');
        setText('kpi-ov-users', fmtNum(agg.users));
        setText('kpi-ov-users-sub', Math.round(agg.newUsers / Math.max(agg.users, 1) * 100) + '% neue Nutzer');
        setText('kpi-ov-engagement', (agg.engRate * 100).toFixed(1).replace('.', ',') + '%');
        setText('kpi-ov-bounce', (agg.bounceRate * 100).toFixed(1).replace('.', ',') + '%');
        setText('kpi-ov-duration', Math.round(agg.avgDuration) + 's');
        setText('kpi-ov-pages', agg.sessions > 0 ? (agg.pv / agg.sessions).toFixed(2).replace('.', ',') : '–');
        setText('kpi-ov-conversions', fmtNum(agg.conversions));
        const convRate = agg.sessions > 0 ? (agg.conversions / agg.sessions * 100).toFixed(1).replace('.', ',') + '%' : '–';
        setText('kpi-ov-conversions-sub', convRate + ' Conv. Rate');

        const card = document.getElementById('kpi-ov-conv-card');
        if (card) card.className = 'kpi ' + (agg.conversions > 0 ? 'accent' : 'danger');
    }

    function renderTrafficKPIs(agg, days) {
        setText('kpi-tr-pv', fmtNum(agg.pv));
        setText('kpi-tr-pv-sub', 'Ø ' + Math.round(agg.pv / days) + '/Tag');
        setText('kpi-tr-sessions', fmtNum(agg.sessions));
        setText('kpi-tr-sessions-sub', 'Ø ' + Math.round(agg.sessions / days) + '/Tag');
        setText('kpi-tr-users', fmtNum(agg.users));
        setText('kpi-tr-users-sub', Math.round(agg.newUsers / Math.max(agg.users, 1) * 100) + '% neue Nutzer');
        setText('kpi-tr-conversions', fmtNum(agg.conversions));
        const convRate = agg.sessions > 0 ? (agg.conversions / agg.sessions * 100).toFixed(1).replace('.', ',') + '%' : '–';
        setText('kpi-tr-conversions-sub', convRate + ' Conv. Rate');

        const card = document.getElementById('kpi-tr-conv-card');
        if (card) card.className = 'kpi ' + (agg.conversions > 0 ? 'accent' : 'danger');
    }

    function clearOverviewKPIs() {
        ['pv', 'sessions', 'users', 'engagement', 'bounce', 'duration', 'pages', 'conversions'].forEach(k => {
            setText('kpi-ov-' + k, '–');
        });
        setText('kpi-ov-pv-sub', '');
        setText('kpi-ov-sessions-sub', '');
        setText('kpi-ov-users-sub', '');
        setText('kpi-ov-conversions-sub', '');
    }

    function clearTrafficKPIs() {
        ['pv', 'sessions', 'users', 'conversions'].forEach(k => {
            setText('kpi-tr-' + k, '–');
        });
        setText('kpi-tr-pv-sub', '');
        setText('kpi-tr-sessions-sub', '');
        setText('kpi-tr-users-sub', '');
        setText('kpi-tr-conversions-sub', '');
    }

    // ── Render ──

    function renderAll() {
        const detailed = getDetailedPage();
        const indexPage = getIndexPage();
        const noDataBanner = document.getElementById('no-data-banner');

        if (!detailed && indexPage) {
            if (noDataBanner) {
                noDataBanner.style.display = 'block';
                noDataBanner.querySelector('.page-name').textContent = indexPage.label;
                noDataBanner.querySelector('.page-sessions').textContent = fmtNum(indexPage.sessions);
            }
            clearOverviewKPIs();
            clearTrafficKPIs();
            setText('kpi-ov-sessions', fmtNum(indexPage.sessions));
            setText('kpi-ov-sessions-sub', 'Gesamtzeitraum');
            clearCharts();
        } else {
            if (noDataBanner) noDataBanner.style.display = 'none';
            renderTab(state.activeTab);
        }
    }

    function clearCharts() {
        ['chart-trend', 'chart-traffic-trend', 'chart-sources-donut', 'chart-paid-organic',
         'chart-device-donut', 'chart-device-duration', 'chart-cities', 'chart-events',
         'chart-funnel', 'chart-conv-pages', 'chart-conv-by-source', 'chart-sankey',
         'chart-category-donut', 'chart-treemap'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { const ctx = el.getContext('2d'); ctx.clearRect(0, 0, el.width, el.height); }
        });
        ['table-sources', 'table-followup', 'flow-container'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<div class="empty">Detaildaten nicht verfügbar.</div>';
        });
    }

    function renderTab(tab) {
        const page = getDetailedPage();
        const daily = getFilteredDaily();
        const agg = aggregateDaily(daily);
        const days = daily.length || 1;

        switch (tab) {
            case 'overview':
                renderOverviewKPIs(agg, days);
                const distPages = getTrafficDistPages();
                Charts.trafficBars('traffic-bars', distPages, INDEX.categories, selectPage);
                Charts.categoryDonut('chart-category-donut', distPages, INDEX.categories);
                Charts.trafficTreemap('chart-treemap', distPages, INDEX.categories, selectPage);
                if (page) Charts.trendLine('chart-trend', daily);
                break;

            case 'traffic':
                renderTrafficKPIs(agg, days);
                if (page) Charts.trendLineMetric('chart-traffic-trend', daily, state.trafficMetric);
                break;

            case 'sources':
                if (page?.sources?.length) {
                    Charts.sourcesDoughnut('chart-sources-donut', page.sources);
                    Charts.paidVsOrganic('chart-paid-organic', page.sources);
                    Tables.sourcesTable('table-sources', page.sources);
                }
                break;

            case 'devices':
                if (page?.devices?.length) {
                    Charts.deviceDoughnut('chart-device-donut', page.devices);
                    Charts.deviceDuration('chart-device-duration', page.devices);
                }
                if (page?.cities?.length) Charts.citiesBar('chart-cities', page.cities);
                if (page?.events?.length) Charts.eventsBar('chart-events', page.events);
                break;

            case 'conversions':
                if (page?.conversions?.funnel?.length) {
                    const filtered = filterConversionFunnel(page.conversions.funnel);
                    if (filtered.length > 0) {
                        Charts.funnelBar('chart-funnel', filtered);
                    } else {
                        const el = document.getElementById('chart-funnel');
                        if (el) { const ctx = el.getContext('2d'); ctx.clearRect(0, 0, el.width, el.height); }
                    }
                }
                if (page?.sources?.length) Charts.convBySource('chart-conv-by-source', page.sources);
                if (page?.conversions?.followUpPages?.length) {
                    Charts.conversionPagesBar('chart-conv-pages', page.conversions.followUpPages);
                    Tables.followUpTable('table-followup', page.conversions.followUpPages);
                }
                break;

            case 'paths':
                if (page?.conversions?.followUpPages?.length) {
                    const indexPage = getIndexPage();
                    Charts.sankeyChart('chart-sankey', page.conversions.followUpPages, indexPage?.label || page.path);
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
