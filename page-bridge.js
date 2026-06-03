/**
 * Runs in the page (MAIN world) so we can see LeetCode's real fetch/GraphQL calls.
 * Sends results to leetcode-content.js via postMessage.
 */
(function () {
  const MSG_SOURCE = "dev-activity-tracker";
  const recent = new Map();

  function getProblemName() {
    const fromTitle = document.title
      .replace(/\s*-\s*LeetCode.*$/i, "")
      .trim();
    if (fromTitle && fromTitle !== "LeetCode") {
      return fromTitle;
    }

    const match = location.pathname.match(/\/problems\/([^/]+)/);
    if (match) {
      return match[1]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return "Unknown problem";
  }

  function notifyAccepted() {
    const problem = getProblemName();
    const now = Date.now();
    const last = recent.get(problem);

    if (last && now - last < 3000) {
      return;
    }

    recent.set(problem, now);

    window.postMessage(
      {
        source: MSG_SOURCE,
        type: "LEETCODE_ACCEPTED",
        problem,
      },
      "*"
    );
  }

  function isAcceptedPayload(data) {
    if (!data || typeof data !== "object") {
      return false;
    }

    if (data.status_msg === "Accepted") {
      return true;
    }

    const queue = [data];
    let steps = 0;

    while (queue.length && steps < 40) {
      steps += 1;
      const node = queue.shift();

      if (!node || typeof node !== "object") {
        continue;
      }

      if (node.status === "Accepted" || node.status === "AC") {
        return true;
      }

      if (node.state === "SUCCESS" || node.verdict === "Accepted") {
        return true;
      }

      if (
        node.submissionRunSuccess === true ||
        node.submission_success === true
      ) {
        return true;
      }

      if (Array.isArray(node)) {
        queue.push(...node);
        continue;
      }

      for (const value of Object.values(node)) {
        if (value && typeof value === "object") {
          queue.push(value);
        }
      }
    }

    return false;
  }

  function shouldInspectUrl(url) {
    if (!url || !url.includes("leetcode")) {
      return false;
    }

    return (
      url.includes("graphql") ||
      url.includes("submit") ||
      url.includes("check") ||
      url.includes("interpret")
    );
  }

  function inspectResponse(url, data) {
    if (!shouldInspectUrl(url)) {
      return;
    }

    if (isAcceptedPayload(data)) {
      notifyAccepted();
    }
  }

  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0]?.url || "";

      if (shouldInspectUrl(url)) {
        response
          .clone()
          .json()
          .then((data) => inspectResponse(url, data))
          .catch(() => {});
      }
    } catch (_) {}

    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._devTrackerUrl = String(url || "");
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        const url = this._devTrackerUrl || "";
        if (!shouldInspectUrl(url)) {
          return;
        }

        const data = JSON.parse(this.responseText);
        inspectResponse(url, data);
      } catch (_) {}
    });

    return originalSend.apply(this, args);
  };
})();
