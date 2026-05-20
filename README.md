# n8n-nodes-easyparser

This is an n8n community node for [Easyparser](https://easyparser.com) — a powerful Amazon product data extraction API.

## Features

With this node you can extract structured data from Amazon across 19+ marketplaces. The operations are organized into three main categories exactly as they appear in the Easyparser API Playground:

### 1. Product Data
| Operation | Description |
|---|---|
| **Product Detail** | Full product info: title, price, images, reviews, variants |
| **Product Offers** | All seller offers and pricing for a product |
| **Sales Analysis History** | 12-month sales history and trend data |
| **Best Sellers Rank** | BSR data for a product |
| **Package Dimension** | Physical dimensions and weight |

### 2. Search & Discovery
| Operation | Description |
|---|---|
| **Search** | Search results by keyword or URL |
| **Product Lookup** | Convert EAN / UPC / GTIN to Amazon ASIN |
| **Category** | Get category information |

### 3. Seller Data
| Operation | Description |
|---|---|
| **Seller Profile** | Seller info and feedback history |
| **Seller Products** | All products listed by a seller |
| **Seller Feedback** | Feedback history for a seller |

### Account Data
| Operation | Description |
|---|---|
| **Account Info** | Get your account plan and credit usage details |

*(Note: Customer Reviews operation is currently not active in the Playground and has been removed from this list, but remains supported in the node for backward compatibility if needed.)*

## Advanced Parameters

All API parameters available in the [Easyparser Playground](https://app.easyparser.com/playground) are supported via the **Additional Options** section:
- Pagination (`minPage`, `maxPage`)
- Custom filters and refinements
- A+ Content extraction
- Custom `cookie` and `addressId` injection
- Sorting (`shortBy`)
- Language and Currency overrides

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

Full API documentation: [easyparser.gitbook.io/easyparser-documentation](https://easyparser.gitbook.io/easyparser-documentation/)

## License

MIT
