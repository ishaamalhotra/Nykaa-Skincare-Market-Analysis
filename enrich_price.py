import requests
import json
import time
import random
import re

with open('nykaa_final.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

headers = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36',
    'Referer': 'https://www.nykaa.com/',
    'X-Csrf-Token': 'YOUR_CSRF_TOKEN_HERE',
    'Cookie': 'YOUR_SESSION_COOKIE_HERE'
    # To get these values:
    # 1. Open Nykaa.com in Chrome
    # 2. DevTools → Network tab → any gateway-api request
    # 3. Copy Cookie and X-Csrf-Token from request headers
}

def extract_product_id(url):
    match = re.search(r'/p/(\d+)', url)
    return match.group(1) if match else None

def get_price_data(product_id):
    url = f"https://www.nykaa.com/gateway-api/rest/appapi/V2/getProductWidgets?product_id={product_id}&recommendation_json=%5B%7B%22cav%22%3A%22intersection_v3%22%7D%2C%7B%22cab%22%3A%22iou_v4%22%7D%5D"
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            # Search ALL products in ALL widgets
            widgets = data.get('response', {}).get('relatedProducts', [])
            for widget in widgets:
                for p in widget.get('products', []):
                    pid = str(p.get('id', ''))
                    parent_id = str(p.get('parent_id', ''))
                    if pid == str(product_id) or parent_id == str(product_id):
                        return {
                            'mrp': p.get('price'),
                            'final_price': p.get('final_price'),
                            'discount_pct': p.get('discount'),
                            'review_count': p.get('rating_count'),
                            'category_l2': p.get('primary_categories', [{}])[0].get('l2', {}).get('name') if p.get('primary_categories') else None,
                            'category_l3': p.get('primary_categories', [{}])[0].get('l3', {}).get('name') if p.get('primary_categories') else None,
                        }
            # If no exact match just take first product's price data
            if widgets and widgets[0].get('products'):
                p = widgets[0]['products'][0]
                return {
                    'mrp': p.get('price'),
                    'final_price': p.get('final_price'),
                    'discount_pct': p.get('discount'),
                    'review_count': p.get('rating_count'),
                    'category_l2': p.get('primary_categories', [{}])[0].get('l2', {}).get('name') if p.get('primary_categories') else None,
                    'category_l3': p.get('primary_categories', [{}])[0].get('l3', {}).get('name') if p.get('primary_categories') else None,
                }
        else:
            print(f"  Status: {response.status_code}")
    except Exception as e:
        print(f"  Error: {e}")
    return {}

enriched = []
success = 0
failed = 0

for i, product in enumerate(products):
    url = product.get('url', '')
    product_id = extract_product_id(url)

    if product_id:
        print(f"{i+1}/{len(products)}: {product.get('name', '')[:40]}")
        price_data = get_price_data(product_id)
        if price_data and price_data.get('mrp'):
            product.update(price_data)
            success += 1
            print(f"  ✓ MRP: {price_data.get('mrp')} | Reviews: {price_data.get('review_count')}")
        else:
            failed += 1
            print(f"  ✗ No price data")
        time.sleep(random.uniform(1.5, 2.5))

    enriched.append(product)

    if (i + 1) % 50 == 0:
        with open('nykaa_enriched.json', 'w', encoding='utf-8') as f:
            json.dump(enriched, f, indent=2, ensure_ascii=False)
        print(f"\nSaved {len(enriched)} | Success: {success} | Failed: {failed}\n")

with open('nykaa_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(enriched, f, indent=2, ensure_ascii=False)

print(f"\nDone! Total: {len(enriched)} | Success: {success} | Failed: {failed}")