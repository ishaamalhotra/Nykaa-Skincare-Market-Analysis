const puppeteer = require("puppeteer");
const fs = require("fs");

const category = "https://www.nykaa.com/skin/moisturizers/c/8377";

// resume settings
const START_PAGE = 1;   // change as needed
const END_PAGE = 1;

// safe parallelism
const BATCH_SIZE = 1;

// ---------------- SETUP ----------------
async function setupPage(page) {
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  );

  await page.setRequestInterception(true);

  page.on("request", (req) => {
    const type = req.resourceType();
    if (["image", "stylesheet", "font"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

// ---------------- SAFE NAVIGATION ----------------
async function safeGoto(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      return;
    } catch (err) {
      console.log(`⚠️ Retry ${i + 1}: ${url}`);
      if (i === retries - 1) throw err;

      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// ---------------- EXTRACT LINKS ----------------
async function extractProductLinks(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((href) => href.includes("/p/"));
  });
}

// ---------------- EXTRACT PRODUCT ----------------

async function extractProductData(page) {
  return await page.evaluate(() => {
    const p = window.__PRELOADED_STATE__?.productPage?.product;
    if (!p) return null;

    // ADD THIS LINE RIGHT HERE
const state = window.__PRELOADED_STATE__;
if (!state) return { DEBUG: "NO STATE FOUND" };
const globals = Object.keys(window).filter(key => {
  try {
    const val = window[key];
    return val && 
           typeof val === 'object' && 
           JSON.stringify(val).includes('moisturizer');
  } catch(e) {
    return false;
  }
});

return { GLOBALS: globals };

return { DEBUG_KEYS: Object.keys(state) };
    function extractIngredients(p) {
      if (p.ingredients) return p.ingredients;

      if (p.productAttributes) {
        for (const section of p.productAttributes) {
          if (section.child_widgets) {
            for (const widget of section.child_widgets) {
              if (widget.attributes) {
                for (const attr of widget.attributes) {
                  if (attr.label?.toLowerCase().includes("ingredient")) {
                    return attr.value;
                  }
                }
              }
            }
          }
        }
      }

      if (p.description) {
        const text = p.description.replace(/<[^>]+>/g, " ");
        const match = text.match(/ingredients[:\-]?\s*(.*)/i);
        if (match) return match[1];
      }

      return null;
    }

    const rawIngredients = extractIngredients(p);

    return {
      name: p.name,
      brand: p.brandName,
      mrp: p.price,
      price: p.final_price,
      rating: p.rating,
      review_count: p.formatted_rating_count,
      category: p.primary_categories?.l2?.name,
      ingredients: rawIngredients
        ? rawIngredients.split(",").map((i) => i.trim().toLowerCase())
        : [],
    };
  });
}

// ---------------- MAIN ----------------
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
  });

  const page = await browser.newPage();
  await setupPage(page);

  let allProducts = [];

  // load existing data
  if (fs.existsSync("nykaa_products.json")) {
    allProducts = JSON.parse(fs.readFileSync("nykaa_products.json"));
    console.log("📂 Loaded:", allProducts.length);
  }

  for (let pageNum = START_PAGE; pageNum <= END_PAGE; pageNum++) {
    const url = `${category}?page_no=${pageNum}`;
    console.log(`\n➡️ Page ${pageNum}`);

    try {
      await safeGoto(page, url);

      // scroll
      await page.evaluate(async () => {
        window.scrollBy(0, window.innerHeight * 10);
        await new Promise((r) => setTimeout(r, 1500));
      });

      let links = await extractProductLinks(page);
      links = [...new Set(links)];

      console.log(`🔗 Found ${links.length} products`);

      // PARALLEL SCRAPING
      for (let i = 0; i < links.length; i += BATCH_SIZE) {
        const batch = links.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (link) => {
            const newPage = await browser.newPage();
            await setupPage(newPage);

            try {
              await safeGoto(newPage, link);

              const data = await extractProductData(newPage);

              if (data) {
                allProducts.push(data);
                console.log("✅", data.name);
              }

              await newPage.close();
            } catch (err) {
              console.log("❌ Product error:", err.message);
              await newPage.close();
            }
          })
        );

        // random delay between batches
        await new Promise((r) =>
          setTimeout(r, 300 + Math.random() * 700)
        );
      }

      // save after each page
      fs.writeFileSync(
        "nykaa_products.json",
        JSON.stringify(allProducts, null, 2)
      );
      console.log("💾 Saved:", allProducts.length);

      // delay between pages (VERY IMPORTANT)
      await new Promise((r) =>
        setTimeout(r, 2000 + Math.random() * 2000)
      );

    } catch (err) {
      console.log("❌ Page error:", err.message);
    }
  }

  console.log("\n🎉 DONE! Total:", allProducts.length);

  await browser.close();
})();

   