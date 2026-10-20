# Migrating to n8n-nodes-easyparser 0.3.0

The node identity, saved parameter names, raw JSON output and input-item association are retained. This release adds documented API features and makes previously silent failures visible. It does not automatically update workflows outside this repository.

## Review these behavior changes

Unknown marketplace values now raise a validation error instead of silently using the US marketplace. Ireland `.ie` and Belgium `.com.be` are available in real-time and Bulk requests.

**Fail On API Error** defaults to `true`. Explicit API failures now take the node's error path, including HTTP-successful JSON with `request_info.success: false`. If your workflow intentionally consumes raw failure envelopes, set this option to `false` and route failures explicitly before any side-effecting step. HTTP/network errors still use n8n's normal error handling.

SEARCH and SELLER_FEEDBACK pagination is validated by inclusive range length. Check that `max_page >= min_page` and `max_page - min_page + 1 <= 5`; do not interpret the limit as `max_page <= 5`. Sales-history and feedback-range values and seller-feedback ratings are validated before sending the request.

OFFER and SIMILAR_PRODUCTS must resolve to an ASIN. Common Amazon product URL forms are converted locally; unresolvable or non-Amazon URLs fail rather than sending an unsupported OFFER URL request.

The legacy `offerFilters` CSV field is unchanged. New boolean filters use the currently documented query fields. Do not combine CSV and boolean filters: their API precedence has not been established and the node rejects that ambiguous input. No new default `condition_new=true` is imposed.

## Best Sellers Rank: November 1, 2026

The official version policy documents Live `1` and Beta `2`, with Beta becoming Live on November 1, 2026. Use Additional Options → Operation Version `2` to test early. `0` continues to use the current Live version.

After promotion, an old requested number does not keep the old schema indefinitely. Confirm the version applied at `request_parameters.operation_version`.

Update workflow mappings:

- `result.product.bestseller.rank` → `result.product.bestseller.category_rank`.
- `result.product.bestseller.context_name` → `result.product.bestseller.category_title`.
- `result.product.media.image_url` → `result.product.image.link`.
- `bestseller.sub_category_id` is removed; use the documented sub-category rank, title and link fields as needed.
- `result.product.price`, `currency`, `reviews`, `media` and the thumbnail URL are removed. Do not require these fields in the BSR branch. Retrieve pricing or reviews through an appropriate separate operation if your workflow needs them.

A Code node can make rank/image consumption tolerant across the transition without inventing removed fields:

```javascript
return items.map((item, index) => {
  const product = item.json.result?.product ?? {};
  return {
    json: {
      asin: product.asin ?? item.json.request_parameters?.asin ?? null,
      title: product.title ?? null,
      category_rank:
        product.bestseller?.category_rank ?? product.bestseller?.rank ?? null,
      category_title:
        product.bestseller?.category_title ??
        product.bestseller?.context_name ??
        null,
      image: product.image?.link ?? product.media?.image_url ?? null,
      operation_version:
        item.json.request_parameters?.operation_version ?? null,
    },
    pairedItem: { item: index },
  };
});
```

This is an optional downstream adapter. The Easyparser node itself retains the complete upstream response and does not coerce values or inject compatibility aliases.

## Product Lookup images

`result.search_result.products` is an array. The documentation marks product `image_url` and `thumb_string_url` fields for removal. Prefer each product's `main_image?.link` and `thumb_image?.link`; handle absent image objects rather than assuming every result has them. An additive downstream adapter can temporarily fall back to the legacy strings.

## Bulk status and rejected items

Bulk Submit accepted query IDs are at `data.accepted[].results[].id`. A successful submission can contain rejected items alongside accepted ones. Inspect the invalid, failed, insufficient-credit and rate-limit arrays; do not resend an entire partially accepted batch.

Bulk Get Result retrieves a single query. A `pending` response stays raw and is not an error; wait and retrieve that same ID later. A failed parsed result becomes an error when Fail On API Error is enabled. To branch on raw failure states, disable that option for the retrieval node and check `data.status` and `data.json_result.request_info.success` yourself. Callback notifications and Data Service parsed results are not interchangeable.

No automatic polling or retry is introduced. Paid extraction GET requests can consume more credits when repeated, and retrying Bulk Submit can create duplicates. Store completed results promptly; documented retention is at most 24 hours and may be shorter.

## New request fields

Similar Products adds `similarLimit`. Real-time `additionalOptions.operationVersion` and Bulk `bulkAdditionalOptions.operationVersion` select a positive API version; `0` omits it. DETAIL/SEARCH expose `includeHtml`, DETAIL exposes `detailSellerId`, and Seller Feedback now exposes the existing `historyRange` field. Existing parameter names and output item counts stay unchanged.

## Verification

Run `npm run check` to execute the offline regression suite. Mock tests validate request construction, response preservation and error routing; they do not prove live API behavior, installed n8n UI behavior or authentication acceptance. Before production rollout, use your own authorized credentials to validate representative workflows, particularly BSR version 2 and existing legacy OFFER filters.

Official sources: [Operation Versioning](https://docs.easyparser.com/amazon/operation-versioning), [BSR Response](https://docs.easyparser.com/real-time-integration/best-sellers-rank/response), [Product Lookup Response](https://docs.easyparser.com/real-time-integration/product-lookup/response), [Data Service Response](https://docs.easyparser.com/bulk-integration/data-service-response).
