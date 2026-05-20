import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

export class Easyparser implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Easyparser',
		name: 'easyparser',
		icon: 'file:easyparser.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Extract structured Amazon product data using Easyparser API',
		defaults: {
			name: 'Easyparser',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'easyparserApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://realtime.easyparser.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			// ─── Operation ────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account Info',
						value: 'Account_Info',
						description: 'Get account plan and credit usage details',
						action: 'Get account info',
					},
					{
						name: 'Best Sellers Rank',
						value: 'BEST_SELLERS_RANK',
						description: 'Get Best Sellers Rank for a product',
						action: 'Get best sellers rank',
					},
					{
						name: 'Bulk Get Result',
						value: 'Bulk_Get_Result',
						description: 'Retrieve the result of a bulk query by its ID',
						action: 'Get bulk result by ID',
					},
					{
						name: 'Bulk Submit',
						value: 'Bulk_Submit',
						description: 'Submit a batch of requests to the Bulk API for async processing',
						action: 'Submit bulk request',
					},
					{
						name: 'Category',
						value: 'Category',
						description: 'Get category information',
						action: 'Get category',
					},
					{
						name: 'Package Dimension',
						value: 'PACKAGE_DIMENSION',
						description: 'Get physical dimensions and weight of a product',
						action: 'Get package dimension',
					},
					{
						name: 'Product Detail',
						value: 'Detail',
						description: 'Get detailed information about a product',
						action: 'Get product detail',
					},
					{
						name: 'Product Lookup',
						value: 'Product_Lookup',
						description: 'Convert EAN / UPC / GTIN to Amazon ASIN',
						action: 'Look up product by identifier',
					},
					{
						name: 'Product Offers',
						value: 'Offer',
						description: 'Get price offers for a product',
						action: 'Get product offers',
					},
					{
						name: 'Sales Analysis History',
						value: 'Sales_Analysis_History',
						description: 'Get sales history and trend data',
						action: 'Get sales analysis history',
					},
					{
						name: 'Search',
						value: 'Search',
						description: 'Search for products by keyword or URL',
						action: 'Search products',
					},
					{
						name: 'Seller Feedback',
						value: 'Seller_Feedback',
						description: 'Get feedback history for a seller',
						action: 'Get seller feedback',
					},
					{
						name: 'Seller Products',
						value: 'Seller_Products',
						description: 'Get all products listed by a seller',
						action: 'Get seller products',
					},
					{
						name: 'Seller Profile',
						value: 'Seller_Profile',
						description: 'Get seller information and ratings',
						action: 'Get seller profile',
					},
				],
				default: 'Detail',
			},

			// ─── Amazon Domain (Real-Time operations) ────────────────────────────────────────────
			{
				displayName: 'Amazon Domain',
				name: 'domain',
				type: 'options',
				options: [
					{ name: 'amazon.ae (UAE)', value: '.ae' },
					{ name: 'amazon.ca (Canada)', value: '.ca' },
					{ name: 'amazon.co.jp (Japan)', value: '.co.jp' },
					{ name: 'amazon.co.uk (UK)', value: '.co.uk' },
					{ name: 'amazon.com (US)', value: '.com' },
					{ name: 'amazon.com.au (Australia)', value: '.com.au' },
					{ name: 'amazon.com.br (Brazil)', value: '.com.br' },
					{ name: 'amazon.com.mx (Mexico)', value: '.com.mx' },
					{ name: 'amazon.com.tr (Turkey)', value: '.com.tr' },
					{ name: 'amazon.de (Germany)', value: '.de' },
					{ name: 'amazon.es (Spain)', value: '.es' },
					{ name: 'amazon.fr (France)', value: '.fr' },
					{ name: 'amazon.in (India)', value: '.in' },
					{ name: 'amazon.it (Italy)', value: '.it' },
					{ name: 'amazon.nl (Netherlands)', value: '.nl' },
					{ name: 'amazon.pl (Poland)', value: '.pl' },
					{ name: 'amazon.sa (Saudi Arabia)', value: '.sa' },
					{ name: 'amazon.se (Sweden)', value: '.se' },
					{ name: 'amazon.sg (Singapore)', value: '.sg' },
				],
				default: '.com',
				description: 'The Amazon marketplace to query',
				displayOptions: {
					hide: {
						operation: ['Account_Info', 'Bulk_Submit', 'Bulk_Get_Result'],
					},
				},
			},

			// ─── ASIN / URL (Detail, Offer, Sales_Analysis_History, BEST_SELLERS_RANK, PACKAGE_DIMENSION) ──
			{
				displayName: 'ASIN or URL',
				name: 'asin',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'B0F25371FH',
				description: 'Amazon Standard Identification Number (ASIN) or full product URL',
				displayOptions: {
					show: {
						operation: [
							'Detail',
							'Offer',
							'Sales_Analysis_History',
							'BEST_SELLERS_RANK',
							'PACKAGE_DIMENSION',
						],
					},
				},
			},

			// ─── Keyword / URL (Search) ───────────────────────────────
			{
				displayName: 'Search Keyword or URL',
				name: 'keyword',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'wireless headphones',
				description: 'Keyword or Amazon search URL to search for products',
				displayOptions: {
					show: {
						operation: ['Search'],
					},
				},
			},

			// ─── Identifier (Product_Lookup) ─────────────────────────
			{
				displayName: 'Identifier Type',
				name: 'identifier_type',
				type: 'options',
				options: [
					{ name: 'ASIN', value: 'ASIN' },
					{ name: 'EAN', value: 'EAN' },
					{ name: 'GTIN', value: 'GTIN' },
					{ name: 'ISBN', value: 'ISBN' },
					{ name: 'JAN', value: 'JAN' },
					{ name: 'MINSAN', value: 'MINSAN' },
					{ name: 'UPC', value: 'UPC' },
				],
				default: 'EAN',
				required: true,
				displayOptions: {
					show: {
						operation: ['Product_Lookup'],
					},
				},
			},
			{
				displayName: 'Product Identifier',
				name: 'identifier',
				type: 'string',
				default: '',
				required: true,
				placeholder: '0194252032618',
				description: 'EAN, UPC, GTIN, ISBN, JAN, MINSAN or ASIN to look up',
				displayOptions: {
					show: {
						operation: ['Product_Lookup'],
					},
				},
			},

			// ─── Seller ID / URL (Seller_Profile, Seller_Products, Seller_Feedback) ─────────
			{
				displayName: 'Seller ID or Storefront URL',
				name: 'sellerId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'A2R2RITDJNW1Q6',
				description: 'Amazon Seller ID or full storefront URL',
				displayOptions: {
					show: {
						operation: ['Seller_Profile', 'Seller_Products', 'Seller_Feedback'],
					},
				},
			},

			// ─── Category ID (Category) ─────────
			{
				displayName: 'Category ID',
				name: 'categoryId',
				type: 'string',
				default: '',
				required: true,
				description: 'Amazon Category ID (Node ID)',
				displayOptions: {
					show: {
						operation: ['Category'],
					},
				},
			},

			// ─── BULK SUBMIT fields ──────────────────────────────────────────────
			{
				displayName: 'Bulk Operation Type',
				name: 'bulkOperation',
				type: 'options',
				options: [
					{ name: 'BEST_SELLERS_RANK', value: 'BEST_SELLERS_RANK' },
					{ name: 'DETAIL', value: 'DETAIL' },
					{ name: 'OFFER', value: 'OFFER' },
					{ name: 'PACKAGE_DIMENSION', value: 'PACKAGE_DIMENSION' },
					{ name: 'PRODUCT_LOOKUP', value: 'PRODUCT_LOOKUP' },
					{ name: 'SALES_ANALYSIS_HISTORY', value: 'SALES_ANALYSIS_HISTORY' },
					{ name: 'SEARCH', value: 'SEARCH' },
					{ name: 'SELLER_PRODUCTS', value: 'SELLER_PRODUCTS' },
					{ name: 'SELLER_PROFILE', value: 'SELLER_PROFILE' },
				],
				default: 'DETAIL',
				required: true,
				displayOptions: {
					show: {
						operation: ['Bulk_Submit'],
					},
				},
			},
			{
				displayName: 'Bulk Amazon Domain',
				name: 'bulkDomain',
				type: 'options',
				options: [
					{ name: 'amazon.ae (UAE)', value: '.ae' },
					{ name: 'amazon.ca (Canada)', value: '.ca' },
					{ name: 'amazon.co.jp (Japan)', value: '.co.jp' },
					{ name: 'amazon.co.uk (UK)', value: '.co.uk' },
					{ name: 'amazon.com (US)', value: '.com' },
					{ name: 'amazon.com.au (Australia)', value: '.com.au' },
					{ name: 'amazon.com.br (Brazil)', value: '.com.br' },
					{ name: 'amazon.com.mx (Mexico)', value: '.com.mx' },
					{ name: 'amazon.com.tr (Turkey)', value: '.com.tr' },
					{ name: 'amazon.de (Germany)', value: '.de' },
					{ name: 'amazon.es (Spain)', value: '.es' },
					{ name: 'amazon.fr (France)', value: '.fr' },
					{ name: 'amazon.in (India)', value: '.in' },
					{ name: 'amazon.it (Italy)', value: '.it' },
					{ name: 'amazon.nl (Netherlands)', value: '.nl' },
					{ name: 'amazon.pl (Poland)', value: '.pl' },
					{ name: 'amazon.sa (Saudi Arabia)', value: '.sa' },
					{ name: 'amazon.se (Sweden)', value: '.se' },
					{ name: 'amazon.sg (Singapore)', value: '.sg' },
				],
				default: '.com',
				required: true,
				description: 'The Amazon marketplace to query',
				displayOptions: {
					show: {
						operation: ['Bulk_Submit'],
					},
				},
			},
			{
				displayName: 'Callback URL',
				name: 'callbackUrl',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://your-server.com/webhook',
				description: 'Your server endpoint that will receive the results when processing is complete',
				displayOptions: {
					show: {
						operation: ['Bulk_Submit'],
					},
				},
			},
			{
				displayName: 'Payload (JSON)',
				name: 'bulkPayload',
				type: 'json',
				default: '{}',
				required: true,
				description: 'The payload object for the bulk operation. Keys are pluralized (e.g. "asins", "keywords", "URLs"). Example for DETAIL: {"asins": ["B00004RFMB", "B00004RFMC"]}',
				displayOptions: {
					show: {
						operation: ['Bulk_Submit'],
					},
				},
			},
			{
				displayName: 'Bulk Additional Options',
				name: 'bulkAdditionalOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					show: {
						operation: ['Bulk_Submit'],
					},
				},
				options: [
					{
						displayName: 'Address ID',
						name: 'address_id',
						type: 'number',
						default: 0,
						description: 'The unique ID for a specific delivery address (optional)',
					},
				],
			},

			// ─── BULK GET RESULT fields ──────────────────────────────────────────────
			{
				displayName: 'Query ID',
				name: 'queryId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'qwe78933-7614-40b3-9a40-def192b74810',
					description: 'The unique query ID returned from a Bulk Submit response (results[].ID). Use the ID field from the bulk submit response.',
				displayOptions: {
					show: {
						operation: ['Bulk_Get_Result'],
					},
				},
			},

			// ─── Additional Options (Real-Time operations) ───────────────────────────────────────
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: {
					hide: {
						operation: ['Account_Info', 'Bulk_Submit', 'Bulk_Get_Result'],
					},
				},
				options: [
					{
						displayName: 'A+ Content',
						name: 'a_plus_content',
						type: 'boolean',
						default: false,
						description: 'Whether to extract A+ content (costs extra credits)',
						displayOptions: {
							show: {
								'/operation': ['Detail'],
							},
						},
					},
					{
						displayName: 'Address ID',
						name: 'addressId',
						type: 'string',
						default: '',
						description: 'Delivery address ID for region-specific results (from Easyparser dashboard)',
					},
					{
						displayName: 'Associate ID',
						name: 'associateId',
						type: 'string',
						default: '',
						description: 'Amazon Associate/Affiliate ID to include in links',
						displayOptions: {
							show: {
								'/operation': ['Detail', 'Offer', 'Search', 'Seller_Profile', 'Seller_Products'],
							},
						},
					},
					{
						displayName: 'Cookie',
						name: 'cookie',
						type: 'string',
						default: '',
						description: 'Custom cookie string to send with the request',
					},
					{
						displayName: 'Currency',
						name: 'currency',
						type: 'string',
						default: '',
						placeholder: 'USD',
						description: 'ISO currency code for price data (e.g., USD, EUR, GBP)',
					},
					{
						displayName: 'Exclude Refinements',
						name: 'exclude_refinements',
						type: 'boolean',
						default: false,
						description: 'Whether to exclude refinements from search results',
						displayOptions: {
							show: {
								'/operation': ['Search', 'Seller_Products', 'Category'],
							},
						},
					},
					{
						displayName: 'Exclude Sponsored',
						name: 'excludeSponsored',
						type: 'boolean',
						default: false,
						description: 'Whether to exclude sponsored products from results',
						displayOptions: {
							show: {
								'/operation': ['Search'],
							},
						},
					},
					{
						displayName: 'History Range',
						name: 'historyRange',
						type: 'string',
						default: '',
						placeholder: '3',
						description: 'Duration for analysis in months (e.g., "3")',
						displayOptions: {
							show: {
								'/operation': ['Sales_Analysis_History'],
							},
						},
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						placeholder: 'en_US',
						description: 'Preferred data language (e.g., en_US, de_DE). Note: Incompatible with Address ID.',
					},
					{
						displayName: 'Max Page',
						name: 'maxPage',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
						description: 'Maximum page number for paginated results',
						displayOptions: {
							show: {
								'/operation': ['Search', 'Offer', 'Seller_Products', 'Seller_Feedback', 'Category'],
							},
						},
					},
					{
						displayName: 'Max Rating',
						name: 'maxRating',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 5 },
						default: 5,
						description: 'Maximum seller rating filter',
						displayOptions: {
							show: {
								'/operation': ['Seller_Feedback'],
							},
						},
					},
					{
						displayName: 'Min Page',
						name: 'minPage',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
						description: 'Minimum page number for paginated results',
						displayOptions: {
							show: {
								'/operation': ['Search', 'Offer', 'Seller_Products', 'Seller_Feedback', 'Category'],
							},
						},
					},
					{
						displayName: 'Min Quantity',
						name: 'minQuantity',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
						description: 'Minimum quantity available filter for offers',
						displayOptions: {
							show: {
								'/operation': ['Offer'],
							},
						},
					},
					{
						displayName: 'Min Rating',
						name: 'minRating',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 5 },
						default: 1,
						description: 'Minimum seller rating filter',
						displayOptions: {
							show: {
								'/operation': ['Seller_Feedback'],
							},
						},
					},
					{
						displayName: 'Offer Filters',
						name: 'offerFilters',
						type: 'string',
						default: '',
						placeholder: 'prime,free_shipping',
						description: 'Comma-separated offer filters. Logistics: prime, free_shipping. Condition: condition_new, condition_used_like_new, condition_used_very_good, condition_used_good, condition_used_acceptable.',
						displayOptions: {
							show: {
								'/operation': ['Offer'],
							},
						},
					},
					{
						displayName: 'Page Number',
						name: 'pageNumber',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
						description: 'Specific result page to extract',
						displayOptions: {
							show: {
								'/operation': ['Search', 'Seller_Products'],
							},
						},
					},
					{
						displayName: 'Parameters',
						name: 'parameters',
						type: 'string',
						default: '',
						description: 'Custom URL parameters to append to the Amazon request',
					},
					{
						displayName: 'Refinements',
						name: 'refinements',
						type: 'string',
						default: '',
						description: 'Custom refinements string',
						displayOptions: {
							show: {
								'/operation': ['Search', 'Seller_Products', 'Category'],
							},
						},
					},
					{
						displayName: 'Sort By',
						name: 'sortBy',
						type: 'options',
				options: [
						{ name: 'Avg. Customer Review', value: 'review-rank' },
						{ name: 'Best Sellers', value: 'exact-aware-popularity-rank' },
						{ name: 'Featured', value: 'featured' },
						{ name: 'Newest Arrivals', value: 'date-desc-rank' },
						{ name: 'Price: High to Low', value: 'price-desc-rank' },
						{ name: 'Price: Low to High', value: 'price-asc-rank' },
					],
						default: 'featured',
						description: 'Sort order for search results',
						displayOptions: {
							show: {
								'/operation': ['Search'],
							},
						},
					},
					{
						displayName: 'Sort By (Seller Products)',
						name: 'sortBySeller',
						type: 'options',
						options: [
							{ name: 'Best Sellers', value: 'exact-aware-popularity-rank' },
							{ name: 'Featured', value: 'featured-rank' },
						],
						default: 'featured-rank',
						description: 'Sort order for seller product listings',
						displayOptions: {
							show: {
								'/operation': ['Seller_Products'],
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


		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				// ── Account Info ──────────────────────────────────────────────
				if (operation === 'Account_Info') {
					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'easyparserApi', {
						method: 'GET',
						url: 'https://account.easyparser.com/v1/account',
						qs: {},
						json: true,
					});
					returnData.push({ json: response, pairedItem: { item: i } });
					continue;
				}

				// ── Bulk Submit ───────────────────────────────────────────────
				if (operation === 'Bulk_Submit') {
					const bulkOperation = this.getNodeParameter('bulkOperation', i) as string;
					const bulkDomain = this.getNodeParameter('bulkDomain', i) as string;
					const callbackUrl = this.getNodeParameter('callbackUrl', i) as string;
					const bulkPayloadRaw = this.getNodeParameter('bulkPayload', i) as string | object;
					const bulkAdditionalOptions = this.getNodeParameter('bulkAdditionalOptions', i) as {
						address_id?: number;
					};

					let payload: object;
					if (typeof bulkPayloadRaw === 'string') {
						try {
							payload = JSON.parse(bulkPayloadRaw);
						} catch {
							throw new NodeOperationError(this.getNode(), 'Payload (JSON) is not valid JSON', { itemIndex: i });
						}
					} else {
						payload = bulkPayloadRaw;
					}

					const bulkBody: Record<string, unknown> = {
						platform: 'AMZ',
						operation: bulkOperation,
						domain: bulkDomain,
						callback_url: callbackUrl,
						payload,
					};

					if (bulkAdditionalOptions.address_id) {
						bulkBody.address_id = bulkAdditionalOptions.address_id;
					}

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'easyparserApi', {
						method: 'POST',
						url: 'https://bulk.easyparser.com/v1/bulk',
						headers: {
							
							'Content-Type': 'application/json',
						},
						body: [bulkBody],
						json: true,
					});
					returnData.push({ json: response, pairedItem: { item: i } });
					continue;
				}

				// ── Bulk Get Result ───────────────────────────────────────────
				if (operation === 'Bulk_Get_Result') {
					const queryId = this.getNodeParameter('queryId', i) as string;
					if (!queryId) throw new NodeOperationError(this.getNode(), 'Query ID is required', { itemIndex: i });

					const response = await this.helpers.httpRequestWithAuthentication.call(this, 'easyparserApi', {
						method: 'GET',
						url: `https://data.easyparser.com/v1/queries/${queryId}/results`,
						headers: {
							
						},
						qs: { format: 'json' },
						json: true,
					});
					returnData.push({ json: response, pairedItem: { item: i } });
					continue;
				}

				// ── Real-Time Operations ──────────────────────────────────────
				const domain = this.getNodeParameter('domain', i) as string;
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
					a_plus_content?: boolean;
					addressId?: string;
					associateId?: string;
					cookie?: string;
					currency?: string;
					exclude_refinements?: boolean;
					excludeSponsored?: boolean;
					historyRange?: string;
					language?: string;
					maxPage?: number;
					maxRating?: number;
					minPage?: number;
					minQuantity?: number;
					minRating?: number;
					offerFilters?: string;
					pageNumber?: number;
					parameters?: string;
					refinements?: string;
					sortBy?: string;
					sortBySeller?: string;
				};

				const qs: Record<string, string | number | boolean> = {
					
					platform: 'AMZ',
					domain,
					operation,
				};

				// Operation-specific required parameters
				if (['Detail', 'Offer', 'Sales_Analysis_History', 'BEST_SELLERS_RANK', 'PACKAGE_DIMENSION'].includes(operation)) {
					const asinOrUrl = this.getNodeParameter('asin', i) as string;
					if (!asinOrUrl) throw new NodeOperationError(this.getNode(), 'ASIN or URL is required', { itemIndex: i });
					if (asinOrUrl.startsWith('http')) {
						qs.url = asinOrUrl;
					} else {
						qs.asin = asinOrUrl;
					}
				} else if (operation === 'Search') {
					const keywordOrUrl = this.getNodeParameter('keyword', i) as string;
					if (!keywordOrUrl) throw new NodeOperationError(this.getNode(), 'Search keyword or URL is required', { itemIndex: i });
					if (keywordOrUrl.startsWith('http')) {
						qs.url = keywordOrUrl;
					} else {
						qs.keyword = keywordOrUrl;
					}
				} else if (operation === 'Product_Lookup') {
					const identifierType = this.getNodeParameter('identifier_type', i) as string;
					const identifier = this.getNodeParameter('identifier', i) as string;
					if (!identifier) throw new NodeOperationError(this.getNode(), 'Product identifier is required', { itemIndex: i });
					qs.identifier_type = identifierType;
					qs.identifier = identifier;
				} else if (['Seller_Profile', 'Seller_Products', 'Seller_Feedback'].includes(operation)) {
					const sellerIdOrUrl = this.getNodeParameter('sellerId', i) as string;
					if (!sellerIdOrUrl) throw new NodeOperationError(this.getNode(), 'Seller ID or URL is required', { itemIndex: i });
					if (sellerIdOrUrl.startsWith('http')) {
						qs.url = sellerIdOrUrl;
					} else {
						qs.seller_id = sellerIdOrUrl;
					}
				} else if (operation === 'Category') {
					const categoryId = this.getNodeParameter('categoryId', i) as string;
					if (!categoryId) throw new NodeOperationError(this.getNode(), 'Category ID is required', { itemIndex: i });
					qs.category_id = categoryId;
				}

				// Optional parameters
				if (additionalOptions.a_plus_content) qs.a_plus_content = true;
				if (additionalOptions.addressId) qs.address_id = additionalOptions.addressId;
				if (additionalOptions.associateId) qs.associate_id = additionalOptions.associateId;
				if (additionalOptions.cookie) qs.cookie = additionalOptions.cookie;
				if (additionalOptions.currency) qs.currency = additionalOptions.currency;
				if (additionalOptions.exclude_refinements) qs.exclude_refinements = true;
				if (additionalOptions.excludeSponsored) qs.exclude_sponsored = true;
				if (additionalOptions.historyRange) qs.history_range = additionalOptions.historyRange;
				if (additionalOptions.language) qs.language = additionalOptions.language;
				if (additionalOptions.maxPage && additionalOptions.maxPage > 1) qs.max_page = additionalOptions.maxPage;
				if (additionalOptions.maxRating && additionalOptions.maxRating < 5) qs.max_rating = additionalOptions.maxRating;
				if (additionalOptions.minPage && additionalOptions.minPage > 1) qs.min_page = additionalOptions.minPage;
				if (additionalOptions.minQuantity && additionalOptions.minQuantity > 1) qs.min_quantity = additionalOptions.minQuantity;
				if (additionalOptions.minRating && additionalOptions.minRating > 1) qs.min_rating = additionalOptions.minRating;
				if (additionalOptions.offerFilters) qs.filter = additionalOptions.offerFilters;
				if (additionalOptions.pageNumber && additionalOptions.pageNumber > 1) qs.page = additionalOptions.pageNumber;
				if (additionalOptions.parameters) qs.parameters = additionalOptions.parameters;
				if (additionalOptions.refinements) qs.refinements = additionalOptions.refinements;
				if (additionalOptions.sortBy && additionalOptions.sortBy !== 'featured') qs.sort_by = additionalOptions.sortBy;
				if (additionalOptions.sortBySeller && additionalOptions.sortBySeller !== 'featured-rank') qs.sort_by = additionalOptions.sortBySeller;

				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'easyparserApi', {
					method: 'GET',
					url: 'https://realtime.easyparser.com/v1/request',
					qs,
					json: true,
				});

				returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
