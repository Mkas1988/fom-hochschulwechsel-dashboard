// ── OpenAI GPT Integration für Build Your Analytics ──
const AI = (() => {
    let API_KEY = localStorage.getItem('openai_key') || '';
    const MODEL = 'gpt-4o-mini';

    function setKey(key) {
        API_KEY = key;
        localStorage.setItem('openai_key', key);
    }

    function hasKey() { return !!API_KEY; }

    const SYSTEM_PROMPT = `Du bist ein Analytics-Assistent für die FOM Hochschule Webseite.

VERFÜGBARE DATEN:
- 15 Seiten mit täglichen Metriken (01.01.2026 - 01.04.2026): pageviews, sessions, users, newUsers, engagementRate, bounceRate, avgDuration, conversions
- 550 Seiten im Index mit Gesamtsessions
- Kategorien: Allgemein, Bachelor, Master, Studienform, Beratung & Service, Hochschulbereiche, Standorte, Sonstige
- Traffic-Quellen: channel, source, medium, sessions, users, engRate, conversions
- Geräte: mobile, desktop, tablet (sessions, users, avgDuration)
- Städte: city, sessions, users
- Events: name, count, users (page_view, session_start, scroll, click, CTA-Klicks etc.)
- Conversions: Funnel-Steps + Folgeseiten mit Conversion-Rates

TOP-15 SEITEN (mit Detaildaten):
/, /weiterkommen, /bachelor.html, /info-material, /de/.../soziale-arbeit-ba.html, /last-call-bachelor, /de/.../studiengangsfinder.html, /de/.../wirtschaftspsychologie-ba.html, /vollzeit.html, /de/.../master.html, /de/.../business-administration-ba.html, /de/.../zeitmodelle.html, /de/studienberatung.html, /de/fom-dualmatch.html, /anmeldung.html

ANTWORT-FORMAT (NUR JSON, kein Text):
{
  "type": "kpis|trend|sources|devices|geo|events|funnel|paths|topPages|comparison",
  "pageFilter": "all|category:Bachelor|path:/bachelor.html",
  "dateRange": { "start": "2026-01-01", "end": "2026-04-01" },
  "metrics": ["sessions", "pv", "users", "conversions", "engRate", "bounceRate", "avgDuration"],
  "title": "Beschreibender Titel für den Report",
  "subtitle": "Kurze Erklärung was gezeigt wird"
}

REGELN:
- type bestimmt die Visualisierung
- pageFilter: "all" für alle Seiten, "category:XY" für Kategorie, oder konkreter Pfad
- Wenn der User nach Vergleichen fragt → type: "comparison" oder "topPages"
- Wenn nach zeitlichem Verlauf → type: "trend"
- Wenn nach Quellen/Kanälen → type: "sources"
- Wenn nach Geräten → type: "devices"
- Wenn nach Conversions/Anmeldungen → type: "funnel"
- Wenn nach Städten/Regionen → type: "geo"
- Wenn nach Events/Klicks → type: "events"
- Wenn nach Nutzerpfaden → type: "paths"
- Antworte IMMER mit validem JSON, NIEMALS mit Text`;

    async function ask(question) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + API_KEY
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: question }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                throw new Error('API Fehler: ' + response.status);
            }

            const data = await response.json();
            const content = data.choices[0].message.content.trim();

            // Parse JSON from response (handle markdown code blocks)
            let json = content;
            if (json.startsWith('```')) {
                json = json.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
            }

            return JSON.parse(json);
        } catch (err) {
            console.error('AI Error:', err);
            return {
                type: 'kpis',
                pageFilter: 'all',
                dateRange: { start: '2026-01-01', end: '2026-04-01' },
                metrics: ['sessions', 'pv', 'users'],
                title: 'Fehler bei der Verarbeitung',
                subtitle: 'Fallback: Allgemeine Übersicht wird angezeigt. Fehler: ' + err.message
            };
        }
    }

    return { ask, setKey, hasKey };
})();
