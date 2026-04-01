// background.js — Service Worker
// Proxies all OSV API calls from content scripts to avoid any CORS edge cases

const OSV_API_BASE = "https://api.osv.dev/v1";

// Cache to avoid re-fetching the same package in a session
const cache = new Map();

async function queryOSV(packageName, ecosystem, version = null) {
  const cacheKey = `${ecosystem}:${packageName}:${version || "all"}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const body = {
    package: {
      name: packageName,
      ecosystem: ecosystem,
    },
  };

  if (version) {
    body.version = version;
  }

  try {
    const response = await fetch(`${OSV_API_BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OSV API error: ${response.status}`);
    }

    const data = await response.json();
    const result = { success: true, data };
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "QUERY_OSV") {
    const { packageName, ecosystem, version } = message.payload;
    queryOSV(packageName, ecosystem, version).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === "GET_VULN_DETAILS") {
    const { vulnId } = message.payload;
    fetch(`${OSV_API_BASE}/vulns/${vulnId}`)
      .then((r) => r.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
