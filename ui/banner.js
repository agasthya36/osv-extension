// ui/banner.js — Shared banner rendering, injected into all supported pages

window.OSVBanner = {
  /**
   * Main entry point called by each content script.
   * @param {string} packageName
   * @param {string} ecosystem  — npm | PyPI | Maven | crates.io
   * @param {string|null} version
   * @param {HTMLElement} anchorEl — element to insert banner before
   */
  async render(packageName, ecosystem, version, anchorEl) {
    // Check if a banner is already injected
    const existing = document.getElementById("osv-banner-root");
    if (existing) {
      if (existing.dataset.pkg === packageName && existing.dataset.version === String(version)) {
        // already querying/showing exact same package+version, do nothing
        return;
      }
      existing.remove();
    }

    const banner = this._createLoadingBanner(packageName, ecosystem, version);
    banner.dataset.pkg = packageName;
    banner.dataset.version = String(version);
    anchorEl.parentNode.insertBefore(banner, anchorEl);

    const result = await this._fetchVulns(packageName, ecosystem, version);

    if (!result.success) {
      this._renderError(banner, result.error);
      return;
    }

    let vulns = result.data.vulns || [];

    // If no version is specified, sort the CVEs.
    if (!version) {
      vulns = this._sortVulnsDescending(vulns, packageName);
    }

    this._renderResults(banner, packageName, ecosystem, version, vulns);
  },

  _parseVersion(versionString) {
    if (!versionString || versionString === "—") return [];
    return String(versionString).split(/[-.]/).map((p) => {
      const num = parseInt(p, 10);
      return isNaN(num) ? p : num;
    });
  },

  _compareVersions(v1, v2) {
    const p1 = this._parseVersion(v1);
    const p2 = this._parseVersion(v2);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
       const a = i < p1.length ? p1[i] : 0;
       const b = i < p2.length ? p2[i] : 0;
       if (typeof a === 'number' && typeof b === 'number') {
           if (a !== b) return a - b;
       } else if (typeof a === 'string' && typeof b === 'string') {
           if (a !== b) return a.localeCompare(b);
       } else {
           // number > string
           return typeof a === 'number' ? 1 : -1;
       }
    }
    return 0;
  },

  _getHighestAffectedVersion(vuln, packageName) {
    const affected = (vuln.affected || []).find(
      (a) => a.package?.name?.toLowerCase() === packageName.toLowerCase()
    );
    if (!affected) return "—";
    const versions = affected.versions || [];
    if (versions.length === 0) return "—";
    
    let maxV = versions[0];
    for (let i = 1; i < versions.length; i++) {
        if (this._compareVersions(versions[i], maxV) > 0) {
            maxV = versions[i];
        }
    }
    return maxV;
  },

  _sortVulnsDescending(vulns, packageName) {
    const sevMap = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };
    return [...vulns].sort((a, b) => {
      const maxVa = this._getHighestAffectedVersion(a, packageName);
      const maxVb = this._getHighestAffectedVersion(b, packageName);
      
      const vComp = this._compareVersions(maxVb, maxVa); // descending
      if (vComp !== 0 && maxVa !== "—" && maxVb !== "—") return vComp;
      if (maxVa !== "—" && maxVb === "—") return -1;
      if (maxVa === "—" && maxVb !== "—") return 1;

      // Same highest version or missing versions, order by severity
      const sevA = sevMap[this._getSeverity(a)] || 0;
      const sevB = sevMap[this._getSeverity(b)] || 0;
      
      return sevB - sevA; // descending severity
    });
  },

  _fetchVulns(packageName, ecosystem, version) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "QUERY_OSV", payload: { packageName, ecosystem, version } },
        resolve
      );
    });
  },

  _createLoadingBanner(packageName, ecosystem, version) {
    const el = document.createElement("div");
    el.id = "osv-banner-root";
    el.innerHTML = `
      <div class="osv-banner osv-loading">
        <div class="osv-banner-header">
          <span class="osv-logo">🛡️ OSV Security Scanner</span>
          <span class="osv-scanning">Scanning <strong>${this._esc(packageName)}</strong>${version ? ` @ ${this._esc(version)}` : ""} (${this._esc(ecosystem)})…</span>
          <div class="osv-spinner"></div>
        </div>
      </div>
    `;
    return el;
  },

  _renderError(banner, error) {
    banner.innerHTML = `
      <div class="osv-banner osv-state-error">
        <div class="osv-banner-header">
          <span class="osv-logo">🛡️ OSV Security Scanner</span>
          <span>Could not fetch vulnerability data — ${this._esc(error)}</span>
          <button class="osv-dismiss" title="Dismiss">✕</button>
        </div>
      </div>
    `;
    banner.querySelector(".osv-dismiss").addEventListener("click", () => banner.remove());
  },

  _renderResults(banner, packageName, ecosystem, version, vulns) {
    const count = vulns.length;
    const stateClass = count === 0 ? "osv-state-safe" : this._severityState(vulns);
    const statusIcon = count === 0 ? "✅" : "⚠️";
    const statusText =
      count === 0
        ? "No known vulnerabilities found"
        : `${count} known vulnerabilit${count === 1 ? "y" : "ies"} found`;

    const osvLink = this._buildOSVLink(packageName, ecosystem);

    banner.innerHTML = `
      <div class="osv-banner ${stateClass}">
        <div class="osv-banner-header">
          <span class="osv-logo">🛡️ OSV Security Scanner</span>
          <span class="osv-status">${statusIcon} <strong>${statusText}</strong></span>
          <div class="osv-header-actions">
            ${count > 0 ? `<button class="osv-toggle-btn" id="osv-toggle">Show details ▾</button>` : ""}
            <a class="osv-ext-link" href="${osvLink}" target="_blank" rel="noopener">View on osv.dev ↗</a>
            <button class="osv-dismiss" title="Dismiss">✕</button>
          </div>
        </div>

        ${count > 0 ? `
        <div class="osv-vuln-list" id="osv-vuln-list" style="display:none">
          <div class="osv-severity-summary">
            ${this._severitySummary(vulns)}
          </div>
          <table class="osv-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Summary</th>
                <th>Severity</th>
                <th>Affected Versions</th>
                <th>Fixed In</th>
              </tr>
            </thead>
            <tbody>
              ${vulns.slice(0, 20).map((v) => this._vulnRow(v, packageName, ecosystem)).join("")}
            </tbody>
          </table>
          ${count > 20 ? `<p class="osv-overflow-note">Showing 20 of ${count}. <a href="${osvLink}" target="_blank">See all on osv.dev ↗</a></p>` : ""}
        </div>
        ` : ""}
      </div>
    `;

    // Wire up dismiss
    banner.querySelector(".osv-dismiss")?.addEventListener("click", () => banner.remove());

    // Wire up toggle
    const toggleBtn = banner.querySelector("#osv-toggle");
    const vulnList = banner.querySelector("#osv-vuln-list");
    toggleBtn?.addEventListener("click", () => {
      const open = vulnList.style.display !== "none";
      vulnList.style.display = open ? "none" : "block";
      toggleBtn.textContent = open ? "Show details ▾" : "Hide details ▴";
    });
  },

  _vulnRow(vuln, packageName, ecosystem) {
    const id = vuln.id || "—";
    const summary = this._esc(vuln.summary || "No summary available").slice(0, 120);
    const severity = this._getSeverity(vuln);
    const affectedVersions = this._getAffectedVersions(vuln, packageName);
    const fixedIn = this._getFixedIn(vuln, packageName);
    const osvUrl = `https://osv.dev/vulnerability/${encodeURIComponent(id)}`;

    return `
      <tr>
        <td><a class="osv-vuln-id" href="${osvUrl}" target="_blank" rel="noopener">${this._esc(id)}</a></td>
        <td class="osv-summary">${summary}</td>
        <td><span class="osv-severity-badge osv-sev-${severity.toLowerCase()}">${severity}</span></td>
        <td class="osv-mono">${affectedVersions}</td>
        <td class="osv-mono osv-fixed">${fixedIn}</td>
      </tr>
    `;
  },

  _getSeverity(vuln) {
    // Try CVSS severity from database_specific or severity array
    if (vuln.severity && vuln.severity.length > 0) {
      for (const s of vuln.severity) {
        if (s.type === "CVSS_V3" || s.type === "CVSS_V2") {
          const score = parseFloat(s.score);
          if (!isNaN(score)) {
            if (score >= 9.0) return "CRITICAL";
            if (score >= 7.0) return "HIGH";
            if (score >= 4.0) return "MEDIUM";
            return "LOW";
          }
        }
      }
    }
    if (vuln.database_specific?.severity) {
      return vuln.database_specific.severity.toUpperCase();
    }
    return "UNKNOWN";
  },

  _getAffectedVersions(vuln, packageName) {
    const affected = (vuln.affected || []).find(
      (a) => a.package?.name?.toLowerCase() === packageName.toLowerCase()
    );
    if (!affected) return "—";
    const versions = affected.versions || [];
    if (versions.length === 0) return "—";
    if (versions.length <= 3) return versions.join(", ");
    return `${versions.slice(0, 3).join(", ")} +${versions.length - 3} more`;
  },

  _getFixedIn(vuln, packageName) {
    const affected = (vuln.affected || []).find(
      (a) => a.package?.name?.toLowerCase() === packageName.toLowerCase()
    );
    if (!affected) return "—";
    const fixes = [];
    for (const range of affected.ranges || []) {
      for (const ev of range.events || []) {
        if (ev.fixed) fixes.push(ev.fixed);
      }
    }
    return fixes.length > 0 ? fixes.join(", ") : "No fix available";
  },

  _severityState(vulns) {
    const severities = vulns.map((v) => this._getSeverity(v));
    if (severities.includes("CRITICAL")) return "osv-state-critical";
    if (severities.includes("HIGH")) return "osv-state-high";
    if (severities.includes("MEDIUM")) return "osv-state-medium";
    return "osv-state-low";
  },

  _severitySummary(vulns) {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    vulns.forEach((v) => {
      const s = this._getSeverity(v);
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(
        ([sev, n]) =>
          `<span class="osv-severity-badge osv-sev-${sev.toLowerCase()}">${n} ${sev}</span>`
      )
      .join(" ");
  },

  _buildOSVLink(packageName, ecosystem) {
    return `https://osv.dev/list?q=${encodeURIComponent(packageName)}&ecosystem=${encodeURIComponent(ecosystem)}`;
  },

  _esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
};
