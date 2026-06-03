(() => {
    const MSG_SOURCE = "dev-activity-tracker";
  
    function log(...args) {
      console.log(
        "[DEV-TRACKER][INJECT]",
        new Date().toISOString(),
        ...args
      );
    }
  
    log("Injected script loaded");
  
    let lastAccepted = "";
  
    function sendAccepted(problem) {
      if (!problem) return;
  
      if (problem === lastAccepted) {
        log("Duplicate accepted ignored:", problem);
        return;
      }
  
      lastAccepted = problem;
  
      log("Sending accepted event:", problem);
  
      window.postMessage(
        {
          source: MSG_SOURCE,
          type: "LEETCODE_ACCEPTED",
          problem,
        },
        "*"
      );
    }
  
    function getProblemName() {
      return document.title.replace(" - LeetCode", "").trim();
    }
  
    // ----------------------------
    // FETCH INTERCEPTOR
    // ----------------------------
  
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
    const [url, options] = args;

    const response = await originalFetch(...args);

    try {
        if (
        typeof url === "string" &&
        url.includes("/graphql")
        ) {
        const cloned = response.clone();

        cloned
            .text()
            .then((text) => {
            console.log(
                "[DEV-TRACKER][NETWORK]",
                url
            );

            console.log(
                "[DEV-TRACKER][GRAPHQL RESPONSE]",
                text
            );

            if (
                text.includes("Accepted") ||
                text.includes("statusDisplay")
            ) {
                console.log(
                "[DEV-TRACKER] Possible submission response detected"
                );
            }
            })
            .catch((err) => {
            console.log(
                "[DEV-TRACKER] Response parse failed",
                err
            );
            });
        }
    } catch (err) {
        console.log(
        "[DEV-TRACKER] Fetch hook failed",
        err
        );
    }

    return response;
    };


    // ----------------------------
    // UI OBSERVER
    // ----------------------------
    let acceptedVisible = false;

    function startObserver() {
        console.log(
          "[DEV-TRACKER] MutationObserver started"
        );
      
        const observer = new MutationObserver(() => {
          try {
            const accepted =
              document.body.innerText.includes(
                "Accepted"
              );
      
            if (accepted && !acceptedVisible) {
              acceptedVisible = true;
      
              console.log(
                "[DEV-TRACKER] ACCEPTED APPEARED IN UI"
              );
      
              sendAccepted(getProblemName());
            }
      
            if (!accepted) {
              acceptedVisible = false;
            }
          } catch (err) {
            console.log(
              "[DEV-TRACKER] Observer error",
              err
            );
          }
        });
      
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });
    }
  
    if (document.body) {
      startObserver();
    } else {
      window.addEventListener("load", startObserver);
    }
  
    // ----------------------------
    // SUBMIT CLICK LOGGING
    // ----------------------------
  
    document.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest("button");
  
        if (!btn) return;
  
        const text = btn.innerText?.trim();
  
        if (
          text &&
          text.toLowerCase().includes("submit")
        ) {
          log("SUBMIT BUTTON CLICKED");
        }
      },
      true
    );
  
    log("All detectors initialized");
  })();