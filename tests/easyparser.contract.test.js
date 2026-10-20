"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { Easyparser } = require(
  path.join(
    __dirname,
    "..",
    "dist",
    "nodes",
    "Easyparser",
    "Easyparser.node.js",
  ),
);
const { EasyparserApi } = require(
  path.join(
    __dirname,
    "..",
    "dist",
    "credentials",
    "EasyparserApi.credentials.js",
  ),
);
const {
  accountResponse,
  bestSellersRankV1,
  bestSellersRankV2,
  bulkPartialResponse,
  bulkPendingResponse,
  logicalErrors,
  rawProductResponse,
} = require("./fixtures/easyparser-responses");

const ASIN = "B0F25371FH";
const supportedDomains = [
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
];

function property(node, name) {
  const result = node.description.properties.find(
    (entry) => entry.name === name,
  );
  assert.ok(
    result,
    `Expected node.description to contain the ${name} property`,
  );
  return result;
}

function option(node, collectionName, optionName) {
  const collection = property(node, collectionName);
  const result = collection.options.find((entry) => entry.name === optionName);
  assert.ok(
    result,
    `Expected ${collectionName} to contain the ${optionName} option`,
  );
  return result;
}

function resolveParameter(parameters, parameterPath, defaultValue) {
  if (Object.hasOwn(parameters, parameterPath)) {
    return parameters[parameterPath];
  }

  const value = parameterPath.split(".").reduce((current, key) => {
    if (current && Object.hasOwn(current, key)) return current[key];
    return undefined;
  }, parameters);

  return value === undefined ? defaultValue : value;
}

function createExecution(parametersByItem, configuration = {}) {
  const calls = [];
  const inputItems =
    configuration.inputItems || parametersByItem.map(() => ({ json: {} }));
  let authenticatedCallIndex = 0;
  let plainCallIndex = 0;

  async function responseFor(kind, request, credentialName) {
    const call = { kind, request, credentialName };
    calls.push(call);
    const index =
      kind === "authenticated" ? authenticatedCallIndex++ : plainCallIndex++;
    const configured =
      kind === "authenticated"
        ? configuration.authResponse
        : configuration.plainResponse;
    const response = Array.isArray(configured) ? configured[index] : configured;

    if (response instanceof Error) throw response;
    if (typeof response === "function") return response({ call, index });
    if (response !== undefined) return response;
    return { request_info: { success: true } };
  }

  const context = {
    getInputData: () => inputItems,
    getNodeParameter: (parameterPath, itemIndex, defaultValue) =>
      resolveParameter(
        parametersByItem[itemIndex] || {},
        parameterPath,
        defaultValue,
      ),
    getCredentials: async () => ({ apiKey: "test-api-key" }),
    getNode: () => ({
      id: "easyparser-contract-test",
      name: "Easyparser",
      type: "n8n-nodes-easyparser.easyparser",
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    }),
    getNodeVersion: () => 1,
    continueOnFail: () => configuration.continueOnFail === true,
    helpers: {
      httpRequestWithAuthentication: async (credentialName, request) =>
        responseFor("authenticated", request, credentialName),
      httpRequest: async (request) => responseFor("plain", request),
    },
  };

  return {
    calls,
    execute: async () => new Easyparser().execute.call(context),
  };
}

function realtime(operation, overrides = {}) {
  const parameters = {
    operation,
    domain: ".com",
    additionalOptions: {},
    ...overrides,
  };

  if (
    [
      "DETAIL",
      "OFFER",
      "SALES_ANALYSIS_HISTORY",
      "BEST_SELLERS_RANK",
      "PACKAGE_DIMENSION",
      "SIMILAR_PRODUCTS",
    ].includes(operation) &&
    !Object.hasOwn(parameters, "asin")
  ) {
    parameters.asin = ASIN;
  }
  if (operation === "SEARCH" && !Object.hasOwn(parameters, "keyword"))
    parameters.keyword = "wireless headphones";
  if (
    ["SELLER_PROFILE", "SELLER_PRODUCTS", "SELLER_FEEDBACK"].includes(
      operation,
    ) &&
    !Object.hasOwn(parameters, "sellerId")
  ) {
    parameters.sellerId = "A2R2RITDJNW1Q6";
  }
  if (operation === "PRODUCT_LOOKUP") {
    parameters.identifier_type ||= "EAN";
    parameters.identifier ||= "0194252032618";
  }

  return parameters;
}

