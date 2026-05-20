import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class EasyParser implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'EasyParser',
		name: 'easyParser',
		icon: 'file:easyparser.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Extract structured Amazon product data using EasyParser API',
		defaults: {
			name: 'EasyParser',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'easyParserApi',
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
						value: 'DETAIL',
						description: 'Fetch detailed information about a single product',
						action: 'Fetch product detail',
					},
					{
						name: 'Product Offers',
						value: 'OFFER',
						description: 'Get multiple price offers for a product',
						action: 'Get product offers',
					},
					{
						name: 'Search',
						value: 'SEARCH',
						description: 'Search for products by keyword or URL',
						action: 'Search products',
					},
					{
						name: 'Product Lookup',
						value: 'PRODUCT_LOOKUP',
						description: 'Convert EAN/UPC/GTIN to Amazon ASIN',
						action: 'Product lookup',
					},
					{
						name: 'Sales Analysis',
						value: 'SALES_ANALYSIS',
						description: 'Get 12-month sales history and trend data',
						action: 'Get sales analysis',
					},
					{
						name: 'Best Sellers Rank',
						value: 'BSR',
						description: 'Get Best Sellers Rank for a product',
						action: 'Get best sellers rank',
					},
					{
						name: 'Package Dimensions',
						value: 'PACKAGE_DIMENSION',
						description: 'Get physical dimensions and weight of a product',
						action: 'Get package dimensions',
					},
					{
						name: 'Seller Profile',
						value: 'SELLER_PROFILE',
						description: 'Get seller information and feedback history',
						action: 'Get seller profile',
					},
					{
						name: 'Seller Products',
						value: 'SELLER_PRODUCTS',
						description: "Get all products listed by a seller",
						action: 'Get seller products',
					},
				],
				default: 'DETAIL',
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
			},

			// ─── ASIN (for DETAIL, OFFER, SALES_ANALYSIS, BSR, PACKAGE_DIMENSION) ──
			{
				displayName: 'ASIN',
				name: 'asin',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'B0F25371FH',
				description: 'Amazon Standard Identification Number (ASIN) of the product',
				displayOptions: {
					show: {
						operation: ['DETAIL', 'OFFER', 'SALES_ANALYSIS', 'BSR', 'PACKAGE_DIMENSION'],
					},
				},
			},

			// ─── Keyword / URL (for SEARCH) ───────────────────────────────
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
						operation: ['SEARCH'],
					},
				},
			},

			// ─── Identifier (for PRODUCT_LOOKUP) ─────────────────────────
			{
				displayName: 'Product Identifier',
				name: 'identifier',
				type: 'string',
				default: '',
				required: true,
				placeholder: '0194252032618',
				description: 'EAN, UPC, GTIN or keyword to look up',
				displayOptions: {
					show: {
						operation: ['PRODUCT_LOOKUP'],
					},
				},
			},

			// ─── Seller ID (for SELLER_PROFILE, SELLER_PRODUCTS) ─────────
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
						operation: ['SELLER_PROFILE', 'SELLER_PRODUCTS'],
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
				options: [
					{
						displayName: 'Address ID',
						name: 'addressId',
						type: 'string',
						default: '',
						description: 'Delivery address ID for region-specific results (from EasyParser dashboard)',
					},
					{
						displayName: 'Page Number',
						name: 'page',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1,
						description: 'Page number for paginated results',
						displayOptions: {
							show: {
								'/operation': ['SEARCH', 'SELLER_PRODUCTS'],
							},
						},
					},
					{
						displayName: 'Output Format',
						name: 'output',
						type: 'options',
						options: [
							{ name: 'JSON', value: 'json' },
							{ name: 'CSV', value: 'csv' },
						],
						default: 'json',
						description: 'Response format',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('easyParserApi');
		const apiKey = credentials.apiKey as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const domain = this.getNodeParameter('domain', i) as string;
				const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
					addressId?: string;
					page?: number;
					output?: string;
				};

				// Build query parameters
				const qs: Record<string, string | number> = {
					api_key: apiKey,
					platform: 'AMZ',
					domain,
					output: additionalOptions.output ?? 'json',
					operation,
				};

				// Add operation-specific parameters
				if (['DETAIL', 'OFFER', 'SALES_ANALYSIS', 'BSR', 'PACKAGE_DIMENSION'].includes(operation)) {
					const asin = this.getNodeParameter('asin', i) as string;
					if (!asin) throw new NodeOperationError(this.getNode(), 'ASIN is required for this operation', { itemIndex: i });
					qs.asin = asin;
				} else if (operation === 'SEARCH') {
					const keyword = this.getNodeParameter('keyword', i) as string;
					if (!keyword) throw new NodeOperationError(this.getNode(), 'Search keyword is required', { itemIndex: i });
					qs.keyword = keyword;
				} else if (operation === 'PRODUCT_LOOKUP') {
					const identifier = this.getNodeParameter('identifier', i) as string;
					if (!identifier) throw new NodeOperationError(this.getNode(), 'Product identifier is required', { itemIndex: i });
					qs.identifier = identifier;
				} else if (['SELLER_PROFILE', 'SELLER_PRODUCTS'].includes(operation)) {
					const sellerId = this.getNodeParameter('sellerId', i) as string;
					if (!sellerId) throw new NodeOperationError(this.getNode(), 'Seller ID is required', { itemIndex: i });
					qs.seller_id = sellerId;
				}

				// Optional parameters
				if (additionalOptions.addressId) qs.address_id = additionalOptions.addressId;
				if (additionalOptions.page) qs.page = additionalOptions.page;

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
