# Orbly

**A lightweight, privacy-respecting multi-app workspace manager.**

Run all your favourite web apps in one place with near-zero idle CPU usage, built-in ad blocking, full session isolation, and a native desktop experience.

Built with [Tauri 2](https://tauri.app), [SolidJS](https://www.solidjs.com/), and [Rust](https://www.rust-lang.org/).

🌐 **Website:** [getorb.ly](https://getorb.ly)
📦 **Source:** [github.com/fluffypony/orbly](https://github.com/fluffypony/orbly)
📜 **License:** BSD 3-Clause

---

## Overview

Orbly wraps each web app in its own isolated webview with a separate data store - cookies, cache, and sessions never leak between apps. Inactive apps are automatically hibernated so they consume zero CPU, and a built-in ad blocker strips ads and trackers before content ever renders. The result is a single window that replaces a dozen browser tabs while using a fraction of the resources.

Orbly ships as a single native binary for macOS, Windows, and Linux. The frontend is a SolidJS + Tailwind CSS 4 single-page app; the backend is Rust using the Tauri 2 framework and platform-native webviews (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux).

---

## Features

### App Management

Orbly ships with built-in templates for over twenty popular services - WhatsApp, Slack, Telegram, Discord, Gmail, Outlook, Notion, Linear, GitHub, Figma, Spotify, YouTube, and more - as well as support for any custom URL. Each app gets its own isolated data store backed by the platform's native webview engine. Apps have a full lifecycle: they can be active, hibernated (webview destroyed but URL preserved for instant wake), or disabled entirely. An onboarding wizard walks new users through selecting services, choosing a theme, configuring quiet hours, and enabling launch-at-login.

Per-app configuration includes custom user agent strings (with presets for Chrome, Firefox, Safari, and Mobile Safari), HTTP/SOCKS5 proxy support, custom CSS and JavaScript injection, download directory overrides, notification style, ad-blocking toggle, zoom level (50–200%), and dark mode settings. Apps can be reordered by drag-and-drop in the sidebar, grouped into named sidebar sections, and assigned to workspaces.

### Workspaces

Apps can be organized into multiple workspaces. The workspace switcher appears at the top of the sidebar when more than one workspace exists. Switching workspaces can optionally auto-hibernate apps that are not members of the new workspace. Each workspace persists its own tiling layout and tile assignments so that your split-view arrangement is restored when you switch back.

### Tiling and Split Views

The toolbar provides a layout picker with seven modes: single (default), vertical split, horizontal split, three-column, two-thirds left, two-thirds right, and a 2×2 grid. In any split mode you can assign a different app to each tile and drag the divider to adjust the split ratio. Double-clicking the divider resets it to 50/50. Tiling state is persisted per-workspace.

### Ad Blocking

Orbly integrates the [adblock-rust](https://github.com/nickspaargaren/pihole-google-doh-block) engine to provide network-level and cosmetic ad blocking. By default, EasyList and EasyPrivacy filter lists are loaded on startup and refreshed every 24 hours. You can add additional filter list URLs, write custom adblock rules in the standard filter syntax, and toggle ad blocking per-app from the toolbar shield icon or the Settings panel. The toolbar badge shows a live count of blocked requests for the active app. On macOS, the filter rules are additionally compiled into WKContentRuleList JSON for sub-resource blocking at the WebKit layer.

### Dark Mode

Each app supports four dark mode strategies that can be cycled from the toolbar moon icon: Off, Dynamic (full page analysis via DarkReader), Filter (CSS invert with image compensation), and Static (your own custom CSS). Dynamic and Filter modes expose adjustable brightness, contrast, and sepia sliders, as well as optional background and text colour overrides. A separate Custom Dark Mode CSS field lets you fine-tune per-service rendering. The DarkReader library is bundled as a pre-built IIFE that is injected into every webview at initialization, so toggling dark mode is instantaneous with no network requests.

### Notifications

Orbly intercepts the web `Notification` API in each app webview, converts notifications into native OS notifications via `tauri-plugin-notification`, and routes badge counts to the sidebar, tray icon, and dock. Three per-app notification styles are available: Full (title + body forwarded), Private (body redacted to "New notification"), and Off (silenced entirely). Badge counts are scraped from the page title, `data-unread-count` attributes, and common badge CSS selectors; service-specific badge scripts can be loaded from the remote recipe server for higher accuracy.

A Do Not Disturb mode suppresses all notifications globally. DND can be toggled manually from the sidebar bell icon, the system tray, or the `Cmd/Ctrl+Shift+D` shortcut. A scheduled quiet-hours system lets you define start/end times and active days of the week; the schedule is evaluated every 60 seconds and DND is toggled automatically.

### Downloads

A unified download manager panel slides up from the bottom of the content area. It shows filename, source app, size, progress, status, and date for every download. You can search/filter, open the file or its containing folder, cancel in-progress downloads, retry failed ones, and clear completed entries. Download directories can be configured globally and overridden per-app, and a "skip download dialog" option can be set globally or per-app to auto-save without prompting. Filename conflicts are resolved by appending numeric suffixes.

### Keyboard Shortcuts

Six shortcuts are customizable with conflict detection and optional global registration (active even when the window is not focused): Quick Switcher, Toggle DND, Toggle Sidebar, Next App, Previous App, and Global Mute. Additional fixed shortcuts cover Reload (`Cmd/Ctrl+R`), Apps Manager (`Cmd/Ctrl+Shift+A`), Downloads (`Cmd/Ctrl+J`), Settings (`Cmd/Ctrl+,`), Zoom In/Out/Reset (`Cmd/Ctrl+=/-/0`), Find in Page (`Cmd/Ctrl+F`), and direct app switching (`Cmd/Ctrl+1` through `Cmd/Ctrl+9`). On Windows and Linux, `Ctrl+Tab` and `Ctrl+Shift+Tab` are also bound for next/previous app. Each shortcut can be individually enabled or disabled.

### Quick Switcher

Press `Cmd/Ctrl+K` to open a spotlight-style overlay that fuzzy-searches your enabled apps. Results are sorted by recent usage. Arrow keys navigate, Enter activates, and Escape dismisses.

### Link Routing

URL pattern rules (evaluated top-to-bottom, first match wins) determine where clicked links open. Patterns use a simple wildcard syntax (`*.example.com/*`) and can route to the external browser or to any configured app. A test tool in Settings lets you paste a URL and see which rule matches. Links intercepted inside webviews are handled via `window.open` and `<a>` click overrides; cross-origin links are routed through the Tauri backend. If a link targets a hibernated app, the URL is queued and navigated to after the app wakes.

### Resource Monitoring

The Apps Manager (`Cmd/Ctrl+Shift+A`) displays a sortable table of all apps with live CPU% and memory usage, status indicators (active, loading, hibernated, disabled, crashed, error), and per-row actions (reload, hibernate, disable, enable, kill). Resource data is polled every five seconds by walking the process tree of the Tauri host. A configurable CPU alert threshold triggers a toast and a native OS notification when any app exceeds the threshold for more than 30 seconds. Per-app alert suppression is available.

### Custom CSS/JS Injection

Each app exposes a code editor with CSS and JS tabs. Custom CSS is injected into the page head; custom JavaScript runs after `DOMContentLoaded` with full access to the page's DOM and session data. A security warning in the editor reminds users of the access scope.

### Remote Recipes

A recipe server at `recipes.getorb.ly` provides service-specific badge-scraping scripts, CSS, and JS injection. Recipes are fetched as a JSON manifest, validated with SHA-256 hashes, and cached locally. A configurable cache TTL (default 24 hours) controls how often the manifest is refreshed. A "local scripts only" mode disables all remote fetching for maximum privacy. The manifest URL is also configurable for self-hosted recipe servers.

### Audio Control

Each app can be individually muted from the toolbar or the sidebar context menu. A global mute toggle (`Cmd/Ctrl+Shift+M`) mutes every app at once while remembering each app's prior mute state so it can be restored on unmute. Media-playing detection prevents auto-hibernation of apps that are actively playing audio or video.

### Find in Page

Press `Cmd/Ctrl+F` to open an in-page search bar that uses the webview's `window.find()` API. Match count is displayed, and `Enter`/`Shift+Enter` navigate forward/backward through results. The bar auto-focuses and clears highlights on close.

### Certificate Management

When a webview encounters an invalid SSL certificate, Orbly shows a certificate warning screen with the option to accept the risk for 30 days. Accepted exceptions are listed in Settings → General → Certificate Exceptions, where they can be individually removed.

### Picture-in-Picture

Video elements in webviews automatically receive a hover-visible PiP button. Clicking it enters the browser's native Picture-in-Picture mode; clicking again exits. The button highlights blue while PiP is active.

### OAuth Flow Handling

Known OAuth provider URLs (Google, Microsoft, GitHub, Apple, Facebook, Twitter, Discord, Slack) are detected and automatically opened in the system browser so that login flows work correctly outside the webview sandbox.

### Deep Linking

Orbly registers the `orbly://` URL scheme. Incoming deep links are matched against configured app service types and IDs, and the matching app is activated.

### System Tray

The tray icon provides show/hide, per-app quick switch, DND toggle, and quit. Left-clicking the tray icon shows and focuses the main window. The tray tooltip and dock/taskbar badge display the aggregated unread count across all apps.

### Appearance

Three theme options - System, Light, and Dark - are available in Settings and during onboarding. The `color-scheme` CSS property is set on the root element so that native form controls and scrollbars match. Custom scrollbar and text selection colours can be configured globally. Per-app zoom is adjustable from 50% to 200% via shortcuts or the app editor.

### Sync and Backup

Configuration can be exported as JSON and imported on another machine. iCloud sync support (macOS only) is stubbed and planned for a future release.

### Session Recovery

Active app URLs are continuously persisted to a separate `session_state.json` file. On the next launch, if the previous session was not cleanly shut down, all previously active apps are restored to their last known URLs and a toast reports how many apps were recovered.

### Crash Detection

Active webviews send a heartbeat every 10 seconds. If a heartbeat is not received for 90 seconds, the app is transitioned to a Crashed state and the user is prompted to reload. Apps stuck in Loading state for more than 30 seconds are transitioned to Error.

### Auto-Start

Launch-at-login is configurable via the onboarding wizard or Settings → General. On macOS it uses a LaunchAgent; on other platforms it uses the `tauri-plugin-autostart` mechanism.

### Auto-Update

On startup (after a 10-second delay), Orbly checks for new releases via the GitHub releases endpoint. If an update is available, a toast is displayed. Manual checks can be triggered from Settings → About.

### Accessibility

Focus indicators use the system accent colour with a 2px offset. High contrast mode increases border widths and adjusts muted text colours. Reduced motion disables all CSS animations and transitions. ARIA labels are applied throughout, including the sidebar listbox, toolbar, settings tabs, and all interactive controls. Minimum touch targets of 44×44px are enforced on all buttons. Keyboard navigation supports arrow keys for sidebar traversal and Escape to dismiss overlays.

### Configuration

All settings are stored in a TOML file at `{app_data_dir}/config.toml`. Writes are atomic (write to temp → rotate backup → rename) to prevent corruption. A `.bak` backup is maintained and restored automatically if the primary config file is corrupt. Config versioning and migration ensure forward compatibility.

---

## Prerequisites

**All platforms:**

- [Node.js](https://nodejs.org/) ≥ 18
- [npm](https://www.npmjs.com/)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain, ≥ 1.77)
- [Tauri CLI](https://tauri.app/start/): `cargo install tauri-cli` or `npm install -g @tauri-apps/cli`

**macOS:**

- Xcode Command Line Tools: `xcode-select --install`
- macOS 11+ (Big Sur or later)

**Windows:**

- [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload

**Linux (Debian/Ubuntu):**

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

For other distributions, see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/).

---

## Building from Source

Clone the repository:

```bash
git clone https://github.com/fluffypony/orbly.git
cd orbly
```

Install frontend dependencies:

```bash
npm install
```

### Development

Run the app in development mode with hot reload:

```bash
npm run tauri dev
```

This starts the Vite dev server on `localhost:1420` and launches the Tauri window pointing to it. Frontend changes are hot-reloaded; Rust changes trigger an automatic recompile.

### Production Build

Build the injection script, compile TypeScript, bundle the frontend, and produce a native binary:

```bash
npm run tauri build
```

The output binary and installer are placed in `src-tauri/target/release/bundle/`. On macOS this produces a `.app` bundle and `.dmg` installer; on Windows an `.msi` and `.exe`; on Linux a `.deb`, `.rpm`, and `.AppImage`.

### Build Steps Explained

The build pipeline has two stages:

1. **`npm run build:inject`** - Vite compiles `src/injected/darkmode-inject.ts` (the DarkReader IIFE) into `src-tauri/resources/darkmode-inject.js` using the config in `vite.inject.config.ts`.

2. **`npm run build`** - Runs the inject build, then `tsc` for type checking, then Vite bundles the SolidJS frontend into `dist/`.

Tauri then compiles the Rust backend (which bundles `dist/` and `resources/` into the binary) and produces the platform installer.

---

## Technology

| Layer | Technology |
|-------|-----------|
| Framework | [Tauri 2](https://tauri.app) |
| Frontend | [SolidJS](https://www.solidjs.com/) 1.9, [Tailwind CSS](https://tailwindcss.com/) 4.1 |
| Backend | Rust, [Tokio](https://tokio.rs/) |
| Ad blocking | [adblock-rust](https://crates.io/crates/adblock) |
| Dark mode | [DarkReader](https://darkreader.org/) (bundled) |
| Bundler | [Vite](https://vitejs.dev/) 6 |
| Drag & drop | [@thisbeyond/solid-dnd](https://github.com/thisbeyond/solid-dnd) |
| Process monitoring | [sysinfo](https://crates.io/crates/sysinfo) |
| Webview | WKWebView (macOS), WebView2 (Windows), WebKitGTK (Linux) |

---

## Supported Service Templates

Orbly includes one-click setup for: WhatsApp, Slack, Telegram, Discord, Mattermost (self-hosted), Microsoft Teams, Messenger, Gmail, Outlook, Notion, Linear, Google Calendar, Google Drive, Todoist, Trello, GitHub, GitLab, Proton Mail, Figma, X (Twitter), Reddit, YouTube, and Spotify. Any URL can also be added as a custom app.

---

## Default Keyboard Shortcuts

| Action | macOS | Windows / Linux |
|--------|-------|-----------------|
| Quick Switcher | `⌘+K` | `Ctrl+K` |
| Toggle Sidebar | `⌘+\` | `Ctrl+\` |
| Toggle DND | `⌘+Shift+D` | `Ctrl+Shift+D` |
| Next App | `⌘+]` | `Ctrl+]` or `Ctrl+Tab` |
| Previous App | `⌘+[` | `Ctrl+[` or `Ctrl+Shift+Tab` |
| Reload App | `⌘+R` | `Ctrl+R` |
| Apps Manager | `⌘+Shift+A` | `Ctrl+Shift+A` |
| Downloads | `⌘+J` | `Ctrl+J` |
| Settings | `⌘+,` | `Ctrl+,` |
| Zoom In | `⌘+=` | `Ctrl+=` |
| Zoom Out | `⌘+-` | `Ctrl+-` |
| Zoom Reset | `⌘+0` | `Ctrl+0` |
| Find in Page | `⌘+F` | `Ctrl+F` |
| Global Mute | `⌘+Shift+M` | `Ctrl+Shift+M` |
| Switch to App N | `⌘+1`–`⌘+9` | `Ctrl+1`–`Ctrl+9` |

All customizable shortcuts can be rebound, registered as global hotkeys, or individually disabled in Settings → Shortcuts.

---

## Configuration

Orbly stores its configuration at:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/com.getorb.ly/config.toml` |
| Windows | `%APPDATA%\com.getorb.ly\config.toml` |
| Linux | `~/.local/share/com.getorb.ly/config.toml` |

The configuration format is TOML. Writes are atomic with automatic backup rotation. A corrupt config file is automatically restored from the `.bak` backup. The full configuration can also be exported and imported as JSON from Settings → Sync.

---

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request.

When developing locally, `npm run tauri dev` provides hot reload for the frontend and automatic Rust recompilation. The Rust backend can be tested independently with `cargo test` from the `src-tauri/` directory.

---

## License

Orbly is licensed under the [BSD 3-Clause License](LICENSE).

---

© 2026 Orbly Contributors
