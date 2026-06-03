/**
 * Activity calendar picker (IST). Days with logged activities show a check mark.
 */
const ActivityCalendar = (() => {
  const IST = "Asia/Kolkata";
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  let viewYear = 0;
  let viewMonth = 0;
  let activeDays = new Map();
  let onSelect = null;
  let apiFetch = null;

  function parseISO(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return { year: y, month: m, day: d };
  }

  function formatDisplay(iso) {
    const { year, month, day } = parseISO(iso);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: IST,
    });
  }

  function todayISO() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: IST,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function isoFromParts(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function getSelectedISO() {
    return document.getElementById("date-picker")?.value || todayISO();
  }

  function setSelectedISO(iso) {
    const input = document.getElementById("date-picker");
    const display = document.getElementById("date-display");
    if (input) input.value = iso;
    if (display) display.textContent = formatDisplay(iso);
  }

  function isOpen() {
    return !document.getElementById("calendar-popover")?.classList.contains("hidden");
  }

  function setOpen(open) {
    const popover = document.getElementById("calendar-popover");
    const trigger = document.getElementById("date-trigger");
    if (!popover || !trigger) return;

    popover.classList.toggle("hidden", !open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      const selected = parseISO(getSelectedISO());
      viewYear = selected.year;
      viewMonth = selected.month;
      render();
    }
  }

  async function loadMonth(year, month) {
    if (!apiFetch) return;
    try {
      const data = await apiFetch(
        `/api/activities/calendar?year=${year}&month=${month}`
      );
      activeDays = new Map();
      for (const row of data.days || []) {
        const key =
          typeof row.date === "string"
            ? row.date.slice(0, 10)
            : row.date;
        activeDays.set(key, row.count);
      }
    } catch (err) {
      console.warn("[calendar] Could not load activity days:", err);
      activeDays = new Map();
    }
  }

  function checkIcon() {
    return `<span class="cal-check" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" fill="currentColor" opacity="0.2"/>
        <circle cx="11" cy="11" r="10" stroke="currentColor" stroke-width="1.5"/>
        <path d="M7 11.2l2.4 2.4L15 8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`;
  }

  async function render() {
    const grid = document.getElementById("cal-grid");
    const title = document.getElementById("cal-title");
    if (!grid || !title) return;

    title.textContent = `${MONTHS[viewMonth - 1]} ${viewYear}`;
    grid.innerHTML = '<p class="cal-loading muted">Loading…</p>';

    await loadMonth(viewYear, viewMonth);

    const selected = getSelectedISO();
    const today = todayISO();
    const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    for (let i = 0; i < firstDow; i++) {
      cells.push('<span class="cal-cell cal-cell--empty"></span>');
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = isoFromParts(viewYear, viewMonth, day);
      const count = activeDays.get(iso) || 0;
      const hasActivity = count > 0;
      const isSelected = iso === selected;
      const isToday = iso === today;
      const isFuture = iso > today;

      const classes = [
        "cal-cell",
        "cal-day",
        hasActivity ? "cal-day--active" : "",
        isSelected ? "cal-day--selected" : "",
        isToday ? "cal-day--today" : "",
        isFuture ? "cal-day--future" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const label = hasActivity
        ? `${day}: ${count} ${count === 1 ? "activity" : "activities"}`
        : `${day}`;

      const inner = hasActivity
        ? `${checkIcon()}<span class="cal-day-num">${day}</span>`
        : `<span class="cal-day-num">${day}</span>`;

      cells.push(
        `<button type="button" class="${classes}" data-date="${iso}" aria-label="${label}" ${
          isFuture ? "disabled" : ""
        }>${inner}</button>`
      );
    }

    grid.innerHTML = cells.join("");
  }

  function selectDate(iso) {
    setSelectedISO(iso);
    setOpen(false);
    if (onSelect) onSelect(iso);
  }

  function shiftMonth(delta) {
    viewMonth += delta;
    if (viewMonth > 12) {
      viewMonth = 1;
      viewYear += 1;
    } else if (viewMonth < 1) {
      viewMonth = 12;
      viewYear -= 1;
    }
    render();
  }

  function init({ fetchApi, onDateSelect }) {
    apiFetch = fetchApi;
    onSelect = onDateSelect;

    const iso = todayISO();
    setSelectedISO(iso);
    const { year, month } = parseISO(iso);
    viewYear = year;
    viewMonth = month;

    document.getElementById("date-trigger")?.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    document.getElementById("cal-prev")?.addEventListener("click", (e) => {
      e.stopPropagation();
      shiftMonth(-1);
    });

    document.getElementById("cal-next")?.addEventListener("click", (e) => {
      e.stopPropagation();
      shiftMonth(1);
    });

    document.getElementById("cal-grid")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-date]");
      if (!btn || btn.disabled) return;
      selectDate(btn.dataset.date);
    });

    document.addEventListener("click", (e) => {
      const selector = document.getElementById("date-selector");
      if (isOpen() && selector && !selector.contains(e.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) setOpen(false);
    });
  }

  return {
    init,
    setSelectedISO,
    getSelectedISO,
    todayISO,
    formatDisplay,
    refresh: () => {
      if (isOpen()) render();
    },
  };
})();
