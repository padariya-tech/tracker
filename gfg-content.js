const script = document.createElement("script");

script.src = chrome.runtime.getURL("gfg-inject.js");
script.onload = () => script.remove();

(document.head || document.documentElement).appendChild(script);

const MSG_SOURCE = "dev-activity-tracker";

function log(...args) {
  console.log(
    "[DEV-TRACKER][GFG]",
    new Date().toISOString(),
    ...args
  );
}

function getStorageKey() {
  const d = new Date();
  return `acts_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}

function showToast(msg) {
  const old = document.getElementById("gfg-toast");

  if (old) {
    old.remove();
  }

  const el = document.createElement("div");

  el.id = "gfg-toast";
  el.innerText = msg;

  el.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #1D9E75;
      color: white;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-family: sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  document.body.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}

async function saveGfgEntry(problemName) {
  try {
    const STORAGE_KEY = getStorageKey();

    const result = await chrome.storage.local.get([STORAGE_KEY]);

    const state = result[STORAGE_KEY] || {
      entries: [],
      complete: false,
    };

    const alreadyExists = state.entries.some(
      (e) => e.platform === "GeeksForGeeks" && e.desc === problemName
    );

    if (alreadyExists) {
      log("Already saved today, but sending anyway:", problemName);
      await syncGfgToServer("GeeksForGeeks", problemName);
      return;
    }

    const entry = {
      platform: "GeeksForGeeks",
      desc: problemName,
      dur: null,
      time: Date.now(),
      auto: true,
    };

    state.entries.push(entry);

    await chrome.storage.local.set({
      [STORAGE_KEY]: state,
    });

    log("Saved GFG activity:", problemName);
    showToast(`Saved: ${problemName}`);
    await syncGfgToServer("GeeksForGeeks", problemName);
  } catch (err) {
    log("Save failed:", err);
  }
}

window.addEventListener("message", async (event) => {
  if (event.source !== window) {
    return;
  }

  const data = event.data;

  if (!data || data.source !== MSG_SOURCE) {
    return;
  }

  log("Message received:", data);

  if (data.type === "GFG_ACCEPTED") {
    await saveGfgEntry(data.problem);
  }
});

async function syncGfgToServer(platform, problemName) {
  return syncActivityToServer(
    { platform, desc: problemName, auto: true },
    "GFG"
  );
}

log("Content script loaded");
