"""Investment sector client wrapper for Truth Social API."""

import time
from dataclasses import dataclass
from typing import Iterator, Optional
from .api import Api


@dataclass
class SectorQueries:
    """Predefined queries for each investment sector."""

    name: str
    name_de: str
    queries: list[str]
    hashtags: list[str]
    accounts: list[str]


# Official Trump administration accounts for government impact analysis
GOVERNMENT_ACCOUNTS = [
    "realDonaldTrump",
    "WhiteHouse",
    "PressSec",
]

SECTORS = {
    "liquidity": SectorQueries(
        name="Liquidity",
        name_de="Liquidität",
        queries=[
            "cash", "money market", "liquidity", "central bank",
            "federal reserve", "fed", "monetary policy", "interest rates",
            "dollar", "currency", "inflation", "deflation", "printing money",
            "quantitative", "rate cut", "rate hike", "banking"
        ],
        hashtags=["FederalReserve", "ECB", "monetarypolicy", "interestrates", "centralbank"],
        accounts=["FederalReserve", "ECB", "fed", "centralbank"]
    ),
    "stocks": SectorQueries(
        name="Stocks",
        name_de="Aktien",
        queries=[
            "stock market", "stocks", "equity", "shares", "nasdaq",
            "dow jones", "dow", "s&p", "trading", "earnings",
            "wall street", "investor", "market", "rally", "crash",
            "bull", "bear", "sec", "regulation"
        ],
        hashtags=["stocks", "stockmarket", "nasdaq", "DowJones", "SP500", "wallstreet"],
        accounts=["stocks", "investing", "wallstreet", "nasdaq"]
    ),
    "bonds": SectorQueries(
        name="Bonds",
        name_de="Anleihen",
        queries=[
            "bonds", "treasury", "treasuries", "fixed income", "yield",
            "interest rates", "government debt", "national debt", "deficit",
            "debt ceiling", "credit", "rating", "downgrade"
        ],
        hashtags=["bonds", "treasury", "fixedincome", "yields", "debt"],
        accounts=["bonds", "treasury", "fixedincome"]
    ),
    "commodities": SectorQueries(
        name="Commodities",
        name_de="Rohstoffe",
        queries=[
            "commodities", "gold", "silver", "oil", "gas", "natural gas",
            "metals", "copper", "precious metals", "opec", "drilling",
            "mining", "tariff", "import", "export", "price"
        ],
        hashtags=["gold", "silver", "oil", "commodities", "metals"],
        accounts=["gold", "commodities", "metals", "oil"]
    ),
    "crypto": SectorQueries(
        name="Crypto currencies",
        name_de="Kryptowährungen",
        queries=[
            "bitcoin", "btc", "ethereum", "cryptocurrency", "crypto",
            "blockchain", "defi", "web3", "digital currency", "digital asset",
            "coinbase", "sec", "regulation", "stablecoin"
        ],
        hashtags=["bitcoin", "ethereum", "crypto", "blockchain", "defi", "web3"],
        accounts=["bitcoin", "crypto", "ethereum", "blockchain"]
    ),
    "real-estate": SectorQueries(
        name="Real estate",
        name_de="Immobilien",
        queries=[
            "real estate", "property", "housing", "home", "homes",
            "commercial property", "reit", "mortgage", "rent", "building",
            "construction", "development", "zoning", "affordable housing"
        ],
        hashtags=["realestate", "property", "housing", "REIT", "mortgage"],
        accounts=["realestate", "property", "housing"]
    ),
    "art-collectibles": SectorQueries(
        name="Art and collectibles",
        name_de="Kunst & Sammlerstücke",
        queries=[
            "art", "auction", "collectibles", "sotheby", "christie",
            "luxury", "fine art", "antiques", "museum", "culture",
            "heritage", "nft"
        ],
        hashtags=["art", "collectibles", "auction", "luxury", "antiques"],
        accounts=["art", "collectibles", "auction", "luxury"]
    ),
    "private-equity": SectorQueries(
        name="Private equity",
        name_de="Private Equity",
        queries=[
            "private equity", "venture capital", "m&a", "merger", "acquisition",
            "buyout", "startup", "ipo", "investment", "deal",
            "billion", "million", "fund", "investor"
        ],
        hashtags=["privateequity", "venturecapital", "startup", "IPO", "acquisitions"],
        accounts=["privateequity", "venturecapital", "startup"]
    ),
    "direct-holdings": SectorQueries(
        name="Direct holdings",
        name_de="Direktbeteiligungen",
        queries=[
            "direct investment", "mezzanine", "growth capital",
            "private placement", "equity stake", "ownership", "stake",
            "company", "business", "enterprise"
        ],
        hashtags=["investment", "equity", "capital", "funding"],
        accounts=["investment", "capital", "equity"]
    ),
    "alternative-energy": SectorQueries(
        name="Alternative energies",
        name_de="Alternative Energien",
        queries=[
            "solar", "wind", "renewable", "clean energy", "green energy",
            "ev", "electric vehicle", "tesla", "battery", "climate",
            "emissions", "carbon", "oil", "gas", "drilling", "pipeline",
            "energy", "power", "grid", "nuclear"
        ],
        hashtags=["solar", "renewable", "cleanenergy", "windpower", "greentech"],
        accounts=["solar", "renewable", "cleanenergy", "greentech"]
    ),
    "agriculture": SectorQueries(
        name="Agriculture and forestry",
        name_de="Landwirtschaft & Forstwirtschaft",
        queries=[
            "agriculture", "farming", "farm", "farmer", "forestry",
            "agribusiness", "crop", "grain", "timber", "food",
            "tariff", "export", "import", "china", "trade"
        ],
        hashtags=["agriculture", "farming", "agribusiness", "crops", "timber"],
        accounts=["agriculture", "farming", "agribusiness"]
    ),
}


