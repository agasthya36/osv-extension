# 🛡️ OSV Security Scanner — Browser Extension

[![Firefox Add-on](https://img.shields.io/amo/v/osv-security-scanner?logo=firefox&color=FF7139)](https://addons.mozilla.org/en-US/firefox/addon/osv-security-scanner/)

Automatically shows vulnerability data from [osv.dev](https://osv.dev) when you browse package registries.

## Supported Registries

| Registry | URL |
|---|---|
| npm | `npmjs.com/package/*` |
| PyPI | `pypi.org/project/*` |
| Maven Central | `central.sonatype.com/artifact/*` |
| MVN Repository | `mvnrepository.com/artifact/*` |

## Features

- 🔍 Auto-detects package name + version from the URL
- ⚠️ Color-coded severity banner (CRITICAL / HIGH / MEDIUM / LOW)
- 📋 Expandable CVE table with affected versions and fix info
- 🔗 Deep links to osv.dev for each vulnerability
- ⚡ In-session caching — no redundant API calls
- 🚫 Dismissable — stays out of your way

---

## Installation

### Chrome / Edge (Developer Mode)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `osv-scanner-extension` folder

### Firefox

1. Open `about:debugging`
2. Click **This Firefox** → **Load Temporary Add-on**
3. Select the `manifest.json` file inside the extension folder

> **Note:** Firefox temporary add-ons are removed on browser restart. For permanent install, package as `.xpi`.

---

## How It Works

```
User visits npmjs.com/package/lodash
        ↓
Content script extracts: name="lodash", ecosystem="npm"
        ↓
Message sent to background service worker
        ↓
Background calls: POST https://api.osv.dev/v1/query
        ↓
Vulnerability data returned → banner injected into page
```

## Adding More Registries

To add a new registry (e.g. crates.io):

1. Create `content-scripts/crates.js` — extract package name from URL, call `window.OSVBanner.render(name, "crates.io", version, anchorEl)`
2. Add match pattern and script reference to `manifest.json` under `content_scripts`
3. Done!

## Ecosystem Names (OSV API)

| Registry | Ecosystem string |
|---|---|
| npm | `npm` |
| PyPI | `PyPI` |
| Maven | `Maven` |
| crates.io | `crates.io` |
| RubyGems | `RubyGems` |
| Go | `Go` |
| NuGet | `NuGet` |

## API

Uses the public [OSV.dev API](https://google.github.io/osv.dev/api/) — no API key required.
