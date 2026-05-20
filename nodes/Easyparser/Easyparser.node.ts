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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
						name: 'Product Detail',
						value: 'Detail',
						description: 'Fetch detailed information about a single product',
						action: 'Fetch product detail',
					},
					{
						name: 'Product Offers',
						value: 'Offer',
						description: 'Get multiple price offers for a product',
						action: 'Get product offers',
					},
					{
						name: 'Search',
						value: 'Search',
						description: 'Search for products by keyword or URL',
						action: 'Search products',
					},
					{
						name: 'Product Lookup',
						value: 'Product_Lookup',
						description: 'Convert EAN/UPC/GTIN to Amazon ASIN',
						action: 'Product lookup',
					},
					{
						name: 'Sales Analysis History',
						value: 'Sales_Analysis_History',
						description: 'Get 12-month sales history and trend data',
						action: 'Get sales analysis history',
					},
					{
						name: 'Best Sellers Rank',
						value: 'BEST_SELLERS_RANK',
						description: 'Get Best Sellers Rank for a product',
						action: 'Get best sellers rank',
					},
					{
						name: 'Package Dimension',
						value: 'PACKAGE_DIMENSION',
						description: 'Get physical dimensions and weight of a product',
						action: 'Get package dimension',
					},
					{
						name: 'Seller Profile',
						value: 'Seller_Profile',
						description: 'Get seller information',
						action: 'Get seller profile',
					},
					{
						name: 'Seller Products',
						value: 'Seller_Products',
						description: 'Get all products listed by a seller',
						action: 'Get seller products',
					},
					{
						name: 'Seller Feedback',
						value: 'Seller_Feedback',
						description: 'Get feedback history for a seller',
						action: 'Get seller feedback',
					},
					{
						name: 'Customer Reviews',
						value: 'Customer_Reviews',
						description: 'Get customer reviews for a product',
						action: 'Get customer reviews',
					},
					{
						name: 'Category',
						value: 'Category',
						description: 'Get category information',
						action: 'Get category',
					},
					{
						name: 'Account Info',
						value: 'Account_Info',
						description: 'Get your account plan and credit usage details',
						action: 'Get account info',
					},
				],
				default: 'Detail',
			},

			// ─── Amazon Domain ────────────────────────────────────────────
			{
				displayName: 'Amazon Domain',
				name: 'domain',
				type: 'options',
				options: [
					{ name: 'amazon.com (US)', value: '.com' },
					{ name: 'amazon.co.uk (UK)', value: '.co.uk' },
					{ name: 'amazon.de (Germany)', value: '.de' },
					{ name: 'amazon.fr (France)', value: '.fr' },
					{ name: 'amazon.it (Italy)', value: '.it' },
					{ name: 'amazon.es (Spain)', value: '.es' },
					{ name: 'amazon.ca (Canada)', value: '.ca' },
					{ name: 'amazon.com.mx (Mexico)', value: '.com.mx' },
					{ name: 'amazon.com.br (Brazil)', value: '.com.br' },
					{ name: 'amazon.co.jp (Japan)', value: '.co.jp' },
					{ name: 'amazon.com.au (Australia)', value: '.com.au' },
					{ name: 'amazon.in (India)', value: '.in' },
					{ name: 'amazon.ae (UAE)', value: '.ae' },
					{ name: 'amazon.sa (Saudi Arabia)', value: '.sa' },
					{ name: 'amazon.nl (Netherlands)', value: '.nl' },
					{ name: 'amazon.pl (Poland)', value: '.pl' },
					{ name: 'amazon.se (Sweden)', value: '.se' },
					{ name: 'amazon.com.tr (Turkey)', value: '.com.tr' },
					{ name: 'amazon.sg (Singapore)', value: '.sg' },
				],
				default: '.com',
				description: 'The Amazon marketplace to query',
				displayOptions: {
					hide: {
						operation: ['Account_Info'],
					},
				},
			},

			// ─── ASIN / URL (for Detail, Offer, Sales_Analysis_History, BEST_SELLERS_RANK, PACKAGE_DIMENSION, Customer_Reviews) ──
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
							'Customer_Reviews',
						],
					},
				},
			},

			// ─── Keyword / URL (for Search) ───────────────────────────────
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

			// ─── Identifier (for Product_Lookup) ─────────────────────────
			{
				displayName: 'Identifier Type',
				name: 'identifier_type',
				type: 'options',
				options: [
					{ name: 'EAN', value: 'EAN' },
					{ name: 'UPC', value: 'UPC' },
					{ name: 'GTIN', value: 'GTIN' },
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
				description: 'EAN, UPC, or GTIN to look up',
				displayOptions: {
					show: {
						operation: ['Product_Lookup'],
					},
				},
			},

			// ─── Seller ID / URL (for Seller_Profile, Seller_Products, Seller_Feedback) ─────────
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

			// ─── Category ID (for Category) ─────────
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

			// ─── Additional Options ───────────────────────────────────────
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					hide: {
						operation: ['Account_Info'],
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
					},
					{
						displayName: 'Category Filter',
						name: 'categoryFilter',
						type: 'options',
						options: [
							{ name: 'Standard', value: 'standard' },
							{ name: 'Best Sellers', value: 'bestsellers' },
							{ name: 'New Releases', value: 'new-releases' },
							{ name: 'Movers & Shakers', value: 'movers-and-shakers' },
							{ name: 'Most Wished For', value: 'most-wished-for' },
							{ name: 'Gift Ideas', value: 'gift-ideas' },
						],
						default: 'standard',
						displayOptions: {
							show: {
								'/operation': ['Search', 'Category'],
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
						description: 'Currency code (e.g., USD, EUR, GBP)',
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
								'/operation': ['Search', 'Seller_Products', 'Category'],
							},
						},
					},
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'string',
						default: '',
						description: 'Filter condition (e.g., "prime", "free_shipping")',
						displayOptions: {
							show: {
								'/operation': ['Offer'],
							},
						},
					},
					{
						displayName: 'Filter By Keyword',
						name: 'filterByKeyword',
						type: 'string',
						default: '',
						description: 'Keyword to filter reviews',
						displayOptions: {
							show: {
								'/operation': ['Customer_Reviews'],
							},
						},
					},
					{
						displayName: 'Filter By Star',
						name: 'filterByStar',
						type: 'options',
						options: [
							{ name: 'All Stars', value: 'all_stars' },
							{ name: '5 Star', value: 'five_star' },
							{ name: '4 Star', value: 'four_star' },
							{ name: '3 Star', value: 'three_star' },
							{ name: '2 Star', value: 'two_star' },
							{ name: '1 Star', value: 'one_star' },
							{ name: 'Positive', value: 'positive' },
							{ name: 'Critical', value: 'critical' },
						],
						default: 'all_stars',
						displayOptions: {
							show: {
								'/operation': ['Customer_Reviews'],
							},
						},
					},
					{
						displayName: 'Format Type',
						name: 'formatType',
						type: 'options',
						options: [
							{ name: 'All Formats', value: 'all_formats' },
							{ name: 'Current Format', value: 'current_format' },
						],
						default: 'all_formats',
						displayOptions: {
							show: {
								'/operation': ['Customer_Reviews'],
							},
						},
					},
					{
						displayName: 'History Range',
						name: 'historyRange',
						type: 'string',
						default: '0',
						description: 'History range (0 for all)',
						displayOptions: {
							show: {
								'/operation': ['Sales_Analysis_History', 'Seller_Feedback'],
							},
						},
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						description: 'Language code (e.g., en_US, de_DE)',
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
						displayOptions: {
							show: {
								'/operation': ['Seller_Feedback'],
							},
						},
					},
					{
						displayName: 'Media Type',
						name: 'mediaType',
						type: 'options',
						options: [
							{ name: 'All Reviews', value: 'all_contents' },
							{ name: 'Media Reviews Only', value: 'media_reviews_only' },
						],
						default: 'all_contents',
						displayOptions: {
							show: {
								'/operation': ['Customer_Reviews'],
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
						description: 'Minimum quantity available',
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
						displayOptions: {
							show: {
								'/operation': ['Seller_Feedback'],
							},
						},
					},
					{
						displayName: 'Page Number',
						name: 'pageNumber',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
						displayOptions: {
							show: {
								'/operation': ['Customer_Reviews'],
							},
						},
					},
					{
						displayName: 'Parameters',
						name: 'parameters',
						type: 'string',
						default: '',
						description: 'Additional custom query parameters',
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
						displayName: 'Reviewer Type',
						name: 'reviewerType',
						type: 'options',
						options: [
							{ name: 'All Reviews', value: 'all_reviews' },
							{ name: 'Verified Purchases Only', value: 'avp_only_reviews' },
						],
						default: 'all_reviews',
						displayOptions: {
							show: {
								'/operation': ['Customer_Reviews'],
							},
						},
					},
					{
						displayName: 'Sort By',
						name: 'shortBy',
						type: 'string',
						default: '',
						description: 'Sorting parameter',
						displayOptions: {
							show: {
								'/operation': ['Search', 'Seller_Products', 'Seller_Feedback', 'Customer_Reviews', 'Category'],
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

		const credentials = await this.getCredentials('easyparserApi');
		const apiKey = credentials.apiKey as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				// Handle Account API specially
				if (operation === 'Account_Info') {
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: 'https://account.easyparser.com/v1/account',
						qs: {
							api_key: apiKey,
						},
						json: true,
					});

					returnData.push({
						json: response,
						pairedItem: { item: i },
					});
					continue;
				}

				const domain = this.getNodeParameter('domain', i) as string;
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
					a_plus_content?: boolean;
					addressId?: string;
					associateId?: string;
					categoryFilter?: string;
					cookie?: string;
					currency?: string;
					exclude_refinements?: boolean;
					excludeSponsored?: boolean;
					filter?: string;
					filterByKeyword?: string;
					filterByStar?: string;
					formatType?: string;
					historyRange?: string;
					language?: string;
					maxPage?: number;
					maxRating?: number;
					mediaType?: string;
					minPage?: number;
					minQuantity?: number;
					pageNumber?: number;
					parameters?: string;
					refinements?: string;
					reviewerType?: string;
					shortBy?: string;
				};

				// Build query parameters
				const qs: Record<string, string | number | boolean> = {
					api_key: apiKey,
					platform: 'AMZ',
					domain,
					output: 'json',
					operation,
				};

				// Add operation-specific parameters
				if (
					[
						'Detail',
						'Offer',
						'Sales_Analysis_History',
						'BEST_SELLERS_RANK',
						'PACKAGE_DIMENSION',
						'Customer_Reviews',
					].includes(operation)
				) {
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

				// Add optional parameters
				if (additionalOptions.a_plus_content) qs.a_plus_content = true;
				if (additionalOptions.addressId) qs.address_id = additionalOptions.addressId;
				if (additionalOptions.associateId) qs.associate_id = additionalOptions.associateId;
				if (additionalOptions.categoryFilter && additionalOptions.categoryFilter !== 'standard') qs.category_filter = additionalOptions.categoryFilter;
				if (additionalOptions.cookie) qs.cookie = additionalOptions.cookie;
				if (additionalOptions.currency) qs.currency = additionalOptions.currency;
				if (additionalOptions.exclude_refinements) qs.exclude_refinements = true;
				if (additionalOptions.excludeSponsored) qs.exclude_sponsored = true;
				if (additionalOptions.filter) qs.filter = additionalOptions.filter;
				if (additionalOptions.filterByKeyword) qs.filter_by_keyword = additionalOptions.filterByKeyword;
				if (additionalOptions.filterByStar && additionalOptions.filterByStar !== 'all_stars') qs.filter_by_star = additionalOptions.filterByStar;
				if (additionalOptions.formatType && additionalOptions.formatType !== 'all_formats') qs.format_type = additionalOptions.formatType;
				if (additionalOptions.historyRange) qs.history_range = additionalOptions.historyRange;
				if (additionalOptions.language) qs.language = additionalOptions.language;
				if (additionalOptions.maxPage) qs.max_page = additionalOptions.maxPage;
				if (additionalOptions.maxRating) qs.max_rating = additionalOptions.maxRating;
				if (additionalOptions.mediaType && additionalOptions.mediaType !== 'all_contents') qs.media_type = additionalOptions.mediaType;
				if (additionalOptions.minPage) qs.min_page = additionalOptions.minPage;
				if (additionalOptions.minQuantity) qs.min_quantity = additionalOptions.minQuantity;
				if (additionalOptions.pageNumber) qs.page_number = additionalOptions.pageNumber;
				if (additionalOptions.parameters) qs.parameters = additionalOptions.parameters;
				if (additionalOptions.refinements) qs.refinements = additionalOptions.refinements;
				if (additionalOptions.reviewerType && additionalOptions.reviewerType !== 'all_reviews') qs.reviewer_type = additionalOptions.reviewerType;
				if (additionalOptions.shortBy) qs.short_by = additionalOptions.shortBy;

				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: 'https://realtime.easyparser.com/v1/request',
					qs,
					json: true,
				});

				returnData.push({
					json: response,
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
				throw error;
			}
		}

		return [returnData];
	}
}