@dataclass
class Post:
    """Represents a Truth Social post with relevant metadata."""

    id: str
    content: str
    created_at: str
    url: str
    author_handle: str
    author_display_name: str
    author_followers: int
    author_verified: bool
    replies_count: int
    reblogs_count: int
    favourites_count: int

    @property
    def engagement(self) -> int:
        """Total engagement (replies + reblogs + favorites)."""
        return self.replies_count + self.reblogs_count + self.favourites_count

    @classmethod
    def from_api_response(cls, data: dict) -> "Post":
        """Create Post from API response data."""
        account = data.get("account", {})
        return cls(
            id=data.get("id", ""),
            content=data.get("content", ""),
            created_at=data.get("created_at", ""),
            url=data.get("url", ""),
            author_handle=account.get("username", ""),
            author_display_name=account.get("display_name", ""),
            author_followers=account.get("followers_count", 0),
            author_verified=account.get("verified", False),
            replies_count=data.get("replies_count", 0),
            reblogs_count=data.get("reblogs_count", 0),
            favourites_count=data.get("favourites_count", 0),
        )


@dataclass
class Account:
    """Represents a Truth Social account."""

    id: str
    username: str
    display_name: str
    followers_count: int
    following_count: int
    statuses_count: int
    verified: bool
    note: str
    url: str

    @classmethod
    def from_api_response(cls, data: dict) -> "Account":
        """Create Account from API response data."""
        return cls(
            id=data.get("id", ""),
            username=data.get("username", ""),
            display_name=data.get("display_name", ""),
            followers_count=data.get("followers_count", 0),
            following_count=data.get("following_count", 0),
            statuses_count=data.get("statuses_count", 0),
            verified=data.get("verified", False),
            note=data.get("note", ""),
            url=data.get("url", ""),
        )


