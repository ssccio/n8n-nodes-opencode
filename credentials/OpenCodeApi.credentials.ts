import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class OpenCodeApi implements ICredentialType {
  name = "openCodeApi";

  displayName = "OpenCode API";

  documentationUrl = "https://opencode.ai/docs/";

  properties: INodeProperties[] = [
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "http://127.0.0.1:4096",
      description: "The base URL of your OpenCode server instance",
      placeholder: "http://127.0.0.1:4096",
    },
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      description: "Optional API key for authenticated OpenCode instances",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization:
          '={{$credentials.apiKey ? "Bearer " + $credentials.apiKey : ""}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.baseUrl}}",
      url: "/session",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        agent: "coder",
        model: {
          providerID: "anthropic",
          modelID: "claude-sonnet-4",
        },
      },
    },
  };
}
