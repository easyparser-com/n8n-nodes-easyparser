import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EasyparserApi implements ICredentialType {
	name = 'easyparserApi';
	displayName = 'Easyparser API';
	documentationUrl = 'https://easyparser.gitbook.io/easyparser-documentation/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Easyparser API key. Get it from https://app.easyparser.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				api_key: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://realtime.easyparser.com',
			url: '/v1/account',
			qs: {},
		},
	};
}
