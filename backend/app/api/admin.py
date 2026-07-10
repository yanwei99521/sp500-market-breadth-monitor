"""
/admin/* — Management endpoints for manual data updates and market rules CRUD.

Auth: X-Admin-Token header must match ADMIN_TOKEN env var (default: "stock-admin").
"""
import json
import logging
import os
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Header

from app.database import get_conn
from app.models import (
    AdminStatus,
    DataSourceStatus,
    LogEntry,
    MarketRule,
    MarketRuleCreate,
    MarketRuleUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin")

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "stock-admin")


def _require_auth(x_admin_token: str | None = Header(default=None)) -> None:
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Status ───────────────────────────────────────────────────────────────────

@router.get("/status", response_model=AdminStatus)
def get_status(_: None = Depends(_require_auth)):
    """Return last update date and row count for every data source."""
    with get_conn() as conn:
        def _query(table: str, date_col: str) -> tuple[str | None, int]:
            row = conn.execute(
                f"SELECT MAX({date_col}), COUNT(*) FROM {table}"
            ).fetchone()
            return (row[0], row[1]) if row else (None, 0)

        bh_date, bh_count = _query("breadth_history", "date")
        cs_date, cs_count = _query("call_skew_history", "date")
        pr_date, pr_count = _query("daily_prices", "date")
        vix_date, vix_count = _query("vix_history", "date")
        fng_date, fng_count = _query("fng_history", "date")
        qqq_date, qqq_count = _query("qqq_history", "date")
        cape_date, cape_count = _query("cape_history", "month")

    return AdminStatus(
        sources=[
            DataSourceStatus(id="breadth", name="MA宽度（breadth_history）",
                             last_date=bh_date, row_count=bh_count),
            DataSourceStatus(id="call-skew", name="Call Skew（call_skew_history）",
                             last_date=cs_date, row_count=cs_count),
            DataSourceStatus(id="vix", name="VIX 恐慌指数（vix_history）",
                             last_date=vix_date, row_count=vix_count),
            DataSourceStatus(id="fng", name="Fear & Greed Index（fng_history）",
                             last_date=fng_date, row_count=fng_count),
            DataSourceStatus(id="three-signals", name="三信号框架（QQQ/CAPE）",
                             last_date=max([d for d in [qqq_date, cape_date] if d], default=None),
                             row_count=qqq_count + cape_count),
            DataSourceStatus(id="prices", name="个股价格（daily_prices）",
                             last_date=pr_date, row_count=pr_count),
        ]
    )


# ── Logs ──────────────────────────────────────────────────────────────────────

LOG_DIR = Path(__file__).parent.parent.parent / "logs"


def _parse_log_line(line: str) -> LogEntry | None:
    """Parse a log line in the format: YYYY-MM-DD HH:MM:SS,mmm LEVEL name — message."""
    # Format: 2026-05-19 08:41:02,519 ERROR app.services.call_skew — Failed to fetch QQQ call skew
    if " — " not in line:
        return None
    prefix, message = line.split(" — ", 1)
    parts = prefix.split(None, 3)
    if len(parts) < 4:
        return None
    date_part, time_part, level, name = parts[0], parts[1], parts[2], parts[3]
    return LogEntry(
        timestamp=f"{date_part} {time_part}",
        level=level,
        name=name,
        message=message,
    )


@router.get("/logs", response_model=list[LogEntry])
def get_logs(
    tail: int = 100,
    level: str | None = None,
    _: None = Depends(_require_auth),
):
    """Return the most recent log lines from backend.log and backend-error.log."""
    tail = min(max(tail, 1), 500)  # clamp 1-500
    entries: list[LogEntry] = []

    for log_file in ["backend.log", "backend-error.log"]:
        path = LOG_DIR / log_file
        if not path.exists():
            continue
        # Read last N lines efficiently
        with open(path, "r", encoding="utf-8") as f:
            # Use deque for memory-efficient tail
            from collections import deque
            lines = deque(f, maxlen=tail)

        for line in lines:
            line = line.strip()
            if not line:
                continue
            entry = _parse_log_line(line)
            if entry:
                entries.append(entry)

    # Sort by timestamp, return newest first
    entries.sort(key=lambda e: e.timestamp, reverse=True)

    # Filter by level if specified
    if level:
        level_upper = level.upper()
        entries = [e for e in entries if e.level == level_upper]

    return entries[:tail]


# ── Manual updates ────────────────────────────────────────────────────────────

