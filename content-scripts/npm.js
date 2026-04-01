// content-scripts/npm.js
// Runs on https://www.npmjs.com/package/*

let currentUrl = location.href;

function runScan() {
  // URL pattern: /package/@scope/name or /package/name
  // Also handles /package/name/v/1.2.3
  const path = window.location.pathname; // e.g. /package/lodash or /package/lodash/v/4.17.21

  const match = path.match(/^\/package\/(@[^/]+\/[^/]+|[^/]+)(?:\/v\/([^/]+))?/);
  if (!match) return;

  const packageName = match[1]; // e.g. "lodash" or "@babel/core"
  const version = match[2] || null; // e.g. "4.17.21" or null

  // Find best anchor: the main package header area
  function getAnchorEl() {
    // The package title heading section
    return (
      document.querySelector("main") ||
      document.querySelector("#top") ||
      document.querySelector('[data-testid="package-readme-container"]') ||
      document.body.firstElementChild
    );
  }

  const anchor = getAnchorEl();
  if (!anchor) return;

  // Wait for OSVBanner to be ready (it's injected via manifest ordering)
  if (window.OSVBanner) {
    window.OSVBanner.render(packageName, "npm", version, anchor);
  }
}

// Initial run
runScan();

// Watch for SPA navigations
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    runScan();
  }
}).observe(document, { subtree: true, childList: true });
