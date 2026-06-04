# Quest Safety Flask + React Pricing Workflow

## 1. Architecture Overview

This project uses a Flask backend and React frontend.

```text
React UI
  -> collects SKU, demand, strategy, stock override
  -> calls Flask /api/analyze

Flask API
  -> validates request
  -> loads Quest catalog and market observations
  -> sends data to Quest Price Intelligence Agent

Pricing Agent
  -> matches SKU
  -> calculates market metrics
  -> applies demand, inventory, strategy, and margin rules
  -> scores confidence
  -> routes to auto approval, bulk review, or exception review

React UI
  -> displays recommendation preview, market checks, reasons, formula,
     frontend requirements, and backend workflow
```

## 2. User Workflow

1. Open the application at `http://127.0.0.1:5000`.
2. Enter a Quest SKU or manufacturer part number.
3. Select demand: low, stable, rising, or high.
4. Select pricing strategy: balanced, protect margin, win share, or clear inventory.
5. Optionally enter a stock override to simulate latest inventory.
6. Optionally enable `Fetch live competitor prices`.
7. Click `Run pricing agent`.
8. Review the recommended price, market intelligence, risk, route, and reasons.
9. Use the preview requirements to understand what backend fields the frontend
   must display before publishing.

## 3. Data Collection

The backend stores sample Quest catalog and market data in:

```text
data/catalog.json
```

Each catalog item includes:

- SKU.
- Manufacturer part number.
- Product name.
- Brand.
- Category.
- Unit of measure.
- Current Quest price in USD.
- Cost.
- Stock.
- Base demand.
- Supply state.
- Minimum margin.
- Quest product source URL.
- Competitor observations.

Each competitor observation includes:

- Source.
- Price.
- Stock state.
- Freshness in hours.
- Match score.

Production sources should come from Quest ERP, PIM, ecommerce, inventory,
account pricing, approved competitor feeds, and manufacturer data.

## 4. Flask Backend

Main files:

```text
app.py
pricing_agent.py
data/catalog.json
requirements.txt
```

API endpoints:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Confirms the Flask backend is running. |
| `/api/catalog` | GET | Returns Quest SKU data, sources, and agent stack. |
| `/api/analyze` | POST | Runs SKU pricing analysis and returns preview output. |

Example `/api/analyze` request:

```json
{
  "sku": "PR501M",
  "demand": "high",
  "strategy": "protect_margin",
  "stock_override": 7,
  "use_live_market": true
}
```

## 5. Pricing Agent

The backend uses:

```text
Quest Price Intelligence Agent
```

Sub-agents:

1. Catalog Matcher Agent.
2. Market Intelligence Agent.
3. Demand Signal Agent.
4. Margin Guardrail Agent.
5. Risk Router Agent.
6. Approval Agent.

See `docs/agent-calculation.md` for exact factors, formulas, and thresholds.

## 6. Calculation Flow

1. Match SKU or MPN to the Quest catalog.
2. Read competitor prices.
   - If `use_live_market` is true and `SERPAPI_API_KEY` is configured, fetch
     live Google Shopping competitor observations.
   - Normalize package quantity and Quest UOM before comparison.
   - Exclude rows with mismatched MPN, package, size, color, rating, or low match
     score.
   - If live lookup is unavailable or too sparse, use sample catalog market data.
3. Calculate market minimum, maximum, average, and median.
4. Use the market median as the market anchor.
5. Apply demand factor.
6. Apply inventory/supply factor.
7. Apply strategy factor.
8. Calculate margin floor from cost and minimum margin.
9. Recommend the higher of raw calculated price and margin floor.
10. Score confidence.
11. Add policy flags.
12. Route the SKU to auto approval, bulk review, or exception review.

Formula:

```text
raw_price = market_anchor * (1 + demand_factor + inventory_factor + strategy_factor)
margin_floor = cost / (1 - minimum_margin)
recommended_price = max(raw_price, margin_floor)
```

## 7. Risk Routing

| Risk | Basis | Route |
| --- | --- | --- |
| Low | Confidence >= 85%, movement <= 5%, no flags. | Auto approve |
| Medium | Confidence >= 65%, movement <= 15%, no severe flags. | Bulk review |
| High | Low confidence, large movement, low stock, restricted category, unknown SKU, or policy flag. | Exception review |

## 8. React Frontend

Main files:

```text
index.html
app.js
styles.css
```

The React UI displays:

- SKU input.
- Demand input.
- Strategy input.
- Stock override.
- Recommended price.
- Current price.
- Percent change.
- Market min, median, average, and max.
- Competitor price bars.
- Confidence score.
- Risk and approval route.
- Agent reasoning.
- Preview requirements.
- Formula and calculation details.
- Backend workflow and API endpoints.

## 9. Human Approval Workflow

Suggested approval limits:

| Role | Approval Limit |
| --- | --- |
| Pricing Analyst | Up to 5% |
| Pricing Manager | Up to 15% |
| Director | Up to 25% |
| VP / Admin | No limit |

Recommended action by risk:

- Low risk: auto approve after audit logging.
- Medium risk: grouped bulk review by category, manufacturer, or change band.
- High risk: individual exception review before publishing.

## 10. Publish Requirements

Before publishing any price, the frontend and backend should show or store:

- SKU and MPN.
- Old price and new price.
- Cost and projected margin.
- Demand input.
- Competitor market basis.
- Confidence score.
- Risk level and route.
- Policy flags.
- Approver identity and role.
- Approval timestamp.
- Reason code.
- Model or agent version.

## 11. Production Upgrade Path

## 11. Local Environment File

The backend reads local API settings from:

```text
.env
```

Required keys:

```text
SERPAPI_API_KEY=your_serpapi_key_here
SERPAPI_LOCATION=United States
```

After editing `.env`, restart Flask so the new value is loaded.

## 12. Production Upgrade Path

1. Replace `data/catalog.json` with live API-backed catalog data.
2. Connect Quest ERP, PIM, ecommerce, inventory, and account pricing systems.
3. Add authenticated user login and role-based approval.
4. Store recommendations and decisions in a database.
5. Add publish and rollback services.
6. Track sales, margin, conversion, win rate, and approval edits.
7. Feed outcomes back into the pricing rules and model.
