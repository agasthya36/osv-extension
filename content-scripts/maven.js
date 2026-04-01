// content-scripts/maven.js
// Runs on https://central.sonatype.com/artifact/* and https://mvnrepository.com/artifact/*

let currentUrl = location.href;

function runScan() {
  const host = window.location.hostname;
  const path = window.location.pathname;
  let packageName = null;
  let version = null;

  if (host === "central.sonatype.com") {
    // Pattern: /artifact/groupId/artifactId or /artifact/groupId/artifactId/version
    const match = path.match(/^\/artifact\/([^/]+)\/([^/]+)(?:\/([^/]+))?/);
    if (!match) return;
    // OSV uses "groupId:artifactId" as the package name for Maven
    packageName = `${match[1]}:${match[2]}`;
    version = match[3] || null;

  } else if (host === "mvnrepository.com") {
    // Pattern: /artifact/groupId/artifactId or /artifact/groupId/artifactId/version
    const match = path.match(/^\/artifact\/([^/]+)\/([^/]+)(?:\/([^/]+))?/);
    if (!match) return;
    packageName = `${match[1]}:${match[2]}`;
    version = match[3] || null;
  }

  if (!packageName) return;

  function getAnchorEl() {
    return (
      document.querySelector("main") ||
      document.querySelector(".artifact-title") ||
      document.querySelector("h1")?.closest("section") ||
      document.body.firstElementChild
    );
  }

  const anchor = getAnchorEl();
  if (!anchor) return;

  if (window.OSVBanner) {
    window.OSVBanner.render(packageName, "Maven", version, anchor);
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
