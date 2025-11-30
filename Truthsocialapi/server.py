"""FastAPI server for Truth Social investment sentiment analysis."""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the investment client
try:
    # When installed as a package (Docker, pip install)
    from truthbrush.investment_client import InvestmentClient, SECTORS
except ImportError:
    # When running locally with nested folder structure
    from truthbrush.truthbrush.investment_client import InvestmentClient, SECTORS

app = FastAPI(
    title="Truth Social Investment API",
    description="API for fetching investment-related posts from Truth Social",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the investment client
client: Optional[InvestmentClient] = None


def get_client() -> InvestmentClient:
    """Get or create the investment client."""
    global client
    if client is None:
        username = os.getenv("TRUTHSOCIAL_USERNAME")
        password = os.getenv("TRUTHSOCIAL_PASSWORD")
        token = os.getenv("TRUTHSOCIAL_TOKEN")

        if token:
            client = InvestmentClient(token=token)
        elif username and password:
            client = InvestmentClient(username=username, password=password)
        else:
            raise HTTPException(
                status_code=401,
                detail="No credentials provided. Set TRUTHSOCIAL_USERNAME/PASSWORD or TRUTHSOCIAL_TOKEN",
            )
    return client


class SectorInfo(BaseModel):
    """Information about a market sector."""
    name: str
    hashtags: list[str]
    description: str


class PostResponse(BaseModel):
    """Response model for posts."""
    url: Optional[str] = None
    content: str
    author_handle: str = ""
    author_display_name: str = ""
    author_followers: int = 0
    engagement: int = 0
    replies_count: int = 0
    reblogs_count: int = 0
    favourites_count: int = 0
    created_at: Optional[str] = None


class TrendingResponse(BaseModel):
    """Response model for trending posts."""
    sector: str
    hashtags: list[str]
    posts: list[PostResponse]
    sources: list[str] = []


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Truth Social Investment API", "status": "running"}


@app.get("/sectors")
async def list_sectors():
    """List all available sectors."""
    try:
        return {"sectors": list(SECTORS.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sectors/{sector}")
async def get_sector_info(sector: str):
    """Get information about a specific sector."""
    try:
        if sector not in SECTORS:
            raise HTTPException(
                status_code=404,
                detail=f"Sector '{sector}' not found. Available: {list(SECTORS.keys())}",
            )
        sector_info = SECTORS[sector]
        return SectorInfo(
            name=sector,
            hashtags=sector_info.hashtags,
            description=f"Investment sector for {sector_info.name}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sectors/{sector}/trending", response_model=TrendingResponse)
async def get_sector_trending(sector: str, limit: int = 10):
    """Get trending posts for a sector from government officials."""
    try:
        if sector not in SECTORS:
            raise HTTPException(
                status_code=404,
                detail=f"Sector '{sector}' not found",
            )

        inv_client = get_client()
        result = inv_client.get_government_posts_for_sector(sector, limit=limit)
        posts = result.get("posts", [])
        sources = result.get("sources", [])

        return TrendingResponse(
            sector=sector,
            hashtags=SECTORS[sector].hashtags,
            sources=sources,
            posts=[
                PostResponse(
                    url=getattr(p, "url", None),
                    content=getattr(p, "content", ""),
                    author_handle=getattr(p, "author_handle", ""),
                    author_display_name=getattr(p, "author_display_name", ""),
                    author_followers=getattr(p, "author_followers", 0),
                    engagement=getattr(p, "engagement", 0),
                    replies_count=getattr(p, "replies_count", 0),
                    reblogs_count=getattr(p, "reblogs_count", 0),
                    favourites_count=getattr(p, "favourites_count", 0),
                    created_at=getattr(p, "created_at", None),
                )
                for p in posts
            ],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sectors/{sector}/posts", response_model=TrendingResponse)
async def get_sector_posts(sector: str, top_n: int = 10):
    """Get top posts for a sector by engagement."""
    try:
        if sector not in SECTORS:
            raise HTTPException(
                status_code=404,
                detail=f"Sector '{sector}' not found",
            )

        inv_client = get_client()
        posts = inv_client.get_sector_posts_by_hashtag(sector, limit=top_n * 2)

        # Sort by engagement and take top_n
        sorted_posts = sorted(posts, key=lambda x: getattr(x, "engagement", 0), reverse=True)[:top_n]

        return TrendingResponse(
            sector=sector,
            hashtags=SECTORS[sector].hashtags,
            posts=[
                PostResponse(
                    url=getattr(p, "url", None),
                    content=getattr(p, "content", ""),
                    author_handle=getattr(p, "author_handle", ""),
                    author_display_name=getattr(p, "author_display_name", ""),
                    author_followers=getattr(p, "author_followers", 0),
                    engagement=getattr(p, "engagement", 0),
                    replies_count=getattr(p, "replies_count", 0),
                    reblogs_count=getattr(p, "reblogs_count", 0),
                    favourites_count=getattr(p, "favourites_count", 0),
                    created_at=getattr(p, "created_at", None),
                )
                for p in sorted_posts
            ],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