@router.post("/update/breadth")
def update_breadth(_: None = Depends(_require_auth)):
    """Incrementally fetch prices and recalculate breadth."""
    from app.services import calculator, fetcher, sp500
    try:
        tickers = sp500.get_tickers()
        if not tickers:
            tickers = sp500.refresh()
        fetcher.update_incremental(tickers)
        calculator.run_incremental_calculation()
        return {"ok": True, "message": "宽度数据更新完成"}
    except Exception as e:
        logger.exception("Manual breadth update failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update/call-skew")
def update_call_skew(_: None = Depends(_require_auth)):
    """Fetch latest QQQ call skew."""
    from app.services import call_skew
    try:
        call_skew.fetch_and_store()
        return {"ok": True, "message": "Call Skew 更新完成"}
    except Exception as e:
        logger.exception("Manual call-skew update failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update/vix")
def update_vix(_: None = Depends(_require_auth)):
    """Fetch latest VIX data."""
    from app.services import vix_fetcher
    try:
        n = vix_fetcher.fetch_and_store()
        return {"ok": True, "message": f"VIX 数据更新完成，共处理 {n} 条记录"}
    except Exception as e:
        logger.exception("Manual VIX update failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update/fng")
def update_fng(_: None = Depends(_require_auth)):
    """Fetch latest Fear & Greed data."""
    from app.services import fng_fetcher
    try:
        n = fng_fetcher.fetch_and_store()
        return {"ok": True, "message": f"Fear & Greed 数据更新完成，共处理 {n} 条记录"}
    except Exception as e:
        logger.exception("Manual F&G update failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update/three-signals")
def update_three_signals(_: None = Depends(_require_auth)):
    """Fetch latest QQQ and CAPE data for the three-signal framework."""
    from app.services import three_signals
    try:
        result = three_signals.fetch_and_store()
        return {
            "ok": True,
            "message": f"三信号数据更新完成：QQQ {result['qqq']} 条，CAPE {result['cape']} 条",
        }
    except Exception as e:
        logger.exception("Manual three-signals update failed")
        raise HTTPException(status_code=500, detail=str(e))


# ── Market Rules CRUD ─────────────────────────────────────────────────────────

def _row_to_rule(row) -> MarketRule:
    return MarketRule(
        id=row["id"],
        title=row["title"],
        content=row["content"],
        category=row["category"],
        source=row["source"],
        tags=json.loads(row["tags"] or "[]"),
        is_active=bool(row["is_active"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("/rules", response_model=list[MarketRule])
def list_rules(_: None = Depends(_require_auth)):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM market_rules ORDER BY updated_at DESC"
        ).fetchall()
    return [_row_to_rule(r) for r in rows]


@router.get("/rules/public", response_model=list[MarketRule])
def list_public_rules():
    """Return active market rules (public, no auth required)."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM market_rules WHERE is_active = 1 ORDER BY updated_at DESC"
        ).fetchall()
    return [_row_to_rule(r) for r in rows]


@router.post("/rules", response_model=MarketRule, status_code=201)
def create_rule(body: MarketRuleCreate, _: None = Depends(_require_auth)):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO market_rules (title, content, category, source, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (body.title, body.content, body.category, body.source,
             json.dumps(body.tags, ensure_ascii=False), now, now),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM market_rules WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return _row_to_rule(row)


@router.put("/rules/{rule_id}", response_model=MarketRule)
def update_rule(rule_id: int, body: MarketRuleUpdate, _: None = Depends(_require_auth)):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT * FROM market_rules WHERE id = ?", (rule_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Rule not found")

        fields = {
            "title": body.title if body.title is not None else existing["title"],
            "content": body.content if body.content is not None else existing["content"],
            "category": body.category if body.category is not None else existing["category"],
            "source": body.source if body.source is not None else existing["source"],
            "tags": json.dumps(body.tags, ensure_ascii=False) if body.tags is not None
                    else existing["tags"],
            "is_active": int(body.is_active) if body.is_active is not None
                         else existing["is_active"],
        }

        conn.execute(
            """
            UPDATE market_rules
            SET title=?, content=?, category=?, source=?, tags=?, is_active=?, updated_at=?
            WHERE id=?
            """,
            (*fields.values(), now, rule_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM market_rules WHERE id = ?", (rule_id,)
        ).fetchone()
    return _row_to_rule(row)


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: int, _: None = Depends(_require_auth)):
    with get_conn() as conn:
        conn.execute("DELETE FROM market_rules WHERE id = ?", (rule_id,))
        conn.commit()
