import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
} from "n8n-workflow";
import type { JsonObject } from "n8n-workflow";

const REQUEST_TIMEOUT = 60_000;
const MARKETPLACE_DOMAINS = [
  ".ae",
  ".ca",
  ".co.jp",
  ".co.uk",
  ".com",
  ".com.au",
  ".com.be",
  ".com.br",
  ".com.mx",
  ".com.tr",
  ".de",
  ".es",
  ".fr",
  ".ie",
  ".in",
  ".it",
  ".nl",
  ".pl",
  ".sa",
  ".se",
  ".sg",
] as const;
const PRODUCT_OPERATIONS = [
  "DETAIL",
  "OFFER",
  "SALES_ANALYSIS_HISTORY",
  "BEST_SELLERS_RANK",
  "PACKAGE_DIMENSION",
  "SIMILAR_PRODUCTS",
];
const OFFER_BOOLEAN_FILTERS = [
  ["prime", "prime"],
  ["freeShipping", "free_shipping"],
  ["conditionNew", "condition_new"],
  ["conditionUsedLikeNew", "condition_used_like_new"],
  ["conditionUsedVeryGood", "condition_used_very_good"],
  ["conditionUsedGood", "condition_used_good"],
  ["conditionUsedAcceptable", "condition_used_acceptable"],
] as const;
type Options = Record<string, unknown>;
type Query = Record<string, string | number | boolean>;
const hasOwn = (value: Options, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseHttpUrl(value: string): URL | undefined {
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    return (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}
function marketplaceForHostname(hostname: string): string | undefined {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const domain = host.startsWith("amazon") ? host.slice("amazon".length) : "";
  return MARKETPLACE_DOMAINS.includes(
    domain as (typeof MARKETPLACE_DOMAINS)[number],
  )
    ? domain
    : undefined;
}
function normalizeMarketplace(value: string): string | undefined {
  const input = value.trim().toLowerCase();
  const direct = input.startsWith("amazon.")
    ? input.slice("amazon".length)
    : input;
  const candidate = direct.startsWith(".") ? direct : `.${direct}`;
  if (
    MARKETPLACE_DOMAINS.includes(
      candidate as (typeof MARKETPLACE_DOMAINS)[number],
    )
  )
    return candidate;
  const url = parseHttpUrl(input);
  return url ? marketplaceForHostname(url.hostname) : undefined;
}
function parseAmazonUrl(value: string): URL | undefined {
  const url = parseHttpUrl(value);
  return url && marketplaceForHostname(url.hostname) ? url : undefined;
}
function extractAmazonProductAsin(value: string): string | undefined {
  const url = parseAmazonUrl(value);
  const match = url?.pathname.match(
    /\/(?:dp|gp\/product|gp\/aw\/d|product)\/([a-z0-9]{10})(?=$|\/)/i,
  );
  return match?.[1].toUpperCase();
}
function positiveInteger(
  value: unknown,
  label: string,
  node: IExecuteFunctions,
  itemIndex: number,
): number {
  const numeric = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof numeric !== "number" || !Number.isInteger(numeric) || numeric < 1)
    throw new NodeOperationError(
      node.getNode(),
      `${label} must be a positive integer`,
      { itemIndex },
    );
  return numeric;
}
function operationVersion(
  value: unknown,
  label: string,
  node: IExecuteFunctions,
  itemIndex: number,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = value;
  if (typeof numeric !== "number" || !Number.isInteger(numeric) || numeric < 0)
    throw new NodeOperationError(
      node.getNode(),
      `${label} must be a non-negative integer`,
      { itemIndex },
    );
  return numeric || undefined;
}
function booleanValue(
  value: unknown,
  label: string,
  node: IExecuteFunctions,
  itemIndex: number,
): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new NodeOperationError(node.getNode(), `${label} must be a boolean`, {
    itemIndex,
  });
}
function safeMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const messages = value.map(safeMessage).filter(Boolean);
    return messages.length ? messages.join("; ") : undefined;
  }
  return isRecord(value) &&
    typeof value.message === "string" &&
    value.message.trim()
    ? value.message.trim()
    : undefined;
}
function logicalApiError(
  response: JsonObject,
  operation: string,
): string | undefined {
  const requestInfo = isRecord(response.request_info)
    ? response.request_info
    : undefined;
  const data = isRecord(response.data) ? response.data : undefined;
  const bulkRequestInfo =
    data &&
    isRecord(data.json_result) &&
    isRecord(data.json_result.request_info)
      ? data.json_result.request_info
      : undefined;
  const status =
    typeof data?.status === "string" ? data.status.toLowerCase() : "";
  const failed =
    Boolean(response.error) ||
    response.success === false ||
    requestInfo?.success === false ||
    status === "failure" ||
    status === "failed" ||
    bulkRequestInfo?.success === false;
  if (!failed) return undefined;
  const detail =
    safeMessage(response.error) ??
    safeMessage(response.message) ??
    safeMessage(requestInfo?.error_details) ??
    safeMessage(bulkRequestInfo?.error_details);
  return detail
    ? `Easyparser API reported an error: ${detail}`
    : "Easyparser API reported an error";
}

