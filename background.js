const API_URL = "http://127.0.0.1:8000/api";

function log(...args) {
  console.log("[DEV-TRACKER][BACKGROUND]", new Date().toISOString(), ...args);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SYNC_ACTIVITY") {
    return false;
  }

  (async () => {
    try {
      log("POST /activities", message.payload);

      const response = await fetch(`${API_URL}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.payload),
      });

      if (response.status === 409) {
        sendResponse({ ok: true, duplicate: true });
        return;
      }

      if (!response.ok) {
        sendResponse({ ok: false, error: `HTTP ${response.status}` });
        return;
      }

      const data = await response.json();
      log("Activity saved:", data);
      sendResponse({ ok: true, data });
    } catch (err) {
      log("API sync failed:", err.message || err);
      sendResponse({ ok: false, error: err.message || String(err) });
    }
  })();

  return true;
});

log("Service worker started");
