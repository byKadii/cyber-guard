const API_BASE_URL = "http://localhost:5000";

// Get current URL and check it (works with or without login)
async function checkCurrentURL() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentURL = tabs[0]?.url;
  
  if (!currentURL || currentURL.startsWith("chrome://")) {
    document.getElementById("status").textContent = "Cannot check Chrome URLs";
    return;
  }

  document.getElementById("status").textContent = "🔍 Checking URL...";

  try {
    // Get JWT token if available (optional)
    const jwtToken = await new Promise((resolve) => {
      chrome.storage.local.get("jwtToken", (data) => {
        resolve(data.jwtToken || null);
      });
    });

    // Build request with optional JWT
    const fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: currentURL })
    };

    // Add JWT to header if available (will be saved to history if logged in)
    if (jwtToken) {
      fetchOptions.headers["Authorization"] = `Bearer ${jwtToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/predict`, fetchOptions);

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

    // Show note if not logged in
    if (!jwtToken) {
      const loginNote = document.createElement("p");
      loginNote.textContent = "(Not saving to history - login to save scans)";
      loginNote.style.fontSize = "12px";
      loginNote.style.color = "#999";
      loginNote.style.marginTop = "8px";
      document.body.appendChild(loginNote);
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

  if (autoCheckEnabled) {
    document.getElementById("status").textContent = "Auto check enabled ✅";
    checkCurrentURL();
  } else {
    document.getElementById("status").textContent = "Auto check disabled ❌";
    if (!hasToken) {
      const note = document.createElement("p");
      note.textContent = "(Login to save scans to history)";
      note.style.fontSize = "12px";
      note.style.color = "#999";
      document.body.appendChild(note);
    }
  }
});
