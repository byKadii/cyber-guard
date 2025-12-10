document.getElementById("enableBtn").addEventListener("click", () => {
  chrome.storage.local.set({ autoCheck: true }, () => {
    document.getElementById("status").textContent = "Auto check enabled ✅";
  });
});

document.getElementById("disableBtn").addEventListener("click", () => {
  chrome.storage.local.set({ autoCheck: false }, () => {
    document.getElementById("status").textContent = "Auto check disabled ❌";
  });
});

chrome.storage.local.get("autoCheck", (data) => {
  document.getElementById("status").textContent =
    data.autoCheck ? "Auto check enabled ✅" : "Auto check disabled ❌";
});