function bulk(overrides = {}) {
  return {
    operation: "BULK_SUBMIT",
    bulkOperation: "DETAIL",
    bulkDomain: ".com",
    callbackUrl: "https://workflow.example.test/easyparser-callback",
    bulkPayload: JSON.stringify({ asins: [ASIN] }),
    bulkAdditionalOptions: {},
    ...overrides,
  };
}

function resultItems(result) {
  assert.equal(result.length, 1, "Node execution should return one output");
  return result[0];
}

function requestFrom(run) {
  assert.equal(run.calls.length, 1, "Expected exactly one HTTP call");
  return run.calls[0].request;
}

async function assertRejected(execution, expression) {
  await assert.rejects(execution.execute(), expression);
  assert.equal(
    execution.calls.length,
    0,
    "Invalid input must not make an HTTP request",
  );
}

test("description exposes the eleven real-time operations and documented bulk choice", () => {
  const node = new Easyparser();
  const operations = property(node, "operation").options.map(
    (entry) => entry.value,
  );
  const realTimeOperations = operations.filter(
    (value) =>
      !["ACCOUNT_INFO", "BULK_SUBMIT", "BULK_GET_RESULT"].includes(value),
  );

  assert.deepEqual(realTimeOperations.sort(), [
    "BEST_SELLERS_RANK",
    "DETAIL",
    "OFFER",
    "PACKAGE_DIMENSION",
    "PRODUCT_LOOKUP",
    "SALES_ANALYSIS_HISTORY",
    "SEARCH",
    "SELLER_FEEDBACK",
    "SELLER_PRODUCTS",
    "SELLER_PROFILE",
    "SIMILAR_PRODUCTS",
  ]);
  assert.ok(
    property(node, "bulkOperation").options.some(
      (entry) => entry.value === "SELLER_FEEDBACK",
    ),
  );
});

test("description exposes the agreed request controls with their defaults and operation visibility", () => {
  const node = new Easyparser();
  const similarLimit = property(node, "similarLimit");
  assert.equal(similarLimit.default, "10");
  assert.deepEqual(
    similarLimit.options.map((entry) => entry.value),
    ["10", "50", "100"],
  );
  assert.deepEqual(similarLimit.displayOptions.show.operation, [
    "SIMILAR_PRODUCTS",
  ]);

  const failOnApiError = property(node, "failOnApiError");
  assert.equal(failOnApiError.type, "boolean");
  assert.equal(failOnApiError.default, true);

  const additional = property(node, "additionalOptions");
  const operationVersion = option(
    node,
    "additionalOptions",
    "operationVersion",
  );
  assert.equal(operationVersion.type, "number");
  assert.equal(operationVersion.default, 0);

  const includeHtml = option(node, "additionalOptions", "includeHtml");
  assert.equal(includeHtml.type, "boolean");
  assert.deepEqual(includeHtml.displayOptions.show["/operation"].sort(), [
    "DETAIL",
    "SEARCH",
  ]);

  const detailSellerId = option(node, "additionalOptions", "detailSellerId");
  assert.equal(detailSellerId.type, "string");
  assert.deepEqual(detailSellerId.displayOptions.show["/operation"], [
    "DETAIL",
  ]);

  const historyFields = additional.options.filter(
    (entry) => entry.name === "historyRange",
  );
  assert.ok(historyFields.length > 0, "History Range must be exposed");
  const historyValues = new Set(
    historyFields.flatMap((entry) =>
      (entry.options || []).map((value) => value.value),
    ),
  );
  for (const value of ["0", "3", "6", "9", "12", "1", "all"])
    assert.ok(historyValues.has(value));
  assert.ok(
    historyFields.some((entry) =>
      entry.displayOptions?.show?.["/operation"]?.includes(
        "SALES_ANALYSIS_HISTORY",
      ),
    ),
  );
  assert.ok(
    historyFields.some((entry) =>
      entry.displayOptions?.show?.["/operation"]?.includes("SELLER_FEEDBACK"),
    ),
  );

  for (const name of [
    "prime",
    "freeShipping",
    "conditionNew",
    "conditionUsedLikeNew",
    "conditionUsedVeryGood",
    "conditionUsedGood",
    "conditionUsedAcceptable",
  ]) {
    const boolean = option(node, "additionalOptions", name);
    assert.equal(boolean.type, "boolean");
    assert.deepEqual(boolean.displayOptions.show["/operation"], ["OFFER"]);
  }
  assert.equal(
    option(node, "additionalOptions", "offerFilters").type,
    "string",
  );
  assert.equal(
    option(node, "bulkAdditionalOptions", "operationVersion").type,
    "number",
  );
});

