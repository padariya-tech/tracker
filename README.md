# Dev Activity Tracker

Chrome extension for logging dev activities (LeetCode, GeeksForGeeks, YouTube, GitHub) with a **FastAPI + SQLite** backend and a **web dashboard**.

## Quick start

### 1. Backend API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API docs: http://127.0.0.1:8000/docs
- Dashboard: http://127.0.0.1:8000/dashboard/
- Health: http://127.0.0.1:8000/health

### 2. Chrome extension

Load the project folder as an unpacked extension in `chrome://extensions`. Activities saved in the popup or auto-detected on LeetCode sync to `http://127.0.0.1:8000` when the API is running.

Change the API URL in `api.js` if needed.

### LeetCode auto-detect not working?

1. Reload the extension on `chrome://extensions` after pulling updates.
2. Open a problem at `https://leetcode.com/problems/...` (not only the home page).
3. After **Accepted**, you should see a green toast bottom-right and the entry in the popup.
4. **Dashboard/API sync** only works if the backend is running (`uvicorn ...`). Local popup storage works without the API.

LeetCode detection uses `page-bridge.js` in the page context (required because normal content scripts cannot see LeetCode's network calls).

## API routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/activities` | Create activity (`platform`, `desc`, `dur`, `time`, `auto`) |
| `GET` | `/api/activities` | List activities (`?day=YYYY-MM-DD`, `?platform=`) |
| `GET` | `/api/activities/stats` | Dashboard stats for a day |
| `GET` | `/api/activities/{id}` | Get one activity |
| `DELETE` | `/api/activities/{id}` | Delete activity |

Duplicate entries (same platform + description on the same day) return `409`.

## Project layout

```
tracker/
├── api.js              # Extension → API sync
├── leetcode-content.js # LeetCode auto-detect
├── gfg-content.js      # GeeksForGeeks content script
├── gfg-inject.js       # GeeksForGeeks page-world detector
├── popup.html / popup.js
├── backend/            # FastAPI + SQLAlchemy
└── dashboard/          # Static web UI (served by FastAPI)
```
