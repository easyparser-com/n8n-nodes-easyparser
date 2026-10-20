# n8n-nodes-easyparser

The official n8n community node for [Easyparser](https://easyparser.com), a real-time Amazon data API. Retrieve product, offer, search, seller and sales data without managing scraping infrastructure.

## Installation

In your n8n instance, open **Settings → Community Nodes** and install `n8n-nodes-easyparser`. Select your Easyparser credential on the node. Obtain your own API key at [app.easyparser.com](https://app.easyparser.com).

Version `0.3.0` adds current API-contract support. Read [the migration guide](docs/MIGRATION-0.3.0.md) before upgrading an existing workflow. The node keeps its existing name, field identifiers, raw JSON output and input-item pairing.

## Operations

Real-time operations are Product Detail (`DETAIL`), Product Offers (`OFFER`), Search (`SEARCH`), Sales Analysis History (`SALES_ANALYSIS_HISTORY`), Best Sellers Rank (`BEST_SELLERS_RANK`), Package Dimension (`PACKAGE_DIMENSION`), Product Lookup (`PRODUCT_LOOKUP`), Seller Profile (`SELLER_PROFILE`), Seller Products (`SELLER_PRODUCTS`), Seller Feedback (`SELLER_FEEDBACK`) and Similar Products (`SIMILAR_PRODUCTS`).

Account Info retrieves account and usage information. Bulk Submit creates asynchronous jobs; Bulk Get Result retrieves one accepted query's result. The node can also be used as an n8n AI agent tool.

### Similar Products

Select **Similar Products**, enter an ASIN or a supported Amazon product URL, and choose **Similar Limit**: `10`, `50` or `100`. The default is `10`. The raw list is returned at `result.product.similar`. Use n8n's Split Out node if you need one item per similar product. Limits can affect credit consumption; consult [the current request documentation](https://docs.easyparser.com/real-time-integration/similar-products/request).

### Product identifiers and URLs

Existing ASIN, search and seller field identifiers are preserved. For OFFER and SIMILAR_PRODUCTS, a URL is converted to an ASIN before the request: `/dp/`, `/gp/product/`, `/gp/aw/d/` and `/product/` product URLs are supported. An invalid identifier or a URL that cannot be converted produces an explicit error rather than an unsupported OFFER URL request. The selected marketplace remains authoritative; it is not silently changed to the URL's marketplace.

## Additional Options

Optional settings are passed as explicit Easyparser request parameters, not as arbitrary raw API overrides.

- **Operation Version**: `0` means the current Live version and omits `operation_version`. A positive integer requests that operation version. Leave it at `0` for operations without a documented alternate version.
- **Include HTML**: available for DETAIL and SEARCH. Sends the selected boolean as `include_html`.
- **Detail Seller ID**: optional `seller_id` for DETAIL.
- **History Range**: Sales Analysis History accepts `0`, `3`, `6`, `9` or `12`; Seller Feedback accepts `1`, `3`, `12` or `all`. Blank values use the API default. Request ranges and credit costs are documented at [docs.easyparser.com](https://docs.easyparser.com).
- **Min Page / Max Page**: positive integer start/end pages. SEARCH and SELLER_FEEDBACK accept at most five pages in one requested range. This is a range-length limit, **not** a rule that the ending page number must be at most five.
- **Min Rating / Max Rating**: Seller Feedback integer ratings from `1` to `5`, with minimum not greater than maximum.
- Existing language, currency, address, cookie, affiliate, sorting, refinements, A+ content and other parameter fields remain available. A+ content can consume extra credits.

The **Parameters** option is for custom Amazon URL parameters. It is not a generic passthrough for Easyparser root parameters such as `operation_version`.

### Offer filters

New boolean options map to the documented `prime`, `free_shipping`, `condition_new`, `condition_used_like_new`, `condition_used_very_good`, `condition_used_good` and `condition_used_acceptable` query parameters. Explicit `false` values are respected; the node does not introduce a new-condition-only default.

The existing **Offer Filters** CSV field is retained for old workflows and still sends its original `filter` parameter. The current docs describe separate booleans; support and equivalence of the older CSV API form have not been live-tested here. Use either the legacy CSV field or the explicit boolean options, not both. Mixing them produces a clear validation error instead of assuming a precedence rule.

## Raw response and API errors

Each input item produces one raw response item with its `pairedItem` association preserved. No new result projection, price coercion, field aliases or automatic list flattening is performed. New or optional upstream response fields are retained.

**Fail On API Error** is enabled by default. Explicit upstream failures, including `request_info.success: false`, top-level `success: false` / `error`, or failed Bulk query results, become node errors. n8n's **On Error / Continue On Fail** setting can retain the failed item and continue with later input items.

Disable **Fail On API Error** only when your workflow deliberately routes raw failure envelopes itself. This retains the legacy response-body behavior; it does not disable input validation or turn HTTP/network exceptions into successful responses.

A Bulk `pending` query is not an API error. Partially accepted Bulk responses retain every outcome array so your workflow can handle rejected items separately.

All HTTP requests have an explicit 60-second client timeout. There is no hidden automatic retry of paid extraction requests or Bulk Submit: retrying may consume more credits or duplicate jobs. If you enable n8n's Retry On Fail, account for those effects; use a Wait/loop for pending results rather than resubmitting the batch.

## Bulk integration

Bulk Submit uses a JSON object as **Payload (JSON)** and sends one request object inside the API's required outer array. Supported operations include DETAIL, OFFER, SEARCH, PACKAGE_DIMENSION, PRODUCT_LOOKUP, SALES_ANALYSIS_HISTORY, BEST_SELLERS_RANK, SELLER_PROFILE, SELLER_PRODUCTS and SELLER_FEEDBACK. SIMILAR_PRODUCTS is not advertised as Bulk support without a documented Bulk contract.

Example DETAIL payload:

```json
{ "asins": ["B00004RFMB", "B00004RFMC"] }
```

The callback must be a valid HTTP(S) URL you control. Bulk Additional Options accepts Address ID and Operation Version. The operation version is sent at the request root, not inside `payload`.

Accepted IDs are at `data.accepted[].results[].id` — lowercase `id`. Submit responses also contain invalid, failed, insufficient-credit and rate-limit outcome groups. A partially accepted request is not automatically failed by the node.

Bulk Get Result uses one accepted query ID. Inspect `data.status` before accessing `data.json_result`: `pending` has no parsed result yet, `success` has the parsed response and `failure` has error details. The node retrieves once; it does not poll or resubmit automatically. Callback notifications contain ready result IDs; retrieve parsed content through the Data Service. Fetch and store results promptly because retention is at most 24 hours and may be shorter.

## Response-version migration

BEST_SELLERS_RANK Live version `1` has Beta version `2`, scheduled to become Live on **November 1, 2026**. Select Operation Version `2` to test your workflow before that date. After promotion, requesting the old version **does not** preserve the old response indefinitely.

In version `2`, `result.product.bestseller.rank` becomes `category_rank`, and `context_name` becomes `category_title`. The image path changes from `result.product.media.image_url` to `result.product.image.link`. Product price, currency and reviews are removed from the BSR response. The raw node output follows the API; it does not fabricate replacements. See [the migration guide](docs/MIGRATION-0.3.0.md) and [the official operation-version policy](https://docs.easyparser.com/amazon/operation-versioning).

PRODUCT_LOOKUP's `image_url` and `thumb_string_url` fields are marked for removal in the docs. Prefer `main_image.link` and `thumb_image.link`, with missing-value handling.

## Supported marketplaces

The shared real-time/Bulk catalogue includes `.com`, `.co.uk`, `.de`, `.fr`, `.it`, `.es`, `.ca`, `.com.mx`, `.com.br`, `.co.jp`, `.com.au`, `.in`, `.ae`, `.sa`, `.nl`, `.pl`, `.se`, `.com.tr`, `.sg`, `.ie` and `.com.be`.

Domain strings, Amazon hostnames and full Amazon URLs are normalized. Unknown domains now fail clearly; they no longer silently query `.com`. `.eg` is not included because it is absent from the current official marketplace list, even though an Apify actor schema previously listed it. Verify current support before adding it.

## Importable examples

The JSON files in [examples/](examples) are inactive workflows with no credentials or secret values:

- [Similar products](examples/similar-products.json).
- [BSR version 2 and response migration](examples/bsr-version-2.json).
- [Bulk result status handling](examples/bulk-result-status.json).

Install the node, import the workflow, select your own credential and replace any placeholders before manually running. Running examples calls the real API and consumes your account credits; importing them does not.

## Development

```bash
npm ci --ignore-scripts
npm run check
npm pack --dry-run --ignore-scripts
```

`npm run check` runs TypeScript linting, a fresh build and offline `node:test` regression tests. Tests replace all HTTP helpers with mocks and do not use API credentials or spend credits. CI checks Node.js 20 and 22. Publishing also runs the checks and verifies that the Git tag matches the package version.

## Documentation and license

[Current API documentation](https://docs.easyparser.com) · [Bulk integration](https://docs.easyparser.com/bulk-integration/overview) · [Changelog](CHANGELOG.md)

MIT