test("credentials authenticate through the API-key query property without exposing a secret", () => {
  const credentials = new EasyparserApi();
  assert.deepEqual(credentials.authenticate, {
    type: "generic",
    properties: { qs: { api_key: "={{$credentials.apiKey}}" } },
  });
});

test("realtime marketplace normalization preserves documented suffixes and Amazon host forms", async () => {
  for (const [domain, expected] of [
    [" .IE ", ".ie"],
    ["Amazon.COM.BE", ".com.be"],
    ["https://www.amazon.ie/dp/B0F25371FH", ".ie"],
  ]) {
    const run = createExecution([realtime("DETAIL", { domain })]);
    await run.execute();
    assert.equal(requestFrom(run).qs.domain, expected);
  }
});

test("bulk requests preserve the two newly supported marketplaces", async () => {
  for (const domain of [".ie", ".com.be"]) {
    const run = createExecution([bulk({ bulkDomain: domain })]);
    await run.execute();
    assert.equal(requestFrom(run).body[0].domain, domain);
  }
});

test("bulk marketplace description contains exactly the 21 documented marketplaces and excludes .eg", () => {
  const node = new Easyparser();
  const values = property(node, "bulkDomain")
    .options.map((entry) => entry.value)
    .sort();
  assert.deepEqual(values, [...supportedDomains].sort());
  assert.ok(!values.includes(".eg"));
});

test("invalid, malformed-host, and empty marketplaces fail instead of falling back to .com", async () => {
  for (const domain of [
    ".eg",
    "amazon.evil.test",
    "",
    "https://example.test/amazon.ie",
  ]) {
    await assertRejected(
      createExecution([realtime("DETAIL", { domain })]),
      /domain|marketplace/i,
    );
  }
});

test("similar products accepts lower-case ASINs and all supported Amazon product URL forms", async () => {
  const cases = [
    ["b0f25371fh", ASIN],
    ["https://www.amazon.com/dp/b0f25371fh?ref=test", ASIN],
    ["https://www.amazon.com/gp/product/b0f25371fh", ASIN],
    ["https://www.amazon.com/gp/aw/d/b0f25371fh", ASIN],
    ["https://www.amazon.com/product/b0f25371fh", ASIN],
  ];

  for (const [asin, expected] of cases) {
    const run = createExecution([realtime("SIMILAR_PRODUCTS", { asin })]);
    await run.execute();
    const qs = requestFrom(run).qs;
    assert.equal(qs.asin, expected);
    assert.ok(!Object.hasOwn(qs, "url"));
  }
});

test("similar limit defaults to 10, permits the three documented values, and rejects other values", async () => {
  const defaultRun = createExecution([realtime("SIMILAR_PRODUCTS")]);
  await defaultRun.execute();
  assert.equal(requestFrom(defaultRun).qs.similar_limit, "10");

  for (const similarLimit of ["10", "50", "100"]) {
    const run = createExecution([
      realtime("SIMILAR_PRODUCTS", { similarLimit }),
    ]);
    await run.execute();
    assert.equal(requestFrom(run).qs.similar_limit, similarLimit);
  }

  await assertRejected(
    createExecution([realtime("SIMILAR_PRODUCTS", { similarLimit: "25" })]),
    /similar.*limit/i,
  );
});

test("Offer and Similar reject malformed ASINs and non-Amazon product URLs", async () => {
  for (const [operation, asin] of [
    ["OFFER", "not-an-asin"],
    ["OFFER", "https://example.test/dp/B0F25371FH"],
    ["SIMILAR_PRODUCTS", "bad"],
    ["SIMILAR_PRODUCTS", "https://example.test/dp/B0F25371FH"],
  ]) {
    await assertRejected(
      createExecution([realtime(operation, { asin })]),
      /ASIN|Amazon|product/i,
    );
  }
});

