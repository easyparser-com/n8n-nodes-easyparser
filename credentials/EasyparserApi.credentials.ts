import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class EasyparserApi implements ICredentialType {
  name = "easyparserApi";
  displayName = "Easyparser API";
  documentationUrl = "https://docs.easyparser.com/";
  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description:
        "Your Easyparser API key. Get it from https://app.easyparser.com.",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      // Real-time/account require api_key; Bulk/data require api-key.
      // n8n injects both through its credential-aware request helper.
      qs: {
        api_key: "={{$credentials.apiKey}}",
      },
      headers: {
        "api-key": "={{$credentials.apiKey}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "https://account.easyparser.com",
      url: "/v1/account",
      qs: {},
    },
  };
}
