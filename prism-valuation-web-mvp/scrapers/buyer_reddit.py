"""
PRISM Lead Engine — Buyer scraper (Reddit)

Hits Reddit's public JSON API across r/dubai, r/UAE, r/DubaiExpats and
r/DubaiRealEstate for buy-intent posts. Scores by budget signal, recency,
and engagement.

Usage:
    pip install requests
    python buyer_reddit.py [--output leads_buyers.json]
"""

import argparse
import json
import re
import time
from datetime import datetime, timezone

import requests

SUBREDDITS = ["dubai", "UAE", "DubaiExpats", "DubaiRealEstate"]

BUY_KEYWORDS = [
    "looking to buy", "want to buy", "planning to buy", "buying",
    "apartment for sale", "villa for sale", "first property", "investment property",
    "off-plan", "offplan", "downtown dubai", "jvc", "marina", "palm jumeirah",
    "business bay", "where to buy", "best area to buy", "mortgage",
    "property search", "real estate advice", "recommend a property",
    "moving to dubai", "relocating", "settling in dubai",
]

BUDGET_PATTERNS = [
    (re.compile(r"(\d[\d,]*)\s*(?:million|M)\s*(?:AED|dirhams?)?", re.I), 1_000_000),
    (re.compile(r"AED\s*(\d[\d,]*)\s*(?:K|thousand)?", re.I), 1),
    (re.compile(r"(\d[\d,]+)\s*(?:AED|dirhams?)", re.I), 1),
    (re.compile(r"(\d[\d,]+)\s*K\b", re.I), 1_000),
]

HEADERS = {
    "User-Agent": "PRISM-LeadBot/1.0 (Dubai real estate research; contact via github)"
}


def extract_budget(text):
    for pattern, multiplier in BUDGET_PATTERNS:
        match = pattern.search(text or "")
        if match:
            try:
                num = int(match.group(1).replace(",", ""))
                val = num * multiplier
                if 50_000 < val < 200_000_000:
                    return val
            except ValueError:
                pass
    return 0


def buy_intent_score(text):
    lower = (text or "").lower()
    return sum(1 for kw in BUY_KEYWORDS if kw in lower)


def score_lead(post):
    score = 0
    intent = buy_intent_score(post["title"] + " " + post.get("body", ""))
    score += min(intent * 2, 8)
    budget = post.get("budget_aed", 0)
    if budget >= 5_000_000:
        score += 4
    elif budget >= 2_000_000:
        score += 3
    elif budget >= 1_000_000:
        score += 2
    elif budget >= 500_000:
        score += 1
    hours_old = post.get("hours_old", 9999)
    if hours_old <= 6:
        score += 3
    elif hours_old <= 24:
        score += 2
    elif hours_old <= 72:
        score += 1
    score += min(post.get("comments", 0) // 3, 3)
    grade = "A" if score >= 10 else "B" if score >= 6 else "C" if score >= 3 else "D"
    return grade, score


def fetch_subreddit(sub, limit=25, after=None, retries=3):
    url = f"https://www.reddit.com/r/{sub}/new.json"
    params = {"limit": limit, "raw_json": 1}
    if after:
        params["after"] = after
    for attempt in range(retries):
        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
            if resp.status_code == 429:
                wait = 2 ** attempt * 5
                print(f"  [rate-limit] waiting {wait}s…")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            print(f"  [warn] r/{sub} attempt {attempt+1}: {exc}")
            time.sleep(2 ** attempt)
    return None


def parse_posts(data, subreddit):
    posts = []
    if not data or "data" not in data:
        return posts
    for child in data["data"].get("children", []):
        post = child.get("data", {})
        title = post.get("title", "")
        body = post.get("selftext", "")
        combined = title + " " + body

        intent = buy_intent_score(combined)
        if intent == 0:
            continue

        created_utc = post.get("created_utc", 0)
        now_utc = datetime.now(timezone.utc).timestamp()
        hours_old = (now_utc - created_utc) / 3600

        budget = extract_budget(combined)
        budget_label = _format_budget(budget)

        lead = {
            "source": "reddit",
            "subreddit": subreddit,
            "title": title,
            "body": body[:500],
            "url": "https://reddit.com" + post.get("permalink", ""),
            "author": post.get("author", "[deleted]"),
            "comments": post.get("num_comments", 0),
            "upvotes": post.get("score", 0),
            "budget_aed": budget,
            "budget_label": budget_label,
            "hours_old": round(hours_old, 1),
            "intent_signals": intent,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }
        lead["grade"], lead["score"] = score_lead(lead)
        posts.append(lead)

    return posts


def _format_budget(aed):
    if not aed:
        return ""
    if aed >= 1_000_000:
        return f"AED {aed/1_000_000:.1f}M"
    if aed >= 1_000:
        return f"AED {aed//1_000}K"
    return f"AED {aed:,}"


def scrape(subreddits=None, limit=25):
    subreddits = subreddits or SUBREDDITS
    all_posts = []
    for sub in subreddits:
        print(f"[reddit] r/{sub}…")
        data = fetch_subreddit(sub, limit=limit)
        posts = parse_posts(data, sub)
        print(f"  {len(posts)} buy-intent posts found")
        all_posts.extend(posts)
        time.sleep(1.5)

    # Deduplicate by URL
    seen = set()
    unique = [p for p in all_posts if not (p["url"] in seen or seen.add(p["url"]))]
    unique.sort(key=lambda x: x["score"], reverse=True)
    return unique


def main():
    parser = argparse.ArgumentParser(description="Scrape Reddit for Dubai property buyers")
    parser.add_argument("--output", default="leads_buyers.json")
    parser.add_argument("--limit", type=int, default=25, help="Posts per subreddit (default 25)")
    parser.add_argument("--min-grade", choices=["A", "B", "C", "D"], default="C")
    args = parser.parse_args()

    posts = scrape(limit=args.limit)
    grade_order = {"A": 0, "B": 1, "C": 2, "D": 3}
    min_g = grade_order[args.min_grade]
    filtered = [p for p in posts if grade_order[p["grade"]] <= min_g]

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(filtered, f, indent=2, ensure_ascii=False)

    print(f"\n[done] {len(filtered)} buyer leads written to {args.output}")
    for grade in ["A", "B", "C", "D"]:
        count = sum(1 for p in filtered if p["grade"] == grade)
        if count:
            print(f"  Grade {grade}: {count}")


if __name__ == "__main__":
    main()
