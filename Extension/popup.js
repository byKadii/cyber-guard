const API_BASE_URL = "http://localhost:5000";

// Check if user has valid JWT token
async function checkAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("jwtToken", (data) => {
      resolve(data.jwtToken ? true : false);
    });
  });
}

// Get current URL and check it
async function checkCurrentURL() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentURL = tabs[0]?.url;
  
  if (!currentURL || currentURL.startsWith("chrome://")) {
    document.getElementById("status").textContent = "Cannot check Chrome URLs";
    return;
  }

  const isAuthenticated = await checkAuthToken();
  if (!isAuthenticated) {
    document.getElementById("status").textContent = "⚠️ Please login first at http://localhost:5000";
    return;
  }

  document.getElementById("status").textContent = "🔍 Checking URL...";

  try {
    const jwtToken = await new Promise((resolve) => {
      chrome.storage.local.get("jwtToken", (data) => {
        resolve(data.jwtToken);
      });
    });

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ url: currentURL })
    });

    const data = await response.json();
    
    if (data.prediction === "malicious") {
      document.getElementById("status").textContent = "🚨 MALICIOUS SITE DETECTED";
      document.getElementById("status").style.color = "#d32f2f";
    } else if (data.prediction === "phishing") {
      document.getElementById("status").textContent = "⚠️ PHISHING RISK";
      document.getElementById("status").style.color = "#ff6f00";
    } else {
      document.getElementById("status").textContent = "✅ Site looks safe";
      document.getElementById("status").style.color = "#388e3c";
    }
  } catch (error) {
    document.getElementById("status").textContent = "❌ Backend not available";
    console.error("Error checking URL:", error);
  }
}

// Enable auto-check
document.getElementById("enableBtn").addEventListener("click", () => {
  chrome.storage.local.set({ autoCheck: true }, () => {
    document.getElementById("status").textContent = "Auto check enabled ✅";
    checkCurrentURL();
  });
});

// Disable auto-check
document.getElementById("disableBtn").addEventListener("click", () => {
  chrome.storage.local.set({ autoCheck: false }, () => {
    document.getElementById("status").textContent = "Auto check disabled ❌";
  });
});

// On popup open, show current setting and check URL if enabled
chrome.storage.local.get(["autoCheck", "jwtToken"], (data) => {
  const autoCheckEnabled = data.autoCheck;
  const hasToken = data.jwtToken ? true : false;

  if (!hasToken) {
    document.getElementById("status").textContent = "⚠️ Login required at http://localhost:5000";
  } else if (autoCheckEnabled) {
    document.getElementById("status").textContent = "Auto check enabled ✅";
    checkCurrentURL();
  } else {
    document.getElementById("status").textContent = "Auto check disabled ❌";
  }
});