test("existing operation routes still map ASIN, URL, keyword, seller, and identifiers correctly", async () => {
  const scenarios = [
    [realtime("DETAIL", { asin: ASIN }), { asin: ASIN }],
    [
      realtime("DETAIL", { asin: "https://www.amazon.com/dp/B0F25371FH" }),
      { asin: ASIN },
    ],
    [
      realtime("SEARCH", { keyword: "wireless headphones" }),
      { keyword: "wireless headphones" },
    ],
    [
      realtime("SEARCH", { keyword: "https://www.amazon.com/s?k=headphones" }),
      {
        url: "https://www.amazon.com/s?k=headphones",
      },
    ],
    [
      realtime("SELLER_PROFILE", { sellerId: "A2R2RITDJNW1Q6" }),
      { seller_id: "A2R2RITDJNW1Q6" },
    ],
    [
      realtime("SELLER_PRODUCTS", {
        sellerId: "https://www.amazon.com/sp?seller=A2R2RITDJNW1Q6",
      }),
      {
        url: "https://www.amazon.com/sp?seller=A2R2RITDJNW1Q6",
      },
    ],
    [
      realtime("PRODUCT_LOOKUP", {
        identifier_type: "UPC",
        identifier: "012345678905",
      }),
      {
        identifier_type: "UPC",
        identifier: "012345678905",
      },
    ],
  ];

  for (const [parameters, expected] of scenarios) {
    const run = createExecution([parameters]);
    await run.execute();
    assert.deepEqual(
      Object.fromEntries(
        Object.keys(expected).map((key) => [key, requestFrom(run).qs[key]]),
      ),
      expected,
    );
  }
});

test("DETAIL and SEARCH map include_html explicitly and DETAIL maps seller_id", async () => {
  for (const includeHtml of [true, false]) {
    const run = createExecution([
      realtime("DETAIL", {
        additionalOptions: { includeHtml, detailSellerId: "DETAIL-SELLER" },
      }),
    ]);
    await run.execute();
    assert.equal(requestFrom(run).qs.include_html, includeHtml);
    assert.equal(requestFrom(run).qs.seller_id, "DETAIL-SELLER");
  }

  const search = createExecution([
    realtime("SEARCH", { additionalOptions: { includeHtml: true } }),
  ]);
  await search.execute();
  assert.equal(requestFrom(search).qs.include_html, true);
});

test("realtime operation version omits auto/default zero, maps positive integers, and rejects invalid values", async () => {
  for (const additionalOptions of [{}, { operationVersion: 0 }]) {
    const run = createExecution([
      realtime("BEST_SELLERS_RANK", { additionalOptions }),
    ]);
    await run.execute();
    assert.ok(!Object.hasOwn(requestFrom(run).qs, "operation_version"));
  }

  const versioned = createExecution([
    realtime("BEST_SELLERS_RANK", {
      additionalOptions: { operationVersion: 2 },
    }),
  ]);
  await versioned.execute();
  assert.equal(requestFrom(versioned).qs.operation_version, 2);

  for (const operationVersion of [-1, 1.5, "2"]) {
    await assertRejected(
      createExecution([
        realtime("BEST_SELLERS_RANK", {
          additionalOptions: { operationVersion },
        }),
      ]),
      /operation.*version/i,
    );
  }
});

test("Best Sellers Rank forwards both versioned response shapes unchanged and preserves the version echo", async () => {
  for (const [version, response] of [
    [1, bestSellersRankV1],
    [2, bestSellersRankV2],
  ]) {
    const run = createExecution(
      [
        realtime("BEST_SELLERS_RANK", {
          additionalOptions: { operationVersion: version },
        }),
      ],
      { authResponse: response },
    );
    const output = resultItems(await run.execute());
    assert.equal(requestFrom(run).qs.operation_version, version);
    assert.deepEqual(output[0].json, response);
    assert.equal(output[0].json.request_parameters.operation_version, version);
  }
});

