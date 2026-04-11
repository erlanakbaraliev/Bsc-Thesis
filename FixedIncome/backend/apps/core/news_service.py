import os
from datetime import date, timedelta
from newsapi import NewsApiClient

# Set NEWS_API_KEY in your .env / environment variables
# Free key at https://newsapi.org  (100 req/day)
_client = None

def get_client():
    global _client
    if _client is None:
        _client = NewsApiClient(api_key=os.environ["NEWS_API_KEY"])
    return _client


def fetch_headlines(issuer_name: str, days_back: int = 30) -> list[dict]:
    """
    Returns a list of { "title": "...", "published_at": "YYYY-MM-DD" }
    sorted oldest → newest.
    """
    from_date = (date.today() - timedelta(days=days_back)).isoformat()

    try:
        response = get_client().get_everything(
            q=f'"{issuer_name}"',
            language="en",
            sort_by="publishedAt",
            from_param=from_date,
            page_size=100,
        )
        articles = response.get("articles", [])
    except Exception as e:
        print(f"NEWS API ERROR: {str(e)}")
        return []

    return [
        {
            "title":        a["title"],
            "published_at": a["publishedAt"][:10],   # keep YYYY-MM-DD only
        }
        for a in articles
        if a.get("title") and "[Removed]" not in a["title"]
    ]
