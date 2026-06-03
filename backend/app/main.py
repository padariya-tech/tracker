from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from starlette.staticfiles import StaticFiles
from starlette.types import Scope

from app.config import settings
from app.database import Base, engine
from app.routers import activities

DASHBOARD_DIR = Path(__file__).resolve().parents[2] / "dashboard"


class DashboardStaticFiles(StaticFiles):
    """Serve dashboard assets without aggressive browser caching during development."""

    async def get_response(self, path: str, scope: Scope):
        response = await super().get_response(path, scope)
        if path.endswith((".js", ".css", ".html")):
            response.headers["Cache-Control"] = "no-cache, must-revalidate"
        return response


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Dev Activity Tracker API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(activities.router)

if DASHBOARD_DIR.is_dir():
    app.mount(
        "/dashboard",
        DashboardStaticFiles(directory=str(DASHBOARD_DIR), html=True),
        name="dashboard",
    )


@app.get("/")
def root():
    return RedirectResponse(url="/dashboard/")


@app.get("/health")
def health():
    return {"status": "ok"}
