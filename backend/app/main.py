import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import scheduler
from app.api.admin import router as admin_router
from app.api.breadth import router as breadth_router
from app.api.call_skew import router as call_skew_router
from app.api.fng import router as fng_router
from app.api.indicators import router as indicators_router
from app.api.three_signals import router as three_signals_router
from app.api.vix import router as vix_router
from app.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

# frontend/dist is built by `cd frontend && pnpm build`
FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"

app = FastAPI(title="美股量化指标 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# ── API routers (must come before catch-all) ──────────────────────────────────
app.include_router(breadth_router)
app.include_router(call_skew_router)
app.include_router(fng_router)
app.include_router(vix_router)
app.include_router(indicators_router)
app.include_router(three_signals_router)
app.include_router(admin_router)


@app.on_event("startup")
async def startup() -> None:
    init_db()
    scheduler.start()


@app.on_event("shutdown")
async def shutdown() -> None:
    scheduler.stop()


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Static frontend (production mode) ────────────────────────────────────────
# Mounted last so API routes take priority.
# Activated only when frontend/dist exists (after `pnpm build`).
if FRONTEND_DIST.exists():
    _assets = FRONTEND_DIST / "assets"
    if _assets.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    _index = FRONTEND_DIST / "index.html"

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        """Serve index.html for all non-API paths so React Router works."""
        return FileResponse(str(_index))
