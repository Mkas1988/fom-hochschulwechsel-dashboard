// ── FOM Web-Analyse App ──
const App = (() => {
    let DATA = null;
    let state = {
        pageIdx: 0,
        dateStart: '',
        dateEnd: '',
        activeTab: 'overview'
    };

    // ── Init ──
    function init(data) {
        DATA = data;
        state.dateStart = data.dateRange.start;
        state.dateEnd = data.dateRange.end;

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

    // ── Dropdown ──
    function populateDropdown() {
        const sel = document.getElementById('page-select');
        DATA.pages.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.label + '  (' + p.path + ')';
            sel.appendChild(opt);
        });
        sel.addEventListener('change', () => {
            state.pageIdx = parseInt(sel.value);
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

    // ── Data Filtering ──
    function getFilteredDaily() {
        const page = DATA.pages[state.pageIdx];
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

    // ── Render All ──
    function renderAll() {
        renderKPIs();
        renderTab(state.activeTab);
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

        // Set card classes
        const convCard = document.getElementById('kpi-conversions')?.closest('.kpi-card');
        if (convCard) {
            convCard.className = 'kpi-card ' + (agg.conversions > 0 ? 'highlight' : 'danger');
        }
    }

    function renderTab(tab) {
        const page = DATA.pages[state.pageIdx];
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
                if (page.sources) {
                    Charts.sourcesDoughnut('chart-sources-donut', page.sources);
                    Charts.paidVsOrganic('chart-paid-organic', page.sources);
                    Tables.sourcesTable('table-sources', page.sources);
                }
                break;
            case 'devices':
                if (page.devices) {
                    Charts.deviceDoughnut('chart-device-donut', page.devices);
                    Charts.deviceDuration('chart-device-duration', page.devices);
                }
                if (page.cities) Charts.citiesBar('chart-cities', page.cities);
                if (page.events) Charts.eventsBar('chart-events', page.events);
                break;
            case 'conversions':
                if (page.conversions?.funnel) Charts.funnelBar('chart-funnel', page.conversions.funnel);
                if (page.conversions?.followUpPages) {
                    Charts.conversionPagesBar('chart-conv-pages', page.conversions.followUpPages);
                    Tables.followUpTable('table-followup', page.conversions.followUpPages);
                }
                break;
            case 'paths':
                if (page.conversions?.followUpPages) {
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
