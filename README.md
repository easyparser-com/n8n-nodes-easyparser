# n8n-nodes-easyparser

This is an n8n community node for [Easyparser](https://easyparser.com) — a powerful Amazon product data extraction API.

## Features

With this node you can extract structured data from Amazon across 19+ marketplaces. Operations are organized into four categories:

### 1. Product Data (Real-Time)
| Operation | Action | Description |
|---|---|---|
| **Product Detail** | Get product detail | Full product info: title, price, images, reviews, variants |
| **Product Offers** | Get product offers | All seller offers and pricing for a product |
| **Sales Analysis History** | Get sales analysis history | Sales history and trend data |
| **Best Sellers Rank** | Get best sellers rank | BSR data for a product |
| **Package Dimension** | Get package dimension | Physical dimensions and weight |

### 2. Search & Discovery (Real-Time)
| Operation | Action | Description |
|---|---|---|
| **Search** | Search products | Search results by keyword or URL |
| **Product Lookup** | Look up product by identifier | Convert EAN / UPC / GTIN / ISBN to Amazon ASIN |
| **Category** | Get category | Category information by Node ID |

### 3. Seller Data (Real-Time)
| Operation | Action | Description |
|---|---|---|
| **Seller Profile** | Get seller profile | Seller info and ratings |
| **Seller Products** | Get seller products | All products listed by a seller |
| **Seller Feedback** | Get seller feedback | Feedback history for a seller |

### 4. Bulk Integration
| Operation | Action | Description |
|---|---|---|
| **Bulk Submit** | Submit bulk request | Submit a batch of requests for async processing via webhook |
| **Bulk Get Result** | Get bulk result by ID | Retrieve parsed result of a bulk query using its ID |

### Account
| Operation | Action | Description |
|---|---|---|
| **Account Info** | Get account info | Account plan and credit usage details |

## Bulk Integration

The Bulk API (`bulk.easyparser.com`) allows you to submit thousands of requests in a single call. Results are delivered asynchronously to your `callback_url` (webhook).

**Typical workflow:**
1. Use **Bulk Submit** to send a batch (e.g., list of ASINs for DETAIL operation)
2. Easyparser processes the batch and sends results to your `callback_url`
3. Alternatively, use **Bulk Get Result** with the `id` values returned in the submit response to poll for results

**Supported bulk operations:** DETAIL · OFFER · SEARCH · PACKAGE_DIMENSION · PRODUCT_LOOKUP · SALES_ANALYSIS_HISTORY · BEST_SELLERS_RANK · SELLER_PROFILE · SELLER_PRODUCTS

**Payload example for DETAIL:**
```json
{"asins": ["B00004RFMB", "B00004RFMC", "B00004RFMJ"]}
```

> Note: In Bulk Integration, input keys are pluralized (e.g., `asins` instead of `asin`, `keywords` instead of `keyword`).

## Advanced Parameters

All optional API parameters are available via the **Additional Options** section:
- Pagination (`minPage`, `maxPage`, `pageNumber`)
- Sorting (`sortBy`)
- Offer filters (prime, free_shipping, condition filters)
- A+ Content extraction
- Language and Currency overrides
- Custom `cookie` and `addressId` injection
- Associate/Affiliate ID

## Installation

In your n8n instance, go to **Settings → Community Nodes** and install:

```
n8n-nodes-easyparser
```

## Credentials

You need an **Easyparser API key**. Get yours at [app.easyparser.com](https://app.easyparser.com).

## Supported Marketplaces

amazon.com · amazon.co.uk · amazon.de · amazon.fr · amazon.it · amazon.es · amazon.ca · amazon.com.mx · amazon.com.br · amazon.co.jp · amazon.com.au · amazon.in · amazon.ae · amazon.sa · amazon.nl · amazon.pl · amazon.se · amazon.com.tr · amazon.sg

## Documentation

- Full API documentation: [easyparser.gitbook.io/easyparser-documentation](https://easyparser.gitbook.io/easyparser-documentation/)
- Bulk Integration: [easyparser.gitbook.io/easyparser-documentation/bulk-integration/overview](https://easyparser.gitbook.io/easyparser-documentation/bulk-integration/overview)

## License

MIT
