
function getStorageKey() {

  const d = new Date();

  return `acts_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}


async function saveLeetcodeEntry(problemName) {

  try {

    const STORAGE_KEY = getStorageKey();

    const result =
      await chrome.storage.local.get([
        STORAGE_KEY
      ]);

    const state =
      result[STORAGE_KEY] || {
        entries: [],
        complete: false
      };

    const alreadyExists =
      state.entries.some(
        (e) =>
          e.platform === "LeetCode" &&
          e.desc === problemName
      );

    if (alreadyExists) return;

    state.entries.push({
      platform: "LeetCode",
      desc: problemName,
      dur: null,
      time: Date.now(),
      auto: true
    });

    await chrome.storage.local.set({
      [STORAGE_KEY]: state
    });
    console.log("data which will store",state);
    console.log(
      "Saved LeetCode activity:",
      problemName
    );

    showToast(
      `✅ ${problemName} saved`
    );

  } catch (err) {

    console.log(
      "Extension invalidated:",
      err
    );
  }
}


function showToast(msg) {

  const old =
    document.getElementById("leet-toast");

  if (old) old.remove();

  const el = document.createElement("div");

  el.id = "leet-toast";

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
    box-shadow: 0 4px 12px rgba(0,0,0,0.3)
  `;

  document.body.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}

function getProblemName() {

  return document.title
    .replace(" - LeetCode", "")
    .trim();
}

let lastAccepted = "";

function detectAccepted() {

  const text = document.body.innerText;

  if (
    text.includes("Accepted") &&
    window.location.pathname.includes("/problems/")
  ) {

    const problem = getProblemName();

    if (problem !== lastAccepted) {

      lastAccepted = problem;

      saveLeetcodeEntry(problem);
    }
  }
}

const observer = new MutationObserver(() => {

  detectAccepted();

});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

const originalFetch = window.fetch;

window.fetch = async function (...args) {

  const response =
    await originalFetch.apply(this, args);

  try {

    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0]?.url || "";
    console.log("Fetch URL:", url);
    if (
      url.includes("submit") ||
      url.includes("check")
    ) {

      response
        .clone()
        .json()
        .then((data) => {

          if (
            data?.status_msg === "Accepted"
          ) {

            const problem =
              getProblemName();

            if (problem !== lastAccepted) {

              lastAccepted = problem;

              saveLeetcodeEntry(problem);
            }
          }
        })
        .catch(() => {});
    }

  } catch {}

  return response;
};

