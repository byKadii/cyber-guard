chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("chrome-extension://")
  ) {
    // Check if auto-check is enabled
    chrome.storage.local.get("autoCheck", (data) => {
      // Only proceed if autoCheck is enabled
      if (data.autoCheck === true) {
        fetch("http://127.0.0.1:5000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: tab.url })
        })
        .then(response => response.json())
        .then(data => {
          const rawPrediction = (data.prediction || "").toLowerCase();

          // ✅ تصنيف واضح: إما ضار أو آمن فقط
          const prediction = ["malicious", "phishing", "unsafe"].includes(rawPrediction)
            ? "malicious"
            : "benign";

          // ✅ نوتيفيكيشن النظام الرسائل 
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: prediction === "benign" ? "Safe Site ✅" : "Unsafe Site ⚠️",
            message: prediction === "benign"
              ? "This site is considered safe."
              : "Warning: This site has been blocked for your safety.",
            priority: 2
          });

          // ✅ إذا الموقع ضار → نافذة تحذير + إغلاق التبويب
          if (prediction === "malicious") {
            chrome.windows.create({
              url: chrome.runtime.getURL("warning.html") + "?url=" + encodeURIComponent(tab.url),
              type: "popup",
              width: 400,
              height: 300
            });

            chrome.tabs.remove(tabId);
            return;
          }
          // ✅ إذا الموقع آمن → بوب أب داخل الصفحة بنفس الرسالة السابقة
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
              const div = document.createElement("div");
              div.textContent = "✅ This site is considered safe";
              div.style.position = "fixed";
              div.style.top = "20px";
              div.style.right = "20px";
              div.style.width = "300px";
              div.style.height = "100px";
              div.style.background = "#d4edda";
              div.style.color = "#000";
              div.style.display = "flex";
              div.style.alignItems = "center";
              div.style.justifyContent = "center";
              div.style.fontSize = "20px";
              div.style.fontWeight = "bold";
              div.style.border = "2px solid #ccc";
              div.style.borderRadius = "12px";
              div.style.zIndex = "9999";
              div.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
              document.body.appendChild(div);

              setTimeout(() => div.remove(), 5000);
            }
          });
        })
        .catch(error => console.error("Prediction error:", error));
      }
    });
  }
});