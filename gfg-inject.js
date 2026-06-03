(() => {
  const MSG_SOURCE = "dev-activity-tracker";

  const SUCCESS_SELECTORS = [
    ".problems_problem_solved_successfully__Zb4yG",
    "[class*='problem_solved_successfully']",
    "[class*='ProblemSuccess']",
  ];

  function log(...args) {
    console.log(
      "[DEV-TRACKER][GFG-INJECT]",
      new Date().toISOString(),
      ...args
    );
  }

  log("Injected script loaded");

  let lastAccepted = "";
  let successVisible = false;

  function getProblemName() {
    const fromTitle = document.title.split("|")[0].trim();
    if (fromTitle) {
      return fromTitle;
    }

    const heading = document.querySelector("h1, h2");
    if (heading?.textContent?.trim()) {
      return heading.textContent.trim();
    }

    log("Could not resolve problem name from page");
    return "Unknown GFG problem";
  }

  function isSuccessVisible() {
    for (const selector of SUCCESS_SELECTORS) {
      if (document.querySelector(selector)) {
        return true;
      }
    }

    const bodyText = document.body?.innerText || "";
    return (
      bodyText.includes("Problem Solved Successfully") ||
      bodyText.includes("Correct Answer")
    );
  }

  function sendAccepted(problem) {
    if (!problem) {
      log("Skipped empty problem name");
      return;
    }

    if (problem === lastAccepted) {
      log("Duplicate accepted ignored:", problem);
      return;
    }

    lastAccepted = problem;

    log("Sending accepted event:", problem);

    window.postMessage(
      {
        source: MSG_SOURCE,
        type: "GFG_ACCEPTED",
        problem,
      },
      "*"
    );
  }

  function startObserver() {
    log("MutationObserver started");

    const observer = new MutationObserver(() => {
      try {
        const visible = isSuccessVisible();

        if (visible && !successVisible) {
          successVisible = true;
          log("SUCCESS UI appeared");
          sendAccepted(getProblemName());
        }

        if (!visible) {
          successVisible = false;
        }
      } catch (err) {
        log("Observer error:", err);
      }
    });

    const target = document.documentElement || document.body;

    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    } else {
      log("No DOM target for observer yet");
    }
  }

  if (document.documentElement) {
    startObserver();
  } else {
    window.addEventListener("DOMContentLoaded", startObserver);
  }

  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("button");

      if (!btn) {
        return;
      }

      const text = btn.innerText?.trim();

      if (text && text.toLowerCase().includes("submit")) {
        log("Submit button clicked");
      }
    },
    true
  );

  log("All detectors initialized");
})();