test("Offer maps every explicit boolean in snake_case, including false", async () => {
  const additionalOptions = {
    prime: false,
    freeShipping: true,
    conditionNew: false,
    conditionUsedLikeNew: true,
    conditionUsedVeryGood: false,
    conditionUsedGood: true,
    conditionUsedAcceptable: false,
  };
  const run = createExecution([realtime("OFFER", { additionalOptions })]);
  await run.execute();
  assert.deepEqual(
    Object.fromEntries(
      [
        "prime",
        "free_shipping",
        "condition_new",
        "condition_used_like_new",
        "condition_used_very_good",
        "condition_used_good",
        "condition_used_acceptable",
      ].map((key) => [key, requestFrom(run).qs[key]]),
    ),
    {
      prime: false,
      free_shipping: true,
      condition_new: false,
      condition_used_like_new: true,
      condition_used_very_good: false,
      condition_used_good: true,
      condition_used_acceptable: false,
    },
  );
});

test("Offer refuses ambiguous mixing of legacy filter CSV and explicit booleans", async () => {
  await assertRejected(
    createExecution([
      realtime("OFFER", {
        additionalOptions: { offerFilters: "prime,free_shipping", prime: true },
      }),
    ]),
    /legacy|filter|boolean|mix/i,
  );
});

test("pagination validates the inclusive five-page window without an absolute max-page cap", async () => {
  const valid = createExecution([
    realtime("SEARCH", { additionalOptions: { minPage: 6, maxPage: 10 } }),
  ]);
  await valid.execute();
  assert.equal(requestFrom(valid).qs.min_page, 6);
  assert.equal(requestFrom(valid).qs.max_page, 10);

  const defaults = createExecution([
    realtime("SEARCH", { additionalOptions: { minPage: 1, maxPage: 1 } }),
  ]);
  await defaults.execute();
  assert.ok(!Object.hasOwn(requestFrom(defaults).qs, "min_page"));
  assert.ok(!Object.hasOwn(requestFrom(defaults).qs, "max_page"));

  for (const additionalOptions of [
    { minPage: 1, maxPage: 6 },
    { minPage: 6, maxPage: 5 },
    { minPage: 1.5, maxPage: 2 },
    { minPage: 1, maxPage: 2.5 },
  ]) {
    await assertRejected(
      createExecution([realtime("SEARCH", { additionalOptions })]),
      /page|range/i,
    );
  }
});

test("Seller Feedback validates rating ranges and maps valid values", async () => {
  const valid = createExecution([
    realtime("SELLER_FEEDBACK", {
      additionalOptions: { minRating: 2, maxRating: 4 },
    }),
  ]);
  await valid.execute();
  assert.equal(requestFrom(valid).qs.min_rating, 2);
  assert.equal(requestFrom(valid).qs.max_rating, 4);

  for (const additionalOptions of [
    { minRating: 0, maxRating: 4 },
    { minRating: 2, maxRating: 6 },
    { minRating: 4, maxRating: 3 },
    { minRating: 2.5, maxRating: 4 },
  ]) {
    await assertRejected(
      createExecution([realtime("SELLER_FEEDBACK", { additionalOptions })]),
      /rating|range/i,
    );
  }
});

test("history ranges preserve sales zero and feedback all while rejecting operation-invalid values", async () => {
  const sales = createExecution([
    realtime("SALES_ANALYSIS_HISTORY", {
      additionalOptions: { historyRange: "0" },
    }),
  ]);
  await sales.execute();
  assert.equal(requestFrom(sales).qs.history_range, "0");

  const feedback = createExecution([
    realtime("SELLER_FEEDBACK", { additionalOptions: { historyRange: "all" } }),
  ]);
  await feedback.execute();
  assert.equal(requestFrom(feedback).qs.history_range, "all");

  await assertRejected(
    createExecution([
      realtime("SALES_ANALYSIS_HISTORY", {
        additionalOptions: { historyRange: "all" },
      }),
    ]),
    /history.*range/i,
  );
  await assertRejected(
    createExecution([
      realtime("SELLER_FEEDBACK", { additionalOptions: { historyRange: "0" } }),
    ]),
    /history.*range/i,
  );
});

