# Nykaa Skincare Market Analysis

Scraped 2,600+ skincare products from Nykaa using Puppeteer 
and internal API reverse engineering. Cleaned and analysed 
1,827 products across 10 categories.

## Key Findings
Key Findings
1. Ratings are inflated and useless as a signal

84% of products fall between 4.0–4.5 (skew = -1.624)
Raw star rating cannot differentiate between products
Solution: Built a Credibility Score = rating × log(1 + review_count)

2. Price ≠ Quality

Correlation between price and rating = 0.10
A ₹300 product is just as likely to be rated 4.5 as a ₹3,000 one

3. Korean beauty brands dominate the value quadrant

LANEIGE, COSRX, Anua, Innisfree — high rating at accessible prices
Indian D2C brands (Derma Co, Dot & Key, Minimalist) competitive on price but undifferentiated on rating

4. Discounting signals strategy, not quality

Correlation (discount vs rating) = -0.0005
Mass brands (Lakme ~25% median discount) vs premium brands (O3+ ~5%)

5. Fragrance is the clearest budget vs premium differentiator

Fragrance appears in budget top 15 ingredients
Absent in premium top 15 — sophisticated brands avoid it as a known irritant

6. A complete AM routine costs ₹1,109

Cleanse → Serum → Moisturize → Protect
All products ranked by credibility score with 100,000+ reviews each

## Tech Stack
Python · Pandas · Seaborn · Puppeteer · Matplotlib

## Files
| File | Description |
|---|---|
| `nykaa.ipynb` | Main analysis notebook |
| `scraper.js` | Puppeteer scraper |
| `enrich_data.js` | API enrichment |
| `enrich_price.py` | Price data pipeline |
| `merger.py` | Data merging |

## Setup
```bash
pip install pandas seaborn matplotlib scikit-learn numpy
jupyter notebook nykaa.ipynb
```

> Cookie and CSRF token required in `enrich_price.py` 
> to re-run data collection — see comments in file.
