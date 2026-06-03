window.postMessage(
    {
      source: "dev-activity-tracker",
      type: "LEETCODE_ACCEPTED",
      problem,
    },
    "*"
  );