
const PLATFORMS = [
  "LeetCode",
  "GeeksForGeeks",
  "YouTube",
  "GitHub"
];

function storageKey() {

  const d = new Date();

  return `acts_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}

async function load() {

  return new Promise((resolve) => {

    chrome.storage.local.get(
      [storageKey()],
      (result) => {

        resolve(
          result[storageKey()] || {
            entries: [],
            complete: false
          }
        );
      }
    );

  });
}

async function save(state) {

  return chrome.storage.local.set({
    [storageKey()]: state
  });
}

async function renderEntries() {

  const s = await load();

  const el =
    document.getElementById("entries-list");

  if (!s.entries.length) {

    el.innerHTML =
      "<p>No activities yet</p>";

    return;
  }

  el.innerHTML = s.entries.map((e) => {

    return `
      <div class="entry">

        <strong>${e.platform}</strong>

        ${e.desc ? ` - ${e.desc}` : ""}

        ${e.auto
          ? `<span class="entry-auto">
              ⚡ auto
            </span>`
          : ""}

      </div>
    `;
  }).join("");
}

async function renderDashboard() {

  const s = await load();

  const total =
    s.entries.length;

  const auto =
    s.entries.filter(
      e => e.auto
    ).length;

  document.getElementById("stats")
    .innerHTML = `

    <div class="card">
      <h3>${total}</h3>
      <p>Total Activities</p>
    </div>

    <div class="card">
      <h3>${auto}</h3>
      <p>Auto Detected</p>
    </div>
  `;
}

async function addEntry() {

  const platform =
    document.getElementById("sel-plat").value;

  const desc =
    document.getElementById("inp-desc")
      .value;

  const dur =
    document.getElementById("inp-dur")
      .value;

  const s = await load();

  s.entries.push({
    platform,
    desc,
    dur,
    time: Date.now(),
    auto: false
  });

  await save(s);

  const created = s.entries[s.entries.length - 1];
  syncActivityToServer(created);

  document.getElementById("inp-desc").value = "";

  document.getElementById("inp-dur").value = "";

  renderEntries();

  renderDashboard();
}

function showTab(tab) {

  document
    .querySelectorAll(".tab")
    .forEach(btn =>
      btn.classList.remove("active")
    );

  document
    .querySelectorAll(".section")
    .forEach(sec =>
      sec.classList.remove("active")
    );

  if (tab === "log") {

    document
      .getElementById("log-tab-btn")
      .classList.add("active");

    document
      .getElementById("tab-log")
      .classList.add("active");

  } else {

    document
      .getElementById("dash-tab-btn")
      .classList.add("active");

    document
      .getElementById("tab-dashboard")
      .classList.add("active");

    renderDashboard();
  }
}

// ===== EVENTS =====

document
  .getElementById("add-btn")
  .addEventListener(
    "click",
    addEntry
  );

document
  .getElementById("log-tab-btn")
  .addEventListener(
    "click",
    () => showTab("log")
  );

document
  .getElementById("dash-tab-btn")
  .addEventListener(
    "click",
    () => showTab("dashboard")
  );

// ===== INIT =====

renderEntries();
renderDashboard();

setInterval(() => {

  renderEntries();

  renderDashboard();

}, 2000);
