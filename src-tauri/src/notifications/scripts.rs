/// Returns the JS that intercepts window.Notification calls
/// and posts them back to the Tauri backend
pub fn notification_intercept_script(app_id: &str, notification_style: &str) -> String {
    format!(
        r#"
(function() {{
    'use strict';
    const ORBLY_APP_ID = '{}';
    const ORBLY_NOTIFICATION_STYLE = '{}';

    class OrblyNotification {{
        constructor(title, options = {{}}) {{
            if (window.__TAURI_INTERNALS__) {{
                const payload = {{
                    app_id: ORBLY_APP_ID,
                    title: title,
                    body: options.body || '',
                    icon: options.icon || '',
                    tag: options.tag || '',
                    style: ORBLY_NOTIFICATION_STYLE,
                }};
                window.__TAURI_INTERNALS__.invoke('on_web_notification', {{ notification: payload }}).catch(function() {{}});
            }}

            this._title = title;
            this._options = options;
            this.onclick = null;
            this.onclose = null;
            this.onerror = null;
            this.onshow = null;
        }}

        get title() {{ return this._title; }}
        get body() {{ return this._options.body || ''; }}
        get icon() {{ return this._options.icon || ''; }}
        get tag() {{ return this._options.tag || ''; }}

        close() {{}}

        static get permission() {{ return 'granted'; }}
        static requestPermission(callback) {{
            var result = Promise.resolve('granted');
            if (callback) callback('granted');
            return result;
        }}
    }}

    window.Notification = OrblyNotification;
}})();
"#,
        app_id, notification_style
    )
}
