const API_BASE_URL = "http://localhost:5000";

// Listen for tab updates and check URLs if auto-check is enabled
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("chrome-extension://")
  ) {
    // Check if auto-check is enabled and user is authenticated
    chrome.storage.local.get(["autoCheck", "jwtToken"], (data) => {
      // Only proceed if autoCheck is enabled AND user has JWT token
      if (data.autoCheck === true && data.jwtToken) {
        fetch(`${API_BASE_URL}/predict`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${data.jwtToken}`
          },
          body: JSON.stringify({ url: tab.url })
        })
        .then(response => response.json())
        .then(result => {
          const prediction = (result.prediction || "").toLowerCase();
          const threatLevel = result.threat_level || "medium";

          // Categorize as safe or malicious
          const isAlarmingViaURL = ["malicious", "phishing", "unsafe"].includes(prediction);

          // Show notification
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: isAlarmingViaURL ? "⚠️ Malicious Site Detected" : "✅ Safe Site",
            message: isAlarmingViaURL
              ? `Threat Level: ${threatLevel}. This site has been flagged as potentially dangerous.`
              : "This site appears to be safe.",
            priority: isAlarmingViaURL ? 2 : 0
          });

          // If malicious: show warning page and optionally close tab
          if (isAlarmingViaURL) {
            chrome.windows.create({
              url: chrome.runtime.getURL("warning.html") + 
                   "?url=" + encodeURIComponent(tab.url) + 
                   "&threat=" + encodeURIComponent(prediction) +
                   "&level=" + encodeURIComponent(threatLevel),
              type: "popup",
              width: 500,
              height: 400
            });

            // Close the malicious tab after showing warning
            setTimeout(() => {
              chrome.tabs.remove(tabId);
            }, 1000);
          }
        })
        .catch(error => {
          console.error("Error checking URL:", error);
          // Don't block if backend is unavailable
        });
      }
    });
  }
});