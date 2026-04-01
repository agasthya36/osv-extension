// content-scripts/pypi.js
// Runs on https://pypi.org/project/*

let currentUrl = location.href;

function runScan() {
  // URL pattern: /project/name or /project/name/1.2.3/
  const path = window.location.pathname;
  const match = path.match(/^\/project\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return;

  const packageName = match[1]; // e.g. "requests"
  const version = match[2] || null; // e.g. "2.28.0" or null

  function getAnchorEl() {
    return (
      document.querySelector(".package-header") ||
      document.querySelector(".package-description") ||
      document.querySelector("main") ||
      document.body.firstElementChild
    );
  }

  const anchor = getAnchorEl();
  if (!anchor) return;

  if (window.OSVBanner) {
    window.OSVBanner.render(packageName, "PyPI", version, anchor);
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
