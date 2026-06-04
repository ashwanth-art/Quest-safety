const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const requiredFiles = [
  "app.py",
  "pricing_agent.py",
  "market_data.py",
  ".env",
  "index.html",
  "analyzer.html",
  "catalog.html",
  "agents.html",
  "backend.html",
  "workflow.html",
  "styles.css",
  "app.js",
  "data/catalog.json",
  "docs/workflow.md",
  "docs/agent-calculation.md",
  "README.md",
  "requirements.txt"
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/catalog.json"), "utf8"));
if (catalog.currency !== "USD") throw new Error("Catalog currency must be USD.");
if (!Array.isArray(catalog.products) || catalog.products.length < 20) {
  throw new Error("Expected at least 20 Quest product examples.");
}

for (const product of catalog.products) {
  for (const field of ["sku", "mpn", "product", "category", "brand", "uom", "current_price", "cost", "stock"]) {
    if (product[field] === undefined || product[field] === null || product[field] === "") {
      throw new Error(`Product ${product.sku || "(missing SKU)"} is missing ${field}.`);
    }
  }
  if (product.current_price <= 0 || product.cost <= 0) {
    throw new Error(`Invalid price or cost for ${product.sku}.`);
  }
  if (!product.source_url.startsWith("https://www.questsafety.com/")) {
    throw new Error(`Product ${product.sku} must include a Quest Safety source URL.`);
  }
  if (!Array.isArray(product.competitors) || product.competitors.length < 3) {
    throw new Error(`Product ${product.sku} needs at least 3 competitor records.`);
  }
}

const frontend = fs.readFileSync(path.join(root, "app.js"), "utf8");
if (!frontend.includes("React.createElement")) {
  throw new Error("Frontend must use React.");
}
if (!frontend.includes("/api/analyze-catalog")) {
  throw new Error("Frontend must call the Flask catalog analysis API.");
}
if (!frontend.includes("Human approval required") || !frontend.includes("Run pricing agent for all catalog SKUs")) {
  throw new Error("Frontend must support catalog-wide analysis and human approval.");
}

for (const page of ["index.html", "analyzer.html", "catalog.html", "agents.html", "backend.html", "workflow.html"]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  if (!html.includes('src="/app.js"')) {
    throw new Error(`${page} must load the shared React app.`);
  }
  if (!html.includes("data-page=")) {
    throw new Error(`${page} must declare a data-page route.`);
  }
}

const backend = fs.readFileSync(path.join(root, "app.py"), "utf8");
if (!backend.includes("from flask import")) {
  throw new Error("Backend must use Flask.");
}
if (!backend.includes("fetch_for_product")) {
  throw new Error("Backend must support live market lookup.");
}
if (!backend.includes("market_override_applied = True")) {
  throw new Error("Backend must run live market lookup automatically.");
}
if (!backend.includes("/api/analyze-catalog")) {
  throw new Error("Backend must support catalog-wide analysis.");
}

const marketData = fs.readFileSync(path.join(root, "market_data.py"), "utf8");
if (!marketData.includes("SERPAPI_API_KEY") || !marketData.includes("google_shopping")) {
  throw new Error("Live market service must support SerpAPI Google Shopping.");
}
if (!marketData.includes("normalized_price") || !marketData.includes("exclusion_reason")) {
  throw new Error("Live market service must normalize prices and explain excluded offers.");
}

const requirements = fs.readFileSync(path.join(root, "requirements.txt"), "utf8");
if (!requirements.includes("requests")) {
  throw new Error("requirements.txt must include requests for live market API calls.");
}
if (!requirements.includes("python-dotenv")) {
  throw new Error("requirements.txt must include python-dotenv for .env support.");
}

const envFile = fs.readFileSync(path.join(root, ".env"), "utf8");
if (!envFile.includes("SERPAPI_API_KEY") || !envFile.includes("SERPAPI_LOCATION")) {
  throw new Error(".env must include SERPAPI_API_KEY and SERPAPI_LOCATION.");
}

console.log("Flask + React project structure and Quest pricing data look good.");
