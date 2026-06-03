const API_BASE = window.location.origin;

const $ = (sel) => document.querySelector(sel);

const platformClass = (name) =>
  name.toLowerCase().replace(/\s+/g, "");

const IST = "Asia/Kolkata";

function istDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function todayISO() {
  return ActivityCalendar?.todayISO?.() || istDateISO(new Date());
}

function getSelectedDay() {
  return ActivityCalendar?.getSelectedISO?.() || $("#date-picker")?.value || todayISO();
}

function setSelectedDay(iso) {
  ActivityCalendar?.setSelectedISO?.(iso);
  const input = $("#date-picker");
  if (input) input.value = iso;
}

function formatTime(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return "—";
  return (
    new Date(Number(ms)).toLocaleTimeString("en-IN", {
      timeZone: IST,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }) + " IST"
  );
}

function showError(msg) {
  const el = $("#error-banner");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideError() {
  $("#error-banner").classList.add("hidden");
}

function showInfo(msg) {
  const el = $("#info-banner");
  if (!el) return;
  if (!msg) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = msg;
  el.classList.remove("hidden");
}

async function api(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

function renderActivityItem(entry) {
  const desc = entry.desc || "No description";
  const dur =
    entry.dur != null && entry.dur !== ""
      ? ` · ${entry.dur} min`
      : "";
  const auto = entry.auto
    ? '<span class="tag-auto">auto</span>'
    : "";

  return `
    <li class="activity-item">
      <span class="platform-badge ${platformClass(entry.platform)}">${entry.platform}</span>
      <div class="activity-body">
        <strong>${desc}${auto}</strong>
        <span class="activity-meta">${formatTime(entry.time)}${dur}</span>
      </div>
    </li>
  `;
}

const PLATFORM_COLORS = {
  LeetCode: "#ffa116",
  GeeksForGeeks: "#2e8b57",
  YouTube: "#ff4444",
  GitHub: "#8b949e",
};

function platformColor(name) {
  return PLATFORM_COLORS[name] || "#1d9e75";
}

function pieSlicePath(cx, cy, r, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep >= Math.PI * 2 - 0.0001) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = sweep > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function renderPlatformPie(byPlatform) {
  const container = $("#platform-chart");
  if (!container) {
    console.warn("[dashboard] #platform-chart not found — hard refresh the page");
    return;
  }

  const rows = Array.isArray(byPlatform) ? byPlatform : [];
  if (!rows.length) {
    container.innerHTML = '<p class="empty muted">No data yet</p>';
    return;
  }

  const total = rows.reduce((sum, p) => sum + p.count, 0);
  const cx = 90;
  const cy = 90;
  const r = 72;
  let angle = -Math.PI / 2;

  const slices = rows
    .map((p) => {
      const sweep = (p.count / total) * Math.PI * 2;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const color = platformColor(p.platform);
      return `<path class="pie-slice" d="${pieSlicePath(cx, cy, r, start, end)}" fill="${color}" data-platform="${p.platform}">
        <title>${p.platform}: ${p.count}</title>
      </path>`;
    })
    .join("");

  const legend = rows
    .map((p) => {
      const pct = Math.round((p.count / total) * 100);
      const color = platformColor(p.platform);
      return `
        <li class="pie-legend-item">
          <span class="pie-legend-dot" style="background:${color}"></span>
          <span class="pie-legend-label">${p.platform}</span>
          <span class="pie-legend-value">${p.count} <span class="muted">(${pct}%)</span></span>
        </li>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="pie-chart-layout">
      <svg class="pie-svg" viewBox="0 0 180 180" role="img" aria-label="Activities by platform">
        ${slices}
      </svg>
      <ul class="pie-legend">${legend}</ul>
    </div>
  `;
}

function renderRecentTable(items) {
  const tbody = $("#recent-tbody");
  if (!tbody) {
    console.warn("[dashboard] #recent-tbody not found — hard refresh the page");
    return;
  }

  const list = Array.isArray(items) ? items : [];
  const recent = list.slice(0, 5);

  if (!recent.length) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="empty muted">No activities for this day</td></tr>';
    return;
  }

  tbody.innerHTML = recent
    .map((entry) => {
      const desc = entry.desc || "No description";
      const auto = entry.auto
        ? '<span class="tag-auto">auto</span>'
        : "";
      const dur =
        entry.dur != null && entry.dur !== ""
          ? ` · ${entry.dur} min`
          : "";

      return `
        <tr>
          <td class="cell-platform">
            <span class="platform-badge ${platformClass(entry.platform)}">${entry.platform}</span>
          </td>
          <td class="cell-problem" title="${desc.replace(/"/g, "&quot;")}">
            <span class="problem-name">${desc}</span>${auto}
          </td>
          <td class="cell-time">${formatTime(entry.time)}${dur}</td>
        </tr>
      `;
    })
    .join("");
}

function renderLists(items) {
  const feed = $("#feed-list");

  renderRecentTable(items);

  if (!items.length) {
    feed.innerHTML =
      '<li class="empty muted">No activities for this day</li>';
    return;
  }

  feed.innerHTML = items.map(renderActivityItem).join("");
}

function setStats(stats) {
  if (!stats) return;

  $("#stat-total").textContent = stats.total_activities ?? "—";
  $("#stat-auto").textContent = stats.auto_detected ?? "—";
  $("#stat-manual").textContent = stats.manual_entries ?? "—";
  $("#stat-minutes").textContent = stats.total_minutes ?? "—";
  renderPlatformPie(stats.by_platform);
}

async function loadData({ adjustDateIfEmpty = false } = {}) {
  hideError();
  showInfo("");
  let day = getSelectedDay();
  const platform = $("#platform-filter").value;
  const platformQuery = platform
    ? `&platform=${encodeURIComponent(platform)}`
    : "";

  try {
    let [stats, list] = await Promise.all([
      api(`/api/activities/stats?day=${day}`),
      api(`/api/activities?day=${day}${platformQuery}`),
    ]);

    if (!list.items.length && adjustDateIfEmpty) {
      const recent = await api("/api/activities?limit=1");
      const latest = recent.items[0];
      if (latest?.time) {
        const activityDay = istDateISO(new Date(Number(latest.time)));
        if (activityDay !== day) {
          day = activityDay;
          setSelectedDay(day);
          [stats, list] = await Promise.all([
            api(`/api/activities/stats?day=${day}`),
            api(`/api/activities?day=${day}${platformQuery}`),
          ]);
        }
      }
    }

    setStats(stats);
    renderLists(list.items);

    if (!list.items.length) {
      showInfo(
        `No activities on ${day} (IST). Pick another date or clear the platform filter.`
      );
    }
  } catch (err) {
    console.error("[dashboard] loadData failed:", err);
    const isNetwork =
      err.message === "Failed to fetch" ||
      err.message?.includes("NetworkError");
    showError(
      isNetwork
        ? `Could not reach the API. Start the server: cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
        : `Dashboard error: ${err.message}. Try a hard refresh (Cmd+Shift+R).`
    );
  }
}

function setView(view) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });

  const titles = {
    overview: ["Overview", "Your coding activity at a glance"],
    feed: ["Activity feed", "All logged activities for the selected day"],
  };
  const [title, sub] = titles[view] || titles.overview;
  $("#page-title").textContent = title;
  $("#page-subtitle").textContent = sub;
}

function init() {
  ActivityCalendar.init({
    fetchApi: api,
    onDateSelect: () => loadData(),
  });

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });

  $("#platform-filter").addEventListener("change", loadData);
  $("#refresh-btn").addEventListener("click", () => {
    ActivityCalendar.refresh();
    loadData();
  });

  loadData({ adjustDateIfEmpty: true });
}

init();
