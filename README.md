# Quest Safety Flask + React Pricing Agent

This project is a Flask backend plus React frontend for the Quest Safety AI
pricing and human approval workflow.

The user can enter any Quest SKU, choose a demand signal, select a pricing
strategy, optionally override stock, and preview:

- Recommended USD price.
- Market competitor check.
- Demand and inventory impact.
- Margin guardrail.
- Confidence score.
- Risk level.
- Approval route.
- Frontend publish requirements.
- Exact agent basis and formula.

## Agent Used

The backend uses the `Quest Price Intelligence Agent` in `pricing_agent.py`.

It is a rule-and-market pricing agent made from these sub-agents:

- Catalog Matcher Agent.
- Market Intelligence Agent.
- Demand Signal Agent.
- Margin Guardrail Agent.
- Risk Router Agent.
- Approval Agent.

The calculation basis is documented in:

```text
docs/agent-calculation.md
```

## Run

Install Python 3.11 or newer if it is not already installed.

```powershell
cd "C:\Users\Ashwanth Bakkanna\Desktop\Quest"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

## Frontend Pages

The UI is split into separate HTML pages so each screen stays focused:

```text
index.html       Dashboard
analyzer.html    SKU input, demand input, and pricing recommendation preview
catalog.html     Quest SKU sample catalog
agents.html      Agent basis, factors, and formula
backend.html     Flask API workflow and endpoints
workflow.html    Documentation and architecture reference
```

Routes:

```text
/
/analyzer
/catalog
/agents
/backend
/workflow
```

## Test

The structural project test uses Node because Python is not available in the
current Codex shell.

```powershell
npm test
```

## Project Structure

```text
app.py                  Flask backend and API routes
pricing_agent.py        Pricing agent and calculation logic
data/catalog.json       Quest SKU sample data and market observations
index.html              Dashboard page
analyzer.html           SKU analyzer page
catalog.html            Catalog page
agents.html             Agent basis page
backend.html            Backend workflow page
workflow.html           Document/reference page
app.js                  Shared React frontend logic
styles.css              Simplified professional responsive UI
docs/workflow.md        Full workflow document
docs/agent-calculation.md
requirements.txt        Flask dependency
tests/check-project.js  Structural checks
assets/workflow-reference.png
```

## API

```text
GET  /api/health
GET  /api/catalog
POST /api/analyze
```

Example request:

```json
{
  "sku": "PR501M",
  "demand": "high",
  "strategy": "protect_margin",
  "stock_override": 7,
  "use_live_market": true
}
```

## Live Competitor Prices

The project now supports live competitor-price lookup from the backend.

Live provider included:

```text
SerpAPI Google Shopping
```

Why this route:

- It avoids direct scraping of Amazon, Grainger, Zoro, and other pages.
- It can search Google Shopping using SKU, MPN, brand, and product title.
- It returns structured seller/source, title, price, and product links.

Add your API key in the project `.env` file:

```text
SERPAPI_API_KEY=your_serpapi_key_here
SERPAPI_LOCATION=United States
```

Then run:

```powershell
python app.py
```

Then open `/analyzer`, check `Fetch live competitor prices`, and run the SKU.

If the key is missing or the API returns too few usable prices, the backend shows
`Sample market fallback` and uses `data/catalog.json` so the recommendation still
works.

Live rows are not all treated as valid competitors. Safety products can be sold
as each, pair, box, case, different size, different color, or different rating.
The backend now:

- Extracts product title, image, seller/source, link, and offer SKU/MPN when visible.
- Detects package quantity such as pair, box, pack, or case.
- Normalizes price to the Quest product UOM before comparison.
- Uses only comparable offers in the recommendation.
- Shows excluded live offers with the reason they were not used.

## Production Note

The catalog and competitor rows are sample market-intelligence data based on
Quest Safety public product page examples. Before production use, connect the
backend to authenticated Quest ERP, PIM, ecommerce, inventory, account pricing,
and approved competitor data feeds.