test("bulk submit validates payload object and callback URL, then keeps root operation version outside payload", async () => {
  for (const bulkPayload of ["not JSON", "[]", "null", '"scalar"', 3]) {
    await assertRejected(
      createExecution([bulk({ bulkPayload })]),
      /payload|JSON/i,
    );
  }
  await assertRejected(
    createExecution([bulk({ callbackUrl: "" })]),
    /callback/i,
  );

  const payload = { asins: [ASIN], operation_version: 99 };
  const run = createExecution([
    bulk({
      bulkDomain: ".ie",
      bulkPayload: payload,
      bulkAdditionalOptions: { operationVersion: 2 },
    }),
  ]);
  await run.execute();
  const body = requestFrom(run).body[0];
  assert.equal(
    body.callback_url,
    "https://workflow.example.test/easyparser-callback",
  );
  assert.equal(body.domain, ".ie");
  assert.equal(body.operation_version, 2);
  assert.deepEqual(body.payload, payload);
  assert.deepEqual(payload, { asins: [ASIN], operation_version: 99 });
});

test("multiple successful input items retain their individual paired-item indexes", async () => {
  const firstResponse = {
    request_info: { success: true },
    result: { product: { title: "first" } },
  };
  const secondResponse = {
    request_info: { success: true },
    result: { product: { title: "second" } },
  };
  const run = createExecution(
    [realtime("DETAIL"), realtime("DETAIL", { asin: "B000000001" })],
    { authResponse: [firstResponse, secondResponse] },
  );

  const output = resultItems(await run.execute());
  assert.deepEqual(output, [
    { json: firstResponse, pairedItem: { item: 0 } },
    { json: secondResponse, pairedItem: { item: 1 } },
  ]);
  assert.equal(run.calls.length, 2);
});

test("bulk operation version validates positive integers and zero means auto/omitted", async () => {
  for (const bulkAdditionalOptions of [{}, { operationVersion: 0 }]) {
    const run = createExecution([bulk({ bulkAdditionalOptions })]);
    await run.execute();
    assert.ok(!Object.hasOwn(requestFrom(run).body[0], "operation_version"));
  }
  for (const operationVersion of [-2, 1.1, "3"]) {
    await assertRejected(
      createExecution([bulk({ bulkAdditionalOptions: { operationVersion } })]),
      /operation.*version/i,
    );
  }
});

test("Bulk Get Result encodes query IDs as a URL path segment", async () => {
  const queryId = "query id/?&";
  const run = createExecution([{ operation: "BULK_GET_RESULT", queryId }]);
  await run.execute();
  const request = requestFrom(run);
  assert.equal(
    request.url,
    "https://data.easyparser.com/v1/queries/query%20id%2F%3F%26/results",
  );
  assert.deepEqual(request.qs, { format: "json" });
});

test("strict mode treats documented logical error envelopes as failures", async () => {
  for (const response of Object.values(logicalErrors)) {
    const run = createExecution([realtime("DETAIL")], {
      authResponse: response,
    });
    await assert.rejects(run.execute(), /API|success|failure|error|request/i);
    assert.equal(run.calls.length, 1);
  }
});

test("failOnApiError false forwards logical error envelopes as raw JSON", async () => {
  const run = createExecution([realtime("DETAIL", { failOnApiError: false })], {
    authResponse: logicalErrors.requestInfo,
  });
  const output = resultItems(await run.execute());
  assert.deepEqual(output[0].json, logicalErrors.requestInfo);
  assert.deepEqual(output[0].pairedItem, { item: 0 });
});

test("pending, partial bulk outcomes, and account responses remain raw successful outputs", async () => {
  const pending = createExecution(
    [{ operation: "BULK_GET_RESULT", queryId: "pending-query" }],
    {
      plainResponse: bulkPendingResponse,
    },
  );
  assert.deepEqual(
    resultItems(await pending.execute())[0].json,
    bulkPendingResponse,
  );

  const partial = createExecution([bulk()], {
    plainResponse: bulkPartialResponse,
  });
  assert.deepEqual(
    resultItems(await partial.execute())[0].json,
    bulkPartialResponse,
  );

  const account = createExecution([{ operation: "ACCOUNT_INFO" }], {
    authResponse: accountResponse,
  });
  assert.deepEqual(
    resultItems(await account.execute())[0].json,
    accountResponse,
  );
});

test("continue-on-fail emits a paired error item and still processes later input items", async () => {
  const secondResponse = {
    request_info: { success: true },
    result: { product: { title: "second" } },
  };
  const run = createExecution(
    [realtime("DETAIL"), realtime("DETAIL", { asin: "B000000001" })],
    {
      authResponse: [logicalErrors.topLevel, secondResponse],
      continueOnFail: true,
    },
  );
  const output = resultItems(await run.execute());
  assert.equal(output.length, 2);
  assert.match(output[0].json.error, /API rejected/i);
  assert.deepEqual(output[0].pairedItem, { item: 0 });
  assert.deepEqual(output[1].json, secondResponse);
  assert.deepEqual(output[1].pairedItem, { item: 1 });
  assert.equal(run.calls.length, 2);
});

test("raw realtime responses preserve newly added fields, missing optional paths, nulls, and string prices", async () => {
  const run = createExecution([realtime("DETAIL")], {
    authResponse: rawProductResponse,
  });
  const output = resultItems(await run.execute());
  assert.deepEqual(output[0].json, rawProductResponse);
  assert.equal(typeof output[0].json.result.product.price, "string");
  assert.equal(output[0].json.result.product.nullable_address, null);
  assert.ok(
    !Object.hasOwn(output[0].json.result.product, "optional_field_not_present"),
  );
  assert.deepEqual(output[0].json.result.product.newly_added_field, {
    source: "fixture",
    flags: ["one", "two"],
  });
});

test("array top-level API responses are rejected as invalid response envelopes", async () => {
  const run = createExecution([realtime("DETAIL")], { authResponse: () => [] });
  await assert.rejects(run.execute(), /response|object|array/i);
  assert.equal(run.calls.length, 1);
});

test("every API request uses a 60-second timeout", async () => {
  const runs = [
    createExecution([realtime("DETAIL")]),
    createExecution([bulk()]),
    createExecution([
      { operation: "BULK_GET_RESULT", queryId: "timeout-query" },
    ]),
    createExecution([{ operation: "ACCOUNT_INFO" }]),
  ];

  for (const run of runs) {
    await run.execute();
    assert.equal(requestFrom(run).timeout, 60000);
  }
});

test("transport errors are not retried for Bulk Submit", async () => {
  const run = createExecution([bulk()], {
    plainResponse: new Error("network unavailable"),
  });
  await assert.rejects(run.execute(), /network unavailable/i);
  assert.equal(run.calls.length, 1);
});

test("legacy OFFER and SELLER_PRODUCTS pagination is retained without an invented five-page cap", async () => {
  for (const operation of ["OFFER", "SELLER_PRODUCTS"]) {
    const run = createExecution([
      realtime(operation, { additionalOptions: { minPage: 2, maxPage: 9 } }),
    ]);
    await run.execute();
    assert.equal(requestFrom(run).qs.min_page, 2);
    assert.equal(requestFrom(run).qs.max_page, 9);
  }
});

test("legacy DETAIL Amazon URLs without a scheme are normalized before transmission", async () => {
  const run = createExecution([
    realtime("DETAIL", { asin: "www.amazon.com/a-valid-non-ASIN-page" }),
  ]);
  await run.execute();
  assert.equal(
    requestFrom(run).qs.url,
    "https://www.amazon.com/a-valid-non-ASIN-page",
  );
});

test("callback URLs require an explicit HTTP or HTTPS scheme", async () => {
  for (const callbackUrl of [
    "workflow.example.test/callback",
    "not-a-url",
    "ftp://workflow.example.test/callback",
  ]) {
    await assertRejected(
      createExecution([bulk({ callbackUrl })]),
      /callback|HTTP/i,
    );
  }
});

test("documented array error_details messages are retained in real-time and nested Bulk failures", async () => {
  const response = {
    request_info: {
      success: false,
      error_details: [
        "First fixture error",
        { message: "Second fixture error" },
      ],
    },
  };
  const realtimeFailure = createExecution([realtime("DETAIL")], {
    authResponse: response,
  });
  await assert.rejects(
    realtimeFailure.execute(),
    /First fixture error; Second fixture error/i,
  );
  const nested = createExecution(
    [{ operation: "BULK_GET_RESULT", queryId: "failed-fixture-query" }],
    {
      plainResponse: {
        success: true,
        data: { status: "failure", json_result: response },
      },
    },
  );
  await assert.rejects(
    nested.execute(),
    /First fixture error; Second fixture error/i,
  );
});
