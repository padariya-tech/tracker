async function syncActivityToServer(payload, logTag) {
  const tag = logTag || "CONTENT";

  console.log(`[DEV-TRACKER][${tag}] Sending activity via background:`, payload);

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "SYNC_ACTIVITY", payload },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            `[DEV-TRACKER][${tag}] Background message failed:`,
            chrome.runtime.lastError.message
          );
          resolve(null);
          return;
        }

        if (!response?.ok) {
          console.warn(
            `[DEV-TRACKER][${tag}] API sync failed (is uvicorn running on :8000?):`,
            response?.error || "unknown error"
          );
          resolve(null);
          return;
        }

        if (response.duplicate) {
          console.log(
            `[DEV-TRACKER][${tag}] Activity already exists on server:`,
            payload.desc
          );
          resolve(null);
          return;
        }

        console.log(`[DEV-TRACKER][${tag}] Activity saved to API:`, response.data);
        resolve(response.data);
      }
    );
  });
}