export class Easyparser implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Easyparser",
    name: "easyparser",
    icon: "file:easyparser.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: "Extract structured Amazon product data using Easyparser API",
    usableAsTool: true,
    defaults: {
      name: "Easyparser",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "easyparserApi",
        required: true,
      },
    ],

    properties: [
      // ─── Operation ────────────────────────────────────────────────
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Account Info",
            value: "ACCOUNT_INFO",
            description: "Get account plan and credit usage details",
            action: "Get account info",
          },
          {
            name: "Best Sellers Rank",
            value: "BEST_SELLERS_RANK",
            description: "Get Best Sellers Rank for a product",
            action: "Get best sellers rank",
          },
          {
            name: "Bulk Get Result",
            value: "BULK_GET_RESULT",
            description: "Retrieve the result of a bulk query by its ID",
            action: "Get bulk result by ID",
          },
          {
            name: "Bulk Submit",
            value: "BULK_SUBMIT",
            description:
              "Submit a batch of requests to the Bulk API for async processing",
            action: "Submit bulk request",
          },
          {
            name: "Package Dimension",
            value: "PACKAGE_DIMENSION",
            description: "Get physical dimensions and weight of a product",
            action: "Get package dimension",
          },
          {
            name: "Product Detail",
            value: "DETAIL",
            description: "Get detailed information about a product",
            action: "Get product detail",
          },
          {
            name: "Product Lookup",
            value: "PRODUCT_LOOKUP",
            description: "Convert EAN / UPC / GTIN to Amazon ASIN",
            action: "Look up product by identifier",
          },
          {
            name: "Product Offers",
            value: "OFFER",
            description: "Get price offers for a product",
            action: "Get product offers",
          },
          {
            name: "Sales Analysis History",
            value: "SALES_ANALYSIS_HISTORY",
            description: "Get sales history and trend data",
            action: "Get sales analysis history",
          },
          {
            name: "Search",
            value: "SEARCH",
            description: "Search for products by keyword or URL",
            action: "Search products",
          },
          {
            name: "Seller Feedback",
            value: "SELLER_FEEDBACK",
            description: "Get feedback history for a seller",
            action: "Get seller feedback",
          },
          {
            name: "Seller Products",
            value: "SELLER_PRODUCTS",
            description: "Get all products listed by a seller",
            action: "Get seller products",
          },
          {
            name: "Seller Profile",
            value: "SELLER_PROFILE",
            description: "Get seller information and ratings",
            action: "Get seller profile",
          },
          {
            name: "Similar Products",
            value: "SIMILAR_PRODUCTS",
            description: "Get products similar to an Amazon product",
            action: "Get similar products",
          },
        ],
        default: "DETAIL",
      },

      {
        displayName: "Fail on API Error",
        name: "failOnApiError",
        type: "boolean",
        default: true,
        description:
          "Whether to fail when an HTTP-successful response contains an Easyparser API error envelope",
      },

      // ─── Amazon Domain (Real-Time operations) ────────────────────────────────────────────
      {
        displayName: "Amazon Domain",
        name: "domain",
        type: "string",
        default: ".com",
        required: true,
        placeholder: ".com",
        description:
          "Amazon marketplace domain extension. MUST be one of: .com, .ca, .co.uk, .de, .fr, .it, .es, .co.jp, .com.au, .com.be, .ie, .in, .ae, .sa, .nl, .pl, .se, .com.tr, .sg, .com.mx, .com.br. Always starts with a dot. For example use .ca for Canada, .de for Germany, .co.uk for UK.",
        displayOptions: {
          hide: {
            operation: ["ACCOUNT_INFO", "BULK_SUBMIT", "BULK_GET_RESULT"],
          },
        },
      },

      // ─── ASIN / URL (Detail, Offer, Sales_Analysis_History, BEST_SELLERS_RANK, PACKAGE_DIMENSION) ──
      {
        displayName: "ASIN or URL",
        name: "asin",
        type: "string",
        default: "",
        required: true,
        placeholder: "B0F25371FH",
        description:
          "Amazon ASIN (10-character alphanumeric code, e.g. B0F25371FH) or full product URL (e.g. https://amazon.com/dp/B0F25371FH).",
        displayOptions: {
          show: {
            operation: [
              "DETAIL",
              "OFFER",
              "SALES_ANALYSIS_HISTORY",
              "BEST_SELLERS_RANK",
              "PACKAGE_DIMENSION",
              "SIMILAR_PRODUCTS",
            ],
          },
        },
      },

      {
        displayName: "Similar Product Limit",
        name: "similarLimit",
        type: "options",
        options: [
          { name: "10", value: "10" },
          { name: "50", value: "50" },
          { name: "100", value: "100" },
        ],
        default: "10",
        displayOptions: { show: { operation: ["SIMILAR_PRODUCTS"] } },
      },

      // ─── Keyword / URL (Search) ───────────────────────────────
      {
        displayName: "Search Keyword or URL",
        name: "keyword",
        type: "string",
        default: "",
        required: true,
        placeholder: "wireless headphones",
        description: "Keyword or Amazon search URL to search for products",
        displayOptions: {
          show: {
            operation: ["SEARCH"],
          },
        },
      },

      // ─── Identifier (Product_Lookup) ─────────────────────────
      {
        displayName: "Identifier Type",
        name: "identifier_type",
        type: "options",
        options: [
          { name: "ASIN", value: "ASIN" },
          { name: "EAN", value: "EAN" },
          { name: "GTIN", value: "GTIN" },
          { name: "ISBN", value: "ISBN" },
          { name: "JAN", value: "JAN" },
          { name: "MINSAN", value: "MINSAN" },
          { name: "UPC", value: "UPC" },
        ],
        default: "EAN",
        required: true,
        displayOptions: {
          show: {
            operation: ["PRODUCT_LOOKUP"],
          },
        },
      },
      {
        displayName: "Product Identifier",
        name: "identifier",
        type: "string",
        default: "",
        required: true,
        placeholder: "0194252032618",
        description: "EAN, UPC, GTIN, ISBN, JAN, MINSAN or ASIN to look up",
        displayOptions: {
          show: {
            operation: ["PRODUCT_LOOKUP"],
          },
        },
      },

      // ─── Seller ID / URL (Seller_Profile, Seller_Products, Seller_Feedback) ─────────
      {
        displayName: "Seller ID or Storefront URL",
        name: "sellerId",
        type: "string",
        default: "",
        required: true,
        placeholder: "A2R2RITDJNW1Q6",
        description: "Amazon Seller ID or full storefront URL",
        displayOptions: {
          show: {
            operation: ["SELLER_PROFILE", "SELLER_PRODUCTS", "SELLER_FEEDBACK"],
          },
        },
      },

      // ─── BULK SUBMIT fields ──────────────────────────────────────────────
      {
        displayName: "Bulk Operation Type",
        name: "bulkOperation",
        type: "options",
        options: [
          { name: "Best Sellers Rank", value: "BEST_SELLERS_RANK" },
          { name: "Detail", value: "DETAIL" },
          { name: "Offer", value: "OFFER" },
          { name: "Package Dimension", value: "PACKAGE_DIMENSION" },
          { name: "Product Lookup", value: "PRODUCT_LOOKUP" },
          { name: "Sales Analysis History", value: "SALES_ANALYSIS_HISTORY" },
          { name: "Search", value: "SEARCH" },
          { name: "Seller Feedback", value: "SELLER_FEEDBACK" },
          { name: "Seller Products", value: "SELLER_PRODUCTS" },
          { name: "Seller Profile", value: "SELLER_PROFILE" },
        ],
        default: "DETAIL",
        required: true,
        displayOptions: {
          show: {
            operation: ["BULK_SUBMIT"],
          },
        },
      },
      {
        displayName: "Bulk Amazon Domain",
        name: "bulkDomain",
        type: "options",
        options: [
          { name: "amazon.ae (UAE)", value: ".ae" },
          { name: "amazon.ca (Canada)", value: ".ca" },
          { name: "amazon.co.jp (Japan)", value: ".co.jp" },
          { name: "amazon.co.uk (UK)", value: ".co.uk" },
          { name: "amazon.com (US)", value: ".com" },
          { name: "amazon.com.au (Australia)", value: ".com.au" },
          { name: "amazon.com.be (Belgium)", value: ".com.be" },
          { name: "amazon.com.br (Brazil)", value: ".com.br" },
          { name: "amazon.com.mx (Mexico)", value: ".com.mx" },
          { name: "amazon.com.tr (Turkey)", value: ".com.tr" },
          { name: "amazon.de (Germany)", value: ".de" },
          { name: "amazon.es (Spain)", value: ".es" },
          { name: "amazon.fr (France)", value: ".fr" },
          { name: "amazon.ie (Ireland)", value: ".ie" },
          { name: "amazon.in (India)", value: ".in" },
          { name: "amazon.it (Italy)", value: ".it" },
          { name: "amazon.nl (Netherlands)", value: ".nl" },
          { name: "amazon.pl (Poland)", value: ".pl" },
          { name: "amazon.sa (Saudi Arabia)", value: ".sa" },
          { name: "amazon.se (Sweden)", value: ".se" },
          { name: "amazon.sg (Singapore)", value: ".sg" },
        ],
        default: ".com",
        required: true,
        description: "The Amazon marketplace to query",
        displayOptions: {
          show: {
            operation: ["BULK_SUBMIT"],
          },
        },
      },
      {
        displayName: "Callback URL",
        name: "callbackUrl",
        type: "string",
        default: "",
        required: true,
        placeholder: "https://your-server.com/webhook",
        description:
          "Your server endpoint that will receive the results when processing is complete",
        displayOptions: {
          show: {
            operation: ["BULK_SUBMIT"],
          },
        },
      },
      {
        displayName: "Payload (JSON)",
        name: "bulkPayload",
        type: "json",
        default: "{}",
        required: true,
        description:
          'The payload object for the bulk operation. Keys are pluralized (e.g. "asins", "keywords", "URLs"). Example for DETAIL: {"asins": ["B00004RFMB", "B00004RFMC"]}',
        displayOptions: {
          show: {
            operation: ["BULK_SUBMIT"],
          },
        },
      },
      {
        displayName: "Bulk Additional Options",
        name: "bulkAdditionalOptions",
        type: "collection",
        placeholder: "Add option",
        default: {},
        displayOptions: {
          show: {
            operation: ["BULK_SUBMIT"],
          },
        },
        options: [
          {
            displayName: "Address ID",
            name: "address_id",
            type: "number",
            default: 0,
            description:
              "The unique ID for a specific delivery address (optional)",
          },
          {
            displayName: "Operation Version",
            name: "operationVersion",
            type: "number",
            typeOptions: { minValue: 0 },
            default: 0,
            description: "Leave at 0 for the current Live version",
          },
        ],
      },

      // ─── BULK GET RESULT fields ──────────────────────────────────────────────
      {
        displayName: "Query ID",
        name: "queryId",
        type: "string",
        default: "",
        required: true,
        placeholder: "qwe78933-7614-40b3-9a40-def192b74810",
        description:
          "The unique query ID returned from a Bulk Submit response (results[].ID). Use the ID field from the bulk submit response.",
        displayOptions: {
          show: {
            operation: ["BULK_GET_RESULT"],
          },
        },
      },

      // ─── Additional Options (Real-Time operations) ───────────────────────────────────────
      {
        displayName: "Additional Options",
        name: "additionalOptions",
        type: "collection",
        placeholder: "Add option",
        default: {},
        displayOptions: {
          hide: {
            operation: ["ACCOUNT_INFO", "BULK_SUBMIT", "BULK_GET_RESULT"],
          },
        },
        // Existing option order is retained so saved workflows keep the familiar editor order.
        // eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
        options: [
          {
            displayName: "Detail Seller ID",
            name: "detailSellerId",
            type: "string",
            default: "",
            displayOptions: { show: { "/operation": ["DETAIL"] } },
          },
          {
            displayName: "Include HTML",
            name: "includeHtml",
            type: "boolean",
            default: false,
            displayOptions: { show: { "/operation": ["DETAIL", "SEARCH"] } },
          },
          {
            displayName: "Operation Version",
            name: "operationVersion",
            type: "number",
            typeOptions: { minValue: 0 },
            default: 0,
            description:
              "Leave at 0 for Live. Best Sellers Rank Beta 2 became Live on 1 November 2026; old versions cannot be pinned indefinitely.",
          },
          {
            displayName: "Prime",
            name: "prime",
            type: "boolean",
            default: false,
            displayOptions: { show: { "/operation": ["OFFER"] } },
          },
          {
            displayName: "Free Shipping",
            name: "freeShipping",
            type: "boolean",
            default: false,
            displayOptions: { show: { "/operation": ["OFFER"] } },
          },
          {
            displayName: "Condition New",
            name: "conditionNew",
            type: "boolean",
            default: false,
            displayOptions: { show: { "/operation": ["OFFER"] } },
          },
          {
            displayName: "Condition Used Like New",
            name: "conditionUsedLikeNew",
            type: "boolean",
            default: false,
            displayOptions: { show: { "/operation": ["OFFER"] } },
          },
          {
            displayName: "Condition Used Very Good",
            name: "conditionUsedVeryGood",
            type: "boolean",
            default: false,
            displayOptions: { show: { "/operation": ["OFFER"] } },
          },
          {
            displayName: "Condition Used Good",
            name: "conditionUsedGood",
            type: "boolean",
            default: false,
            displayOptions: { show: { "/operation": ["OFFER"] } },
          },
          {
            displayName: "Condition Used Acceptable",
            name: "conditionUsedAcceptable",
            type: "boolean",
            default: false,
            displayOptions: { show: { "/operation": ["OFFER"] } },
          },
          {
            displayName: "A+ Content",
            name: "a_plus_content",
            type: "boolean",
            default: false,
            description: "Whether to extract A+ content (costs extra credits)",
            displayOptions: {
              show: {
                "/operation": ["DETAIL"],
              },
            },
          },
          {
            displayName: "Address ID",
            name: "addressId",
            type: "string",
            default: "",
            description:
              "Delivery address ID for region-specific results (from Easyparser dashboard)",
          },
          {
            displayName: "Associate ID",
            name: "associateId",
            type: "string",
            default: "",
            description: "Amazon Associate/Affiliate ID to include in links",
            displayOptions: {
              show: {
                "/operation": [
                  "DETAIL",
                  "OFFER",
                  "SEARCH",
                  "SELLER_PROFILE",
                  "SELLER_PRODUCTS",
                ],
              },
            },
          },
          {
            displayName: "Cookie",
            name: "cookie",
            type: "string",
            default: "",
            description: "Custom cookie string to send with the request",
          },
          {
            displayName: "Currency",
            name: "currency",
            type: "string",
            default: "",
            placeholder: "USD",
            description:
              "ISO currency code for price data (e.g., USD, EUR, GBP)",
          },
          {
            displayName: "Exclude Refinements",
            name: "exclude_refinements",
            type: "boolean",
            default: false,
            description: "Whether to exclude refinements from search results",
            displayOptions: {
              show: {
                "/operation": ["SEARCH", "SELLER_PRODUCTS"],
              },
            },
          },
          {
            displayName: "Exclude Sponsored",
            name: "excludeSponsored",
            type: "boolean",
            default: false,
            description: "Whether to exclude sponsored products from results",
            displayOptions: {
              show: {
                "/operation": ["SEARCH"],
              },
            },
          },
          {
            displayName: "History Range",
            name: "historyRange",
            type: "string",
            default: "",
            placeholder: "3",
            options: [
              { name: "0", value: "0" },
              { name: "1", value: "1" },
              { name: "3", value: "3" },
              { name: "6", value: "6" },
              { name: "9", value: "9" },
              { name: "12", value: "12" },
              { name: "All", value: "all" },
            ],
            description: 'Duration for analysis in months (e.g., "3")',
            displayOptions: {
              show: {
                "/operation": ["SALES_ANALYSIS_HISTORY", "SELLER_FEEDBACK"],
              },
            },
          },
          {
            displayName: "Language",
            name: "language",
            type: "string",
            default: "",
            placeholder: "en_US",
            description:
              "Preferred data language (e.g., en_US, de_DE). Note: Incompatible with Address ID.",
          },
          {
            displayName: "Max Page",
            name: "maxPage",
            type: "number",
            typeOptions: { minValue: 1 },
            default: 1,
            description: "Maximum page number for paginated results",
            displayOptions: {
              show: {
                "/operation": ["SEARCH", "SELLER_FEEDBACK"],
              },
            },
          },
          {
            displayName: "Max Rating",
            name: "maxRating",
            type: "number",
            typeOptions: { minValue: 1, maxValue: 5 },
            default: 5,
            description: "Maximum seller rating filter",
            displayOptions: {
              show: {
                "/operation": ["SELLER_FEEDBACK"],
              },
            },
          },
          {
            displayName: "Min Page",
            name: "minPage",
            type: "number",
            typeOptions: { minValue: 1 },
            default: 1,
            description: "Minimum page number for paginated results",
            displayOptions: {
              show: {
                "/operation": ["SEARCH", "SELLER_FEEDBACK"],
              },
            },
          },
          {
            displayName: "Min Quantity",
            name: "minQuantity",
            type: "number",
            typeOptions: { minValue: 1 },
            default: 1,
            description: "Minimum quantity available filter for offers",
            displayOptions: {
              show: {
                "/operation": ["OFFER"],
              },
            },
          },
          {
            displayName: "Min Rating",
            name: "minRating",
            type: "number",
            typeOptions: { minValue: 1, maxValue: 5 },
            default: 1,
            description: "Minimum seller rating filter",
            displayOptions: {
              show: {
                "/operation": ["SELLER_FEEDBACK"],
              },
            },
          },
          {
            displayName: "Offer Filters",
            name: "offerFilters",
            type: "string",
            default: "",
            placeholder: "prime,free_shipping",
            description:
              "Comma-separated offer filters. Logistics: prime, free_shipping. Condition: condition_new, condition_used_like_new, condition_used_very_good, condition_used_good, condition_used_acceptable.",
            displayOptions: {
              show: {
                "/operation": ["OFFER"],
              },
            },
          },
          {
            displayName: "Page Number",
            name: "pageNumber",
            type: "number",
            typeOptions: { minValue: 1 },
            default: 1,
            description: "Specific result page to extract",
            displayOptions: {
              show: {
                "/operation": ["SEARCH", "SELLER_PRODUCTS"],
              },
            },
          },
          {
            displayName: "Parameters",
            name: "parameters",
            type: "string",
            default: "",
            description:
              "Custom URL parameters to append to the Amazon request",
          },
          {
            displayName: "Refinements",
            name: "refinements",
            type: "string",
            default: "",
            description: "Custom refinements string",
            displayOptions: {
              show: {
                "/operation": ["SEARCH", "SELLER_PRODUCTS"],
              },
            },
          },
          {
            displayName: "Sort By",
            name: "sortBy",
            type: "options",
            options: [
              { name: "Avg. Customer Review", value: "review-rank" },
              { name: "Best Sellers", value: "exact-aware-popularity-rank" },
              { name: "Featured", value: "featured" },
              { name: "Newest Arrivals", value: "date-desc-rank" },
              { name: "Price: High to Low", value: "price-desc-rank" },
              { name: "Price: Low to High", value: "price-asc-rank" },
            ],
            default: "featured",
            description: "Sort order for search results",
            displayOptions: {
              show: {
                "/operation": ["SEARCH"],
              },
            },
          },
          {
            displayName: "Sort By (Seller Products)",
            name: "sortBySeller",
            type: "options",
            options: [
              { name: "Best Sellers", value: "exact-aware-popularity-rank" },
              { name: "Featured", value: "featured-rank" },
            ],
            default: "featured-rank",
            description: "Sort order for seller product listings",
            displayOptions: {
              show: {
                "/operation": ["SELLER_PRODUCTS"],
              },
            },
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const checked = (
      response: unknown,
      operation: string,
      itemIndex: number,
      strict: boolean,
    ): JsonObject => {
      if (!isRecord(response))
        throw new NodeOperationError(
          this.getNode(),
          "Easyparser API response must be a JSON object",
          { itemIndex },
        );
      const json = response as JsonObject;
      const error = strict ? logicalApiError(json, operation) : undefined;
      if (error)
        throw new NodeOperationError(this.getNode(), error, { itemIndex });
      return json;
    };

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter("operation", i) as string;
        const strict = this.getNodeParameter(
          "failOnApiError",
          i,
          true,
        ) as boolean;

        if (operation === "ACCOUNT_INFO") {
          const response =
            await this.helpers.httpRequestWithAuthentication.call(
              this,
              "easyparserApi",
              {
                method: "GET",
                url: "https://account.easyparser.com/v1/account",
                qs: {},
                json: true,
                timeout: REQUEST_TIMEOUT,
              },
            );
          returnData.push({
            json: checked(response, operation, i, strict),
            pairedItem: { item: i },
          });
          continue;
        }

        if (operation === "BULK_SUBMIT") {
          const bulkOperation = this.getNodeParameter(
            "bulkOperation",
            i,
          ) as string;
          const domain = normalizeMarketplace(
            this.getNodeParameter("bulkDomain", i) as string,
          );
          if (!domain)
            throw new NodeOperationError(
              this.getNode(),
              "Bulk Amazon Domain must be a supported Amazon marketplace domain",
              { itemIndex: i },
            );
          const callbackUrl = String(
            this.getNodeParameter("callbackUrl", i),
          ).trim();
          if (!/^https?:\/\//i.test(callbackUrl) || !parseHttpUrl(callbackUrl))
            throw new NodeOperationError(
              this.getNode(),
              "Callback URL must be a valid HTTP(S) URL",
              { itemIndex: i },
            );
          const rawPayload = this.getNodeParameter("bulkPayload", i) as unknown;
          let payload: Record<string, unknown>;
          try {
            const parsed: unknown =
              typeof rawPayload === "string"
                ? JSON.parse(rawPayload)
                : rawPayload;
            if (!isRecord(parsed)) {
              throw new NodeOperationError(
                this.getNode(),
                "Payload (JSON) must be a valid non-array JSON object",
                { itemIndex: i },
              );
            }
            payload = parsed;
          } catch (error) {
            if (error instanceof NodeOperationError) throw error;
            throw new NodeOperationError(
              this.getNode(),
              "Payload (JSON) must be a valid non-array JSON object",
              { itemIndex: i },
            );
          }
          const extra = this.getNodeParameter(
            "bulkAdditionalOptions",
            i,
          ) as Options;
          const body: Record<string, unknown> = {
            platform: "AMZ",
            operation: bulkOperation,
            domain,
            callback_url: callbackUrl,
            payload,
          };
          if (extra.address_id) body.address_id = extra.address_id;
          const version = operationVersion(
            extra.operationVersion,
            "Bulk Operation Version",
            this,
            i,
          );
          if (version !== undefined) body.operation_version = version;
          const credentials = await this.getCredentials("easyparserApi");
          const response = await this.helpers.httpRequest({
            method: "POST",
            url: "https://bulk.easyparser.com/v1/bulk",
            headers: {
              "api-key": credentials.apiKey as string,
              "Content-Type": "application/json",
            },
            body: [body],
            json: true,
            timeout: REQUEST_TIMEOUT,
          });
          returnData.push({
            json: checked(response, operation, i, strict),
            pairedItem: { item: i },
          });
          continue;
        }

        if (operation === "BULK_GET_RESULT") {
          const queryId = String(this.getNodeParameter("queryId", i)).trim();
          if (!queryId)
            throw new NodeOperationError(
              this.getNode(),
              "Query ID is required",
              { itemIndex: i },
            );
          const credentials = await this.getCredentials("easyparserApi");
          const response = await this.helpers.httpRequest({
            method: "GET",
            url: `https://data.easyparser.com/v1/queries/${encodeURIComponent(queryId)}/results`,
            headers: { "api-key": credentials.apiKey as string },
            qs: { format: "json" },
            json: true,
            timeout: REQUEST_TIMEOUT,
          });
          returnData.push({
            json: checked(response, operation, i, strict),
            pairedItem: { item: i },
          });
          continue;
        }

        const domain = normalizeMarketplace(
          String(this.getNodeParameter("domain", i)),
        );
        if (!domain)
          throw new NodeOperationError(
            this.getNode(),
            "Amazon Domain must be a supported Amazon marketplace domain",
            { itemIndex: i },
          );
        const additional = this.getNodeParameter(
          "additionalOptions",
          i,
        ) as Options;
        const qs: Query = { platform: "AMZ", domain, operation };

        if ((PRODUCT_OPERATIONS as string[]).includes(operation)) {
          const input = String(this.getNodeParameter("asin", i)).trim();
          if (!input)
            throw new NodeOperationError(
              this.getNode(),
              "ASIN or URL is required",
              { itemIndex: i },
            );
          const directAsin = /^[a-z0-9]{10}$/i.test(input)
            ? input.toUpperCase()
            : undefined;
          const extractedAsin = extractAmazonProductAsin(input);
          if (operation === "OFFER" || operation === "SIMILAR_PRODUCTS") {
            const asin = directAsin ?? extractedAsin;
            if (!asin)
              throw new NodeOperationError(
                this.getNode(),
                `${operation} requires a valid ASIN or Amazon product URL`,
                { itemIndex: i },
              );
            qs.asin = asin;
          } else if (directAsin || extractedAsin) {
            qs.asin = directAsin ?? (extractedAsin as string);
          } else if (/^(?:https?:\/\/|www\.|amazon\.)/i.test(input)) {
            const productUrl = parseAmazonUrl(input);
            if (!productUrl)
              throw new NodeOperationError(
                this.getNode(),
                "ASIN URL must be an Amazon URL",
                { itemIndex: i },
              );
            qs.url = /^https?:\/\//i.test(input)
              ? input
              : productUrl.toString();
          } else {
            qs.asin = input;
          }
          if (operation === "SIMILAR_PRODUCTS") {
            const limit = String(
              this.getNodeParameter("similarLimit", i, "10"),
            );
            if (!["10", "50", "100"].includes(limit))
              throw new NodeOperationError(
                this.getNode(),
                "Similar Product Limit must be 10, 50, or 100",
                { itemIndex: i },
              );
            qs.similar_limit = limit;
          }
        } else if (operation === "SEARCH") {
          const input = String(this.getNodeParameter("keyword", i)).trim();
          if (!input)
            throw new NodeOperationError(
              this.getNode(),
              "Search keyword or URL is required",
              { itemIndex: i },
            );
          if (/^https?:\/\//i.test(input)) qs.url = input;
          else qs.keyword = input;
        } else if (operation === "PRODUCT_LOOKUP") {
          const identifier = String(
            this.getNodeParameter("identifier", i),
          ).trim();
          if (!identifier)
            throw new NodeOperationError(
              this.getNode(),
              "Product identifier is required",
              { itemIndex: i },
            );
          qs.identifier_type = this.getNodeParameter(
            "identifier_type",
            i,
          ) as string;
          qs.identifier = identifier;
        } else if (
          ["SELLER_PROFILE", "SELLER_PRODUCTS", "SELLER_FEEDBACK"].includes(
            operation,
          )
        ) {
          const seller = String(this.getNodeParameter("sellerId", i)).trim();
          if (!seller)
            throw new NodeOperationError(
              this.getNode(),
              "Seller ID or URL is required",
              { itemIndex: i },
            );
          if (/^https?:\/\//i.test(seller)) qs.url = seller;
          else qs.seller_id = seller;
        }

        const version = operationVersion(
          additional.operationVersion,
          "Operation Version",
          this,
          i,
        );
        if (version !== undefined) qs.operation_version = version;
        if (additional.a_plus_content) qs.a_plus_content = true;
        if (additional.addressId)
          qs.address_id = String(additional.addressId).trim();
        if (additional.associateId)
          qs.associate_id = String(additional.associateId).trim();
        if (additional.cookie) qs.cookie = String(additional.cookie);
        if (additional.currency)
          qs.currency = String(additional.currency).trim();
        if (additional.exclude_refinements) qs.exclude_refinements = true;
        if (additional.excludeSponsored) qs.exclude_sponsored = true;
        if (operation === "DETAIL" && additional.detailSellerId)
          qs.seller_id = String(additional.detailSellerId).trim();
        if (
          (operation === "DETAIL" || operation === "SEARCH") &&
          hasOwn(additional, "includeHtml")
        )
          qs.include_html = booleanValue(
            additional.includeHtml,
            "Include HTML",
            this,
            i,
          );

        if (
          (operation === "SALES_ANALYSIS_HISTORY" ||
            operation === "SELLER_FEEDBACK") &&
          hasOwn(additional, "historyRange")
        ) {
          const range = String(additional.historyRange).trim();
          if (range) {
            const allowed =
              operation === "SALES_ANALYSIS_HISTORY"
                ? ["0", "3", "6", "9", "12"]
                : ["1", "3", "12", "all"];
            if (!allowed.includes(range))
              throw new NodeOperationError(
                this.getNode(),
                `History Range is not valid for ${operation}`,
                { itemIndex: i },
              );
            qs.history_range = range;
          }
        }

        if (operation === "SEARCH" || operation === "SELLER_FEEDBACK") {
          const hasMin = hasOwn(additional, "minPage");
          const hasMax = hasOwn(additional, "maxPage");
          const minPage = hasMin
            ? positiveInteger(additional.minPage, "Min Page", this, i)
            : 1;
          const maxPage = hasMax
            ? positiveInteger(additional.maxPage, "Max Page", this, i)
            : minPage;
          if (maxPage < minPage || maxPage - minPage + 1 > 5)
            throw new NodeOperationError(
              this.getNode(),
              "Pagination must contain at most five pages and Max Page must not be less than Min Page",
              { itemIndex: i },
            );
          if (minPage > 1) qs.min_page = minPage;
          if (maxPage > 1 && (hasMax || hasMin)) qs.max_page = maxPage;
        }
        if (operation === "OFFER" || operation === "SELLER_PRODUCTS") {
          for (const [name, queryName] of [
            ["minPage", "min_page"],
            ["maxPage", "max_page"],
          ]) {
            if (hasOwn(additional, name)) {
              const page = positiveInteger(additional[name], name, this, i);
              if (page > 1) qs[queryName] = page;
            }
          }
        }
        if (operation === "SELLER_FEEDBACK") {
          const minRating = hasOwn(additional, "minRating")
            ? positiveInteger(additional.minRating, "Min Rating", this, i)
            : 1;
          const maxRating = hasOwn(additional, "maxRating")
            ? positiveInteger(additional.maxRating, "Max Rating", this, i)
            : 5;
          if (minRating > 5 || maxRating > 5 || minRating > maxRating)
            throw new NodeOperationError(
              this.getNode(),
              "Rating values must be integers from 1 to 5 and Min Rating must not exceed Max Rating",
              { itemIndex: i },
            );
          if (minRating > 1) qs.min_rating = minRating;
          if (maxRating < 5) qs.max_rating = maxRating;
        }
        if (operation === "OFFER") {
          const hasBooleanFilter = OFFER_BOOLEAN_FILTERS.some(([name]) =>
            hasOwn(additional, name),
          );
          const legacy =
            typeof additional.offerFilters === "string"
              ? additional.offerFilters
              : "";
          if (legacy.trim() && hasBooleanFilter)
            throw new NodeOperationError(
              this.getNode(),
              "Offer Filters (Legacy) cannot be combined with boolean offer filters",
              { itemIndex: i },
            );
          if (legacy.trim()) qs.filter = legacy;
          for (const [name, queryName] of OFFER_BOOLEAN_FILTERS)
            if (hasOwn(additional, name))
              qs[queryName] = booleanValue(additional[name], name, this, i);
        }
        if (
          (operation === "SEARCH" || operation === "SELLER_PRODUCTS") &&
          additional.pageNumber
        ) {
          const page = positiveInteger(
            additional.pageNumber,
            "Page Number",
            this,
            i,
          );
          if (page > 1) qs.page = page;
        }
        if (additional.minQuantity) {
          const quantity = positiveInteger(
            additional.minQuantity,
            "Min Quantity",
            this,
            i,
          );
          if (quantity > 1) qs.min_quantity = quantity;
        }
        if (additional.parameters)
          qs.parameters = String(additional.parameters);
        if (additional.refinements)
          qs.refinements = String(additional.refinements);
        if (additional.sortBy && additional.sortBy !== "featured")
          qs.sort_by = String(additional.sortBy);
        if (
          additional.sortBySeller &&
          additional.sortBySeller !== "featured-rank"
        )
          qs.sort_by = String(additional.sortBySeller);

        const response = await this.helpers.httpRequestWithAuthentication.call(
          this,
          "easyparserApi",
          {
            method: "GET",
            url: "https://realtime.easyparser.com/v1/request",
            qs,
            json: true,
            timeout: REQUEST_TIMEOUT,
          },
        );
        returnData.push({
          json: checked(response, operation, i, strict),
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        if (error instanceof NodeOperationError) throw error;
        throw new NodeApiError(this.getNode(), error as JsonObject);
      }
    }
    return [returnData];
  }
}
