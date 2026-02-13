/// Returns JS that scrapes badge counts from the DOM
pub fn badge_scrape_script(app_id: &str) -> String {
    format!(
        r#"
(function() {{
    'use strict';
    var ORBLY_APP_ID = '{}';
    var lastReportedCount = undefined;

    function scrapeBadgeCount() {{
        var count = null;

        var titleMatch = document.title.match(/^\((\d+)\)/);
        if (titleMatch) {{
            count = parseInt(titleMatch[1], 10);
        }}

        if (count === null) {{
            var el = document.querySelector('[data-unread-count]');
            if (el) {{
                var attrVal = parseInt(el.getAttribute('data-unread-count'), 10);
                if (!isNaN(attrVal)) {{
                    count = attrVal;
                }}
            }}

            if (count === null) {{
                var selectors = [
                    '.unread-count',
                    '.badge-count',
                    '.notification-badge'
                ];
                for (var i = 0; i < selectors.length; i++) {{
                    var badgeEl = document.querySelector(selectors[i]);
                    if (badgeEl) {{
                        var text = badgeEl.textContent.trim();
                        var num = parseInt(text, 10);
                        if (!isNaN(num)) {{
                            count = num;
                            break;
                        }} else if (badgeEl.getClientRects().length > 0) {{
                            count = -1;
                            break;
                        }}
                    }}
                }}
            }}
        }}

        if (count !== lastReportedCount) {{
            lastReportedCount = count;
            if (window.__TAURI_INTERNALS__) {{
                window.__TAURI_INTERNALS__.invoke('on_badge_update', {{
                    app_id: ORBLY_APP_ID,
                    count: count,
                }}).catch(function() {{}});
            }}
        }}
    }}

    scrapeBadgeCount();
    setInterval(scrapeBadgeCount, 5000);

    var titleEl = document.querySelector('title');
    if (titleEl) {{
        var observer = new MutationObserver(scrapeBadgeCount);
        observer.observe(titleEl, {{ childList: true, characterData: true, subtree: true }});
    }}
}})();
"#,
        app_id
    )
}
