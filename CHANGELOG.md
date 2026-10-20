# Changelog

## 0.3.0 — prepared 2026-10-21

### Added

- Real-time Similar Products operation with limits 10, 50 and 100.
- Operation Version controls for real-time and Bulk request roots.
- DETAIL/SEARCH Include HTML and DETAIL Seller ID options.
- Documented boolean OFFER filters, without removing the legacy CSV field.
- Seller Feedback history-range UI and Bulk Seller Feedback operation.
- Ireland and Belgium in a shared real-time/Bulk marketplace catalogue.
- Global Fail On API Error control; enabled by default with a raw-envelope opt-out.
- Offline regression tests, Node.js 20/22 CI, migration documentation and inactive importable examples.

### Fixed

- Unknown domains now produce an explicit error instead of silently querying `.com`.
- OFFER/Similar URL inputs are resolved to ASINs or rejected clearly.
- SEARCH/Seller Feedback pagination validates inclusive range length, not absolute ending page number.
- Explicit false boolean values and sales-history range `0` are not dropped.
- API-level and failed Bulk-result envelopes use the node error path while pending and partial-success responses remain raw.
- Bulk query ID escaping, payload-object validation, callback URL validation and rating/range validation.
- Working TypeScript lint command and valid package entry point.
- Locked dependency installation and version-tag validation before publication.

### Compatibility notes

The node name, saved parameter identifiers, raw JSON output and paired input items are preserved. Raw response fields are not renamed, coerced or flattened. Invalid inputs and explicit API failure envelopes now fail clearly; read the migration guide before rollout. No automatic retry, Bulk resubmission or polling is added.

BEST_SELLERS_RANK version 2 becomes the API's Live response on November 1, 2026. This package lets workflows test it early, but does not fabricate fields removed by the API or permanently pin the old response. External workflows must update their field mappings. Product Lookup image strings marked for removal also require downstream preparation.

This version entry describes prepared source changes, not proof of npm publication. Live API or production n8n verification is separate from the offline suite.

## 0.2.18

Previous published package, dated 2026-05-23.
