import json

with open('nykaa_products.json', 'r', encoding='utf-8') as f:
    file1 = json.load(f)  # has ingredients

with open('nykaa_products_final.json', 'r', encoding='utf-8') as f:
    file2 = json.load(f)  # has URLs

# Build lookup from file2 by name
url_lookup = {p.get('name', '').strip().lower(): p.get('url', '') for p in file2}

# Merge
merged = []
for p in file1:
    name_key = p.get('name', '').strip().lower()
    p['url'] = url_lookup.get(name_key, '')
    merged.append(p)

with open('nykaa_final.json', 'w', encoding='utf-8') as f:
    json.dump(merged, f, indent=2, ensure_ascii=False)

# Check results
has_both = sum(1 for p in merged if p.get('url') and p.get('ingredients'))
has_ingredients_only = sum(1 for p in merged if p.get('ingredients') and not p.get('url'))
has_url_only = sum(1 for p in merged if p.get('url') and not p.get('ingredients'))

print(f"Total: {len(merged)}")
print(f"Has both ingredients AND url: {has_both}")
print(f"Has ingredients only: {has_ingredients_only}")
print(f"Has url only: {has_url_only}")