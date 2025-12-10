const API_BASE_URL = "http://localhost:5000";

// Listen for tab updates and check URLs if auto-check is enabled
// Works with or without user being logged in
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("chrome-extension://")
  ) {
    // Check if auto-check is enabled (JWT token is optional)
    chrome.storage.local.get(["autoCheck", "jwtToken"], (data) => {
      // Proceed if autoCheck is enabled (JWT optional for history, but not needed for blocking)
      if (data.autoCheck === true) {
        // Build request with optional JWT
        const fetchOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: tab.url })
        };

        // Add JWT to header if available (will be saved to history if logged in)
        if (data.jwtToken) {
          fetchOptions.headers["Authorization"] = `Bearer ${data.jwtToken}`;
        }

        fetch(`${API_BASE_URL}/predict`, fetchOptions)
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

          // If malicious: show warning page and close tab
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