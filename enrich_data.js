const puppeteer = require("puppeteer");
const fs = require("fs");

const START_PAGE = 91;
const END_PAGE = 130;

const OUTPUT = "nykaa_products_final.json";
const BATCH_SIZE = 3;

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // keep false to avoid blocking
    defaultViewport: null,
    args: ["--start-maximized"]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  );

  // ✅ LOAD EXISTING DATA (IMPORTANT)
  let results = [];
  if (fs.existsSync(OUTPUT)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT));
      results = existing;
      console.log("📂 Loaded existing:", results.length);
    } catch (e) {
      console.log("⚠️ Could not read existing file");
    }
  }

  // ✅ TRACK DUPLICATES
  const existingUrls = new Set(results.map(p => p.url));

  // 🔁 LOOP THROUGH PAGES
  for (let pageNum = START_PAGE; pageNum <= END_PAGE; pageNum++) {
    const url = `https://www.nykaa.com/skin/moisturizers/c/8377?page_no=${pageNum}`;

    console.log(`\n📄 Page ${pageNum}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      await new Promise(r => setTimeout(r, 4000));

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a[href*='/p/']"))
          .map(a => a.href)
          .filter(link => link.includes("/p/"));
      });

      const uniqueLinks = [...new Set(links)];

      console.log("🔗 Found:", uniqueLinks.length);

      // 🔥 PROCESS IN BATCHES
      for (let i = 0; i < uniqueLinks.length; i += BATCH_SIZE) {
        const batch = uniqueLinks.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (link) => {
            if (existingUrls.has(link)) return; // skip duplicate

            const productPage = await browser.newPage();

            try {
              await productPage.goto(link, {
                waitUntil: "domcontentloaded",
                timeout: 60000
              });

              await new Promise(r => setTimeout(r, 3000));

              const data = await productPage.evaluate(() => {
                const p = window.__PRELOADED_STATE__?.productPage?.product;
                if (!p) return null;

                let rawIngredients = "";

                try {
                  const widgets = p.productAttributes || [];
                  const ingredientWidget = widgets.find(w =>
                    w.child_widgets?.some(c =>
                      c.attributes?.some(a =>
                        a.label?.toLowerCase().includes("ingredient")
                      )
                    )
                  );

                  rawIngredients =
                    ingredientWidget?.child_widgets?.[0]?.attributes?.find(a =>
                      a.label?.toLowerCase().includes("ingredient")
                    )?.value || "";
                } catch (e) {}

                return {
                  name: p.name,
                  brand: p.brandName,
                  mrp: p.price,
                  price: p.final_price,
                  rating: p.rating,
                  review_count: p.formatted_rating_count,
                  category: p.primary_categories?.l2?.name,
                  ingredients: rawIngredients
                    ? rawIngredients
                        .replace(/<[^>]*>/g, "")
                        .split(",")
                        .map(i => i.trim().toLowerCase())
                    : [],
                  url: window.location.href
                };
              });

              if (data && data.url && !existingUrls.has(data.url)) {
                results.push(data);
                existingUrls.add(data.url);
              }

            } catch (err) {
              console.log("❌ Product failed");
            } finally {
              await productPage.close();
            }
          })
        );

        // 💾 SAVE AFTER EACH BATCH
        fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
        console.log("💾 Saved:", results.length);

        await new Promise(r => setTimeout(r, 4000));
      }

    } catch (err) {
      console.log("❌ Page blocked → retrying...");
      pageNum--;
      await new Promise(r => setTimeout(r, 8000));
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

  console.log("\n🎉 DONE:", results.length);

  await browser.close();
})();