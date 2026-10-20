"use strict";

const bestSellersRankV1 = {
  request_info: { success: true },
  request_parameters: { operation: "BEST_SELLERS_RANK", operation_version: 1 },
  result: {
    product: {
      bestseller: {
        rank: 7,
        context_name: "Electronics",
        sub_category_id: "123",
      },
      media: {
        image_url: "https://images.example.test/live1.jpg",
        thumb_url: "thumb",
      },
      price: "19.99",
      reviews: { rating: 4.5 },
    },
  },
};

const bestSellersRankV2 = {
  request_info: { success: true },
  request_parameters: { operation: "BEST_SELLERS_RANK", operation_version: 2 },
  result: {
    product: {
      bestseller: {
        category_rank: 7,
        category_title: "Electronics",
        sub_category_rank: 3,
        sub_category_title: "Audio",
        sub_category_link: "https://amazon.example.test/subcategory",
      },
      image: {
        id: "image-1",
        link: "https://images.example.test/beta2.jpg",
        variant: "MAIN",
      },
      manufacturer: "Example Manufacturer",
      title: "Short beta title",
    },
  },
};

const rawProductResponse = {
  request_info: { success: true },
  request_parameters: { operation: "DETAIL" },
  result: {
    product: {
      price: "12.99",
      nullable_address: null,
      newly_added_field: { source: "fixture", flags: ["one", "two"] },
    },
    optional_sections: null,
  },
};

const accountResponse = {
  request_info: { success: true },
  account_info: { plan: "test", credits: "17", usage: null },
};

const bulkPendingResponse = {
  success: true,
  data: { id: "pending-id", status: "pending" },
};

const bulkPartialResponse = {
  success: true,
  meta_data: {
    total_count: 2,
    accepted_count: 1,
    rate_limit_exceeded_count: 1,
  },
  data: {
    accepted: [
      {
        operation: "DETAIL",
        results: [{ asin: "B0F25371FH", id: "accepted-id", credit: 1 }],
      },
    ],
    invalid: [],
    failed: [],
    insufficient_credit: [],
    rate_limit_exceeded: [
      { asin: "B000000001", message: "Fixture rate limit", credit: 1 },
    ],
  },
};

const logicalErrors = {
  topLevel: { error: "API rejected the request" },
  successFalse: { success: false, error: "Operation was not successful" },
  requestInfo: {
    request_info: { success: false, error_details: "Request-info failure" },
  },
  failedBulk: {
    data: {
      status: "failure",
      json_result: {
        request_info: {
          success: false,
          error_details: "Bulk operation failed",
        },
      },
    },
  },
};

module.exports = {
  accountResponse,
  bestSellersRankV1,
  bestSellersRankV2,
  bulkPartialResponse,
  bulkPendingResponse,
  logicalErrors,
  rawProductResponse,
};
