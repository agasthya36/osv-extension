// popup/popup.js

const SUPPORTED_PATTERNS = [
  { pattern: /npmjs\.com\/package\//, label: "npm package", ecosystem: "npm" },
  { pattern: /pypi\.org\/project\//, label: "PyPI package", ecosystem: "PyPI" },
  { pattern: /central\.sonatype\.com\/artifact\//, label: "Maven artifact", ecosystem: "Maven" },
  { pattern: /mvnrepository\.com\/artifact\//, label: "Maven artifact", ecosystem: "Maven" },
];

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const url = tab?.url || "";
  const statusCard = document.getElementById("status-card");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const pageInfo = document.getElementById("current-page-info");

  const match = SUPPORTED_PATTERNS.find((p) => p.pattern.test(url));

  if (match) {
    statusCard.classList.add("active");
    statusDot.classList.add("green");
    statusText.textContent = `Scanning ${match.ecosystem} package`;
    pageInfo.textContent = new URL(url).pathname;
  } else {
    statusCard.classList.add("inactive");
    statusDot.style.background = "#475569";
    statusText.textContent = "Not a supported registry page";
    pageInfo.textContent = "Navigate to a supported package registry to see vulnerability info.";
  }
});
