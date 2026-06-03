const API_BASE = "http://127.0.0.1:8000";

async function syncActivityToServer(entry) {
  try {
    const res = await fetch(`${API_BASE}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: entry.platform,
        desc: entry.desc || null,
        dur: entry.dur != null && entry.dur !== "" ? Number(entry.dur) : null,
        time: entry.time,
        auto: Boolean(entry.auto),
      }),
    });

    if (res.status === 409) {
      return { ok: true, duplicate: true };
    }

    if (!res.ok) {
      console.warn("API sync failed:", res.status);
      return { ok: false };
    }

    return { ok: true, duplicate: false };
  } catch (err) {
    console.warn("API unreachable:", err.message);
    return { ok: false };
  }
}
