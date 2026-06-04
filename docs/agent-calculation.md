# Quest Safety Pricing Agent Calculation

## Agent Name

The backend uses the `Quest Price Intelligence Agent` version `QPIA-1.0`.

This is not a single black-box model. It is a rule-and-market pricing agent that
uses Quest catalog data, competitor market observations, user demand input,
inventory pressure, strategy selection, margin guardrails, and approval routing
rules.

## Sub-Agents

| Agent | What It Does | Basis |
| --- | --- | --- |
| Catalog Matcher Agent | Matches the entered SKU or MPN to the Quest catalog. | SKU, MPN, product title, brand, category, UOM, current price, cost, stock, source URL. |
| Market Intelligence Agent | Reads market price observations. | Amazon, Grainger, Zoro, Fastenal, Uline, regional distributors, manufacturer feed examples. |
| Demand Signal Agent | Converts user demand input into a price factor. | Low, stable, rising, high. |
| Margin Guardrail Agent | Prevents unsafe pricing below margin floor. | Product cost and minimum margin. |
| Risk Router Agent | Decides low, medium, or high risk. | Confidence, price movement, inventory/supply flags, respiratory/safety category flags. |
| Approval Agent | Chooses the review lane. | Low risk auto approval, medium risk bulk review, high risk exception review. |

## User Inputs

The React frontend sends this payload to Flask:

```json
{
  "sku": "PR501M",
  "demand": "high",
  "strategy": "protect_margin",
  "stock_override": 7,
  "use_live_market": true
}
```

Fields:

- `sku`: Quest SKU or manufacturer part number.
- `demand`: `low`, `stable`, `rising`, or `high`.
- `strategy`: `balanced`, `protect_margin`, `win_share`, or `clear_inventory`.
- `stock_override`: optional number to simulate real-time inventory.
- `use_live_market`: when true, Flask tries to fetch live competitor prices
  before calculating the recommendation.

## Live Competitor Extraction

The current live provider is `SerpAPI Google Shopping`.

The backend file is:

```text
market_data.py
```

The provider searches by:

```text
MPN + brand + product title
```

For example, a Quest SKU such as `PR501M` becomes a product query using its MPN,
brand, and title. The provider then returns structured shopping observations:

- Source or seller.
- Product title.
- Extracted price.
- Product image when the provider returns one.
- Stock/delivery text.
- Product link.
- Visible offer SKU/MPN when it can be detected from the title.
- Match score.
- Freshness marker.

Direct Amazon page scraping is not used. For production, use approved APIs such
as SerpAPI, Keepa, DataForSEO, distributor APIs, or manufacturer feeds.

The backend loads the key from:

```text
.env
```

Put your real key here:

```text
SERPAPI_API_KEY=your_serpapi_key_here
SERPAPI_LOCATION=United States
```

If the key is missing or fewer than three usable live observations are found, the
backend falls back to the sample competitor rows in `data/catalog.json` and marks
the result as fallback in the UI.

## Unit Normalization and Exclusions

Safety products are difficult to price-match because the same MPN can appear as:

- 1 pair.
- 1 each.
- 1 box of 12.
- 1 case of 144.
- Different size.
- Different color.
- Different protection rating.

The live market service now separates results into two groups:

| Group | Used For Pricing | UI Behavior |
| --- | --- | --- |
| Comparable offers | Yes | Shown in the normalized market check. |
| Excluded offers | No | Shown separately with the exclusion reason. |

The pricing engine uses `normalized_price` when available:

```text
normalized_price = raw_offer_price adjusted to Quest UOM
```

Examples:

```text
Quest UOM = EA, live offer = box of 12
normalized_price = raw_offer_price / 12

Quest UOM = CS of 30, live offer = each
normalized_price = raw_offer_price * 30
```

If package quantity, MPN, size, color, or other attributes cannot be verified, the
row is excluded from pricing. This prevents a case price from accidentally being
compared as an each price.

## Pricing Formula

The agent calculates market metrics from competitor prices:

```text
market_min = min(competitor_prices)
market_max = max(competitor_prices)
market_average = average(competitor_prices)
market_anchor = median(competitor_prices)
```

It then applies demand, inventory, and strategy factors:

```text
raw_price = market_anchor * (1 + demand_factor + inventory_factor + strategy_factor)
margin_floor = cost / (1 - minimum_margin)
recommended_price = max(raw_price, margin_floor)
```

The recommended price is rounded to USD cents.

## Demand Factors

| Demand | Factor |
| --- | --- |
| Low | -4.0% |
| Stable | 0.0% |
| Rising | +3.0% |
| High | +5.5% |

## Inventory Factors

| Inventory or Supply State | Factor |
| --- | --- |
| Stock <= 10 or constrained supply | +4.0% |
| Stock <= 25 or limited supply | +2.0% |
| Stock >= 200 | -2.0% |
| Normal stock | 0.0% |

## Strategy Factors

| Strategy | Factor |
| --- | --- |
| Balanced | 0.0% |
| Protect margin | +2.0% |
| Win share | -1.8% |
| Clear inventory | -3.5% |

## Confidence Score

The confidence score is based on:

- Number of competitor sources.
- Market price spread.
- Source freshness.
- Product match score.
- Size of the recommended price movement.

Penalties:

- Stale competitor data reduces confidence.
- Weak match scores reduce confidence.
- Wide market spread reduces confidence.
- Large price movement reduces confidence.
- Fewer than three competitor observations reduces confidence.

## Risk Routing

| Risk | Basis | Route |
| --- | --- | --- |
| Low | Confidence >= 85%, price movement <= 5%, no policy flags. | Auto approve |
| Medium | Confidence >= 65%, movement within 15%, no severe policy flags. | Bulk review |
| High | Confidence < 65%, movement > 15%, low stock, restricted category, or policy flag. | Exception review |

## Policy Flags

The agent raises policy flags for:

- Low stock or constrained supply.
- Projected margin below minimum.
- Low confidence.
- Safety-critical respiratory categories.
- Unknown SKU.

Any policy flag pushes the recommendation to high risk and exception review.

## Preview Requirements Returned to the Frontend

For every SKU analysis, Flask returns requirements the frontend should show:

- SKU, MPN, brand, category, UOM, current price, cost, stock, source URL.
- Market min, max, average, median, freshness, stock state, and match score.
- Demand input, strategy input, margin floor, recommended price, confidence,
  risk, and route.
- Audit fields: old price, new price, who approved, why, when, and model version.
- Approval route requirements based on risk.

## Example

For SKU `PR501M` with high demand and low stock:

1. Catalog Matcher Agent finds the Quest record.
2. Market Intelligence Agent checks competitor prices.
3. Demand Signal Agent applies a `+5.5%` demand factor.
4. Inventory pressure applies an additional stock factor.
5. Margin Guardrail Agent checks the cost floor.
6. Risk Router Agent sees low stock and respiratory category flags.
7. Approval Agent routes the item to exception review.

The UI then previews the recommended price, confidence, risk, route, reasons,
competitor signals, and required approval controls.
