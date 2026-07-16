"""Public endpoint for the homepage global market ticker."""
from fastapi import APIRouter

from app.services import global_markets

router = APIRouter(prefix="/api/global-markets")


@router.get("/quotes")
def get_global_market_quotes():
    """Return latest available global index prices, cached for one minute."""
    return global_markets.latest_quotes()
