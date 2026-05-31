"""
PRISM Lead Engine — Seller scraper (Dubizzle)

Scrapes Dubizzle Dubai property listings for urgent/owner-direct sellers.
Scores each lead A–D based on urgency signals, days on market, and price drops.

Usage:
    pip install requests beautifulsoup4 lxml
    python seller_dubizzle.py [--pages N] [--output leads_sellers.json]
"""

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlencode, urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.dubizzle.com"
SEARCH_PATH = "/en/properties/apartments-flats/sale/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

URGENCY_KEYWORDS = [
    "urgent", "must sell", "motivated seller", "below market",
    "price reduced", "direct from owner", "no agency fee",
    "leaving uae", "relocating", "investor deal", "handover soon",
    "distressed", "quick sale",
]

PHONE_RE = re.compile(r"(\+971|00971|0)?[\s\-]?5[0-9][\s\-]?\d{3}[\s\-]?\d{4}")


def fetch_page(session, page_num):
    params = {"page": page_num, "sort": "date", "category": "for-sale"}
    url = urljoin(BASE_URL, SEARCH_PATH) + "?" + urlencode(params)
    try:
        resp = session.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as exc:
        print(f"[warn] page {page_num} failed: {exc}", file=sys.stderr)
        return None


def parse_phone(text):
    match = PHONE_RE.search(text or "")
    if not match:
        return None
    raw = re.sub(r"[\s\-]", "", match.group())
    if raw.startswith("00971"):
        raw = "+" + raw[2:]
    elif raw.startswith("971"):
        raw = "+" + raw
    elif raw.startswith("0"):
        raw = "+971" + raw[1:]
    return raw


def count_urgency(text):
    lower = (text or "").lower()
    return sum(1 for kw in URGENCY_KEYWORDS if kw in lower)


def score_lead(listing):
    """Return (grade, score_int)."""
    score = 0
    score += min(count_urgency(listing.get("title", "") + " " + listing.get("description", "")) * 2, 6)
    days = listing.get("days_listed", 999)
    if days <= 3:
        score += 3
    elif days <= 7:
        score += 2
    elif days <= 30:
        score += 1
    if listing.get("price_drop"):
        score += 2
    if listing.get("phone"):
        score += 1
    grade = "A" if score >= 8 else "B" if score >= 5 else "C" if score >= 2 else "D"
    return grade, score


def parse_listings(html):
    soup = BeautifulSoup(html, "lxml")
    results = []

    # Dubizzle uses data-testid attributes; fall back to generic card selectors
    cards = soup.select("[data-testid='listing-card'], article.listing, .listing-card, ._2YFb-")
    if not cards:
        cards = soup.select("article, .sc-bdVRCZ")

    for card in cards:
        try:
            title_el = card.select_one("h2, h3, [data-testid='listing-title'], .sc-eCImPb")
            title = title_el.get_text(strip=True) if title_el else ""

            price_el = card.select_one("[data-testid='listing-price'], .price, ._2S5bm")
            price_text = price_el.get_text(strip=True) if price_el else ""
            price_num = int(re.sub(r"[^\d]", "", price_text)) if price_text else 0

            location_el = card.select_one("[data-testid='listing-location'], .location, ._2FNVb")
            location = location_el.get_text(strip=True) if location_el else ""

            link_el = card.select_one("a[href]")
            url = urljoin(BASE_URL, link_el["href"]) if link_el else ""

            date_el = card.select_one("time, [data-testid='listing-date'], .date")
            date_text = date_el.get_text(strip=True) if date_el else ""
            days_listed = _parse_days(date_text)

            body_text = card.get_text(" ", strip=True)
            phone = parse_phone(body_text)
            urgency = count_urgency(title + " " + body_text)
            price_drop = any(kw in body_text.lower() for kw in ["reduced", "price drop", "dropped"])

            listing = {
                "source": "dubizzle",
                "title": title,
                "price_aed": price_num,
                "location": location,
                "url": url,
                "days_listed": days_listed,
                "phone": phone,
                "urgency_score": urgency,
                "price_drop": price_drop,
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }
            listing["grade"], listing["score"] = score_lead(listing)
            if title:
                results.append(listing)
        except Exception as exc:
            print(f"[warn] card parse error: {exc}", file=sys.stderr)

    return results


def _parse_days(text):
    """Convert relative date text to approximate days on market."""
    lower = (text or "").lower()
    if "today" in lower or "hour" in lower or "minute" in lower:
        return 0
    if "yesterday" in lower:
        return 1
    m = re.search(r"(\d+)\s*day", lower)
    if m:
        return int(m.group(1))
    m = re.search(r"(\d+)\s*week", lower)
    if m:
        return int(m.group(1)) * 7
    m = re.search(r"(\d+)\s*month", lower)
    if m:
        return int(m.group(1)) * 30
    return 999


def scrape(pages=3, delay=2.0):
    session = requests.Session()
    all_listings = []
    for page in range(1, pages + 1):
        print(f"[dubizzle] fetching page {page}/{pages}…")
        html = fetch_page(session, page)
        if not html:
            break
        listings = parse_listings(html)
        print(f"  found {len(listings)} listings")
        all_listings.extend(listings)
        if page < pages:
            time.sleep(delay)
    # Deduplicate by URL
    seen = set()
    unique = []
    for l in all_listings:
        if l["url"] not in seen:
            seen.add(l["url"])
            unique.append(l)
    unique.sort(key=lambda x: x["score"], reverse=True)
    return unique


def main():
    parser = argparse.ArgumentParser(description="Scrape Dubizzle for motivated sellers")
    parser.add_argument("--pages", type=int, default=3, help="Number of search pages (default 3)")
    parser.add_argument("--output", default="leads_sellers.json", help="Output JSON file")
    parser.add_argument("--min-grade", choices=["A", "B", "C", "D"], default="C",
                        help="Minimum grade to include (default C)")
    args = parser.parse_args()

    listings = scrape(pages=args.pages)
    grade_order = {"A": 0, "B": 1, "C": 2, "D": 3}
    min_g = grade_order[args.min_grade]
    filtered = [l for l in listings if grade_order[l["grade"]] <= min_g]

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(filtered, f, indent=2, ensure_ascii=False)

    print(f"\n[done] {len(filtered)} seller leads written to {args.output}")
    for grade in ["A", "B", "C", "D"]:
        count = sum(1 for l in filtered if l["grade"] == grade)
        if count:
            print(f"  Grade {grade}: {count}")


if __name__ == "__main__":
    main()