class InvestmentClient:
    """Client for retrieving investment-related content from Truth Social."""

    def __init__(self, username: str = None, password: str = None, token: str = None):
        """Initialize the investment client.

        Args:
            username: Truth Social username (or set TRUTHSOCIAL_USERNAME env var)
            password: Truth Social password (or set TRUTHSOCIAL_PASSWORD env var)
            token: Pre-existing auth token (or set TRUTHSOCIAL_TOKEN env var)
        """
        # Only pass credentials if explicitly provided, otherwise let Api use env var defaults
        kwargs = {}
        if username is not None:
            kwargs['username'] = username
        if password is not None:
            kwargs['password'] = password
        if token is not None:
            kwargs['token'] = token
        self.api = Api(**kwargs)

    @staticmethod
    def list_sectors() -> list[str]:
        """List all available sector keys."""
        return list(SECTORS.keys())

    @staticmethod
    def get_sector_info(sector: str) -> Optional[SectorQueries]:
        """Get sector information by key."""
        return SECTORS.get(sector)

    def search_posts(
        self,
        query: str,
        limit: int = 100,
        min_followers: int = 0,
        verified_only: bool = False,
    ) -> Iterator[Post]:
        """Search for posts matching a query.

        Args:
            query: Search query string
            limit: Maximum number of results
            min_followers: Only include posts from accounts with at least this many followers
            verified_only: Only include posts from verified accounts

        Yields:
            Post objects matching the criteria
        """
        count = 0
        for page in self.api.search(searchtype="statuses", query=query, limit=limit):
            statuses = page.get("statuses", [])
            for status in statuses:
                if count >= limit:
                    return

                post = Post.from_api_response(status)

                if min_followers > 0 and post.author_followers < min_followers:
                    continue
                if verified_only and not post.author_verified:
                    continue

                yield post
                count += 1

    def search_accounts(
        self,
        query: str,
        limit: int = 40,
        min_followers: int = 0,
    ) -> Iterator[Account]:
        """Search for accounts matching a query.

        Args:
            query: Search query string
            limit: Maximum number of results
            min_followers: Only include accounts with at least this many followers

        Yields:
            Account objects matching the criteria
        """
        count = 0
        for page in self.api.search(searchtype="accounts", query=query, limit=limit):
            accounts = page.get("accounts", [])
            for account_data in accounts:
                if count >= limit:
                    return

                account = Account.from_api_response(account_data)

                if min_followers > 0 and account.followers_count < min_followers:
                    continue

                yield account
                count += 1

    def get_sector_accounts(
        self,
        sector: str,
        limit: int = 40,
        min_followers: int = 1000,
    ) -> Iterator[Account]:
        """Get influential accounts related to a specific investment sector.

        Args:
            sector: Sector key (use list_sectors() to see available sectors)
            limit: Maximum number of results per query
            min_followers: Only include accounts with at least this many followers

        Yields:
            Account objects related to the sector
        """
        sector_info = SECTORS.get(sector)
        if sector_info is None:
            raise ValueError(f"Unknown sector: {sector}. Available: {list(SECTORS.keys())}")

        seen_ids = set()

        for query in sector_info.accounts:
            for account in self.search_accounts(
                query=query,
                limit=limit,
                min_followers=min_followers,
            ):
                if account.id not in seen_ids:
                    seen_ids.add(account.id)
                    yield account

    def get_sector_posts_by_hashtag(
        self,
        sector: str,
        limit: int = 40,
        top_n: int = 5,
        max_hashtags: int = 5,
        delay: float = 0.5,
    ) -> list[Post]:
        """Get top posts from sector using hashtag timeline (rate-limit friendly).

        Args:
            sector: Sector key (use list_sectors() to see available sectors)
            limit: Posts to fetch per hashtag (40 = max per API call)
            top_n: Return only top N posts by likes
            max_hashtags: Maximum number of hashtags to query (default 5)
            delay: Delay between hashtag queries in seconds (default 0.5)

        Returns:
            List of top posts sorted by favourites_count (likes)
        """
        sector_info = SECTORS.get(sector)
        if sector_info is None:
            raise ValueError(f"Unknown sector: {sector}. Available: {list(SECTORS.keys())}")

        seen_ids = set()
        all_posts = []

        # Query up to max_hashtags for better coverage
        for i, tag in enumerate(sector_info.hashtags[:max_hashtags]):
            if i > 0:
                time.sleep(delay)  # Configurable delay between hashtags

            # Fetch max 40 posts per hashtag (1 API call each)
            for batch in self.api.hashtag(tag=tag, limit=limit):
                if batch:
                    for status in batch:
                        if not isinstance(status, dict):
                            continue
                        try:
                            post = Post.from_api_response(status)
                            if post.id and post.id not in seen_ids:
                                seen_ids.add(post.id)
                                all_posts.append(post)
                        except (KeyError, TypeError, AttributeError):
                            continue
                # Only fetch one batch (40 posts) per hashtag to minimize calls
                break

        # Sort by likes (favourites_count) and return top N
        all_posts.sort(key=lambda p: p.favourites_count, reverse=True)
        return all_posts[:top_n]

    def get_sector_trending(
        self,
        sector: str,
        limit: int = 10,
        max_hashtags: int = 5,
    ) -> dict:
        """Get trending posts and hashtags for a sector.

        Combines hashtag timeline + global trending filtered by sector keywords.
        Uses max 6 API calls total (5 hashtags + 1 global trending).

        Args:
            sector: Sector key (use list_sectors() to see available sectors)
            limit: Maximum number of posts to return
            max_hashtags: Maximum number of hashtags to query

        Returns:
            Dict with posts, hashtags, and sector_name
        """
        sector_info = SECTORS.get(sector)
        if sector_info is None:
            raise ValueError(f"Unknown sector: {sector}. Available: {list(SECTORS.keys())}")

        seen_ids = set()
        all_posts = []

        # 1. Get posts from sector hashtags (up to max_hashtags API calls, 40 posts each)
        hashtag_posts = self.get_sector_posts_by_hashtag(
            sector, limit=40, top_n=50, max_hashtags=max_hashtags, delay=0.5
        )
        for post in hashtag_posts:
            seen_ids.add(post.id)
            all_posts.append(post)

        # 2. Get global trending (1 API call, 20 posts max) and filter by sector keywords
        global_trending = self.api.trending(limit=20) or []
        sector_keywords = [q.lower() for q in sector_info.queries[:5]] + \
                          [h.lower() for h in sector_info.hashtags]

        for status in global_trending:
            if not isinstance(status, dict):
                continue
            try:
                post = Post.from_api_response(status)
                if not post.id or post.id in seen_ids:
                    continue
                # Check if post content matches sector keywords
                content_lower = (post.content or "").lower()
                if any(kw in content_lower for kw in sector_keywords):
                    seen_ids.add(post.id)
                    all_posts.append(post)
            except (KeyError, TypeError, AttributeError):
                continue

        # Sort by engagement and return
        all_posts.sort(key=lambda p: p.engagement, reverse=True)
        return {
            "posts": all_posts[:limit],
            "hashtags": sector_info.hashtags,
            "sector_name": sector_info.name,
        }

    def get_government_posts_for_sector(
        self,
        sector: str,
        limit: int = 20,
        hours_back: int = 72,
    ) -> dict:
        """Get government official posts relevant to a sector.

        Fetches recent posts from official Trump administration accounts
        and filters by sector keywords. Falls back to recent posts if no
        keyword matches are found.

        Args:
            sector: Sector key (use list_sectors() to see available sectors)
            limit: Maximum number of posts to return
            hours_back: How far back to search (default 72 hours)

        Returns:
            Dict with posts, hashtags, sector_name, sources, and is_filtered flag
        """
        from datetime import datetime, timedelta, timezone

        sector_info = SECTORS.get(sector)
        if sector_info is None:
            raise ValueError(f"Unknown sector: {sector}. Available: {list(SECTORS.keys())}")

        keyword_matched_posts = []
        all_fetched_posts = []
        seen_ids = set()

        # Calculate cutoff time
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)

        # Prepare keywords for matching
        keywords = [q.lower() for q in sector_info.queries]
        print(f"[GovPosts] Searching for sector '{sector}' with {len(keywords)} keywords")

        # Fetch from each official account
        for handle in GOVERNMENT_ACCOUNTS:
            try:
                for post in self.get_account_posts(
                    handle=handle,
                    limit=50,
                    created_after=cutoff.isoformat(),
                ):
                    if post.id in seen_ids:
                        continue
                    seen_ids.add(post.id)
                    all_fetched_posts.append(post)

                    # Filter by sector keywords
                    content_lower = (post.content or "").lower()
                    if any(kw in content_lower for kw in keywords):
                        keyword_matched_posts.append(post)
                        print(f"[GovPosts] Keyword match from @{handle}: {post.content[:100]}...")
            except Exception as e:
                print(f"[GovPosts] Error fetching from {handle}: {e}")
                continue

        print(f"[GovPosts] Total fetched: {len(all_fetched_posts)}, Keyword matches: {len(keyword_matched_posts)}")

        # Determine which posts to return
        is_filtered = len(keyword_matched_posts) > 0
        if is_filtered:
            result_posts = keyword_matched_posts
        else:
            # Fallback: return recent posts when no keyword matches
            print(f"[GovPosts] No keyword matches for '{sector}', returning recent posts as fallback")
            result_posts = all_fetched_posts

        # Sort by engagement
        result_posts.sort(key=lambda p: p.engagement, reverse=True)

        return {
            "posts": result_posts[:limit],
            "hashtags": sector_info.hashtags,
            "sector_name": sector_info.name,
            "sources": GOVERNMENT_ACCOUNTS,
            "is_filtered": is_filtered,
        }

    def get_account_posts(
        self,
        handle: str,
        limit: int = 100,
        created_after: str = None,
    ) -> Iterator[Post]:
        """Get posts from a specific account.

        Args:
            handle: Account username/handle
            limit: Maximum number of posts
            created_after: Only get posts after this ISO datetime string

        Yields:
            Post objects from the account
        """
        from datetime import timezone
        from dateutil import parser as date_parse

        created_after_dt = None
        if created_after:
            created_after_dt = date_parse.parse(created_after)
            if created_after_dt.tzinfo is None:
                created_after_dt = created_after_dt.replace(tzinfo=timezone.utc)

        count = 0
        for status in self.api.pull_statuses(
            username=handle,
            created_after=created_after_dt,
        ):
            if count >= limit:
                return
            yield Post.from_api_response(status)
            count += 1

    def get_trending(self, limit: int = 20) -> list[Post]:
        """Get currently trending posts.

        Args:
            limit: Maximum number of posts

        Returns:
            List of trending Post objects
        """
        trending = self.api.trending(limit=limit)
        if not trending:
            return []
        return [Post.from_api_response(t) for t in trending]

    def custom_query(
        self,
        query: str,
        limit: int = 100,
        min_followers: int = 0,
        verified_only: bool = False,
    ) -> list[Post]:
        """Execute a custom query and return sorted results.

        Args:
            query: Custom search query
            limit: Maximum number of results
            min_followers: Only include posts from accounts with at least this many followers
            verified_only: Only include posts from verified accounts

        Returns:
            List of Post objects sorted by engagement
        """
        posts = list(self.search_posts(
            query=query,
            limit=limit,
            min_followers=min_followers,
            verified_only=verified_only,
        ))
        posts.sort(key=lambda p: p.engagement, reverse=True)
        return posts
