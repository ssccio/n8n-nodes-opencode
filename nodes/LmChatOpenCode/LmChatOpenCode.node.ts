import type {
  ISupplyDataFunctions,
  INodeType,
  INodeTypeDescription,
  SupplyData,
} from "n8n-workflow";
import { NodeConnectionTypes } from "n8n-workflow";
import { OpenCodeChatModel } from "./OpenCodeChatModel";

export class LmChatOpenCode implements INodeType {
  description: INodeTypeDescription = {
    displayName: "OpenCode Chat Model",
    name: "lmChatOpenCode",
    icon: "file:opencode.svg",
    group: ["transform"],
    version: 1,
    description: "Use OpenCode self-hosted AI coding agent as a chat model",
    defaults: {
      name: "OpenCode Chat Model",
    },
    codex: {
      categories: ["AI"],
      subcategories: {
        AI: ["Language Models", "Agents"],
      },
      resources: {
        primaryDocumentation: [
          {
            url: "https://opencode.ai/docs/",
          },
        ],
      },
    },
    credentials: [
      {
        name: "openCodeApi",
        required: false,
      },
    ],
    inputs: [],
    outputs: [NodeConnectionTypes.AiLanguageModel],
    outputNames: ["Model"],
    properties: [
      {
        displayName: "Agent",
        name: "agent",
        type: "options",
        description: "The OpenCode agent to use",
        default: "build",
        options: [
          {
            name: "Build",
            value: "build",
            description: "Agent for building and implementing features",
          },
          {
            name: "Chat",
            value: "chat",
            description: "General chat agent",
          },
          {
            name: "Debug",
            value: "debug",
            description: "Agent specialized for debugging",
          },
        ],
      },
      {
        displayName: "Model Provider",
        name: "providerID",
        type: "options",
        description: "The model provider to use",
        default: "anthropic",
        options: [
          {
            name: "Anthropic",
            value: "anthropic",
          },
          {
            name: "OpenAI",
            value: "openai",
          },
          {
            name: "Google",
            value: "google",
          },
          {
            name: "Groq",
            value: "groq",
          },
          {
            name: "Ollama",
            value: "ollama",
          },
        ],
      },
      {
        displayName: "Model ID",
        name: "modelID",
        type: "string",
        description: "The specific model to use",
        default: "claude-3-5-sonnet-20241022",
        placeholder: "claude-3-5-sonnet-20241022",
        displayOptions: {
          show: {
            providerID: ["anthropic"],
          },
        },
      },
      {
        displayName: "Model ID",
        name: "modelID",
        type: "string",
        description: "The specific model to use",
        default: "gpt-4-turbo",
        placeholder: "gpt-4-turbo",
        displayOptions: {
          show: {
            providerID: ["openai"],
          },
        },
      },
      {
        displayName: "Model ID",
        name: "modelID",
        type: "string",
        description: "The specific model to use",
        default: "gemini-2.0-flash-exp",
        placeholder: "gemini-2.0-flash-exp",
        displayOptions: {
          show: {
            providerID: ["google"],
          },
        },
      },
      {
        displayName: "Model ID",
        name: "modelID",
        type: "string",
        description: "The specific model to use",
        default: "llama-3.3-70b-versatile",
        placeholder: "llama-3.3-70b-versatile",
        displayOptions: {
          show: {
            providerID: ["groq"],
          },
        },
      },
      {
        displayName: "Model ID",
        name: "modelID",
        type: "string",
        description: "The specific model to use",
        default: "qwen2.5-coder:32b",
        placeholder: "qwen2.5-coder:32b",
        displayOptions: {
          show: {
            providerID: ["ollama"],
          },
        },
      },
      {
        displayName: "Options",
        name: "options",
        type: "collection",
        default: {},
        placeholder: "Add Option",
        options: [
          {
            displayName: "Base URL",
            name: "baseUrl",
            type: "string",
            default: "",
            description:
              "Override the base URL from credentials. Leave empty to use credentials.",
            placeholder: "http://opencode-service:4096",
          },
          {
            displayName: "Temperature",
            name: "temperature",
            type: "number",
            default: 0.7,
            typeOptions: {
              maxValue: 2,
              minValue: 0,
              numberPrecision: 2,
            },
            description:
              "Controls randomness in the response. Lower values make output more focused and deterministic.",
          },
          {
            displayName: "Maximum Tokens",
            name: "maxTokens",
            type: "number",
            default: -1,
            description:
              "Maximum number of tokens to generate. -1 means no limit.",
          },
        ],
      },
    ],
  };

  async supplyData(
    this: ISupplyDataFunctions,
    itemIndex: number,
  ): Promise<SupplyData> {
    const credentials = await this.getCredentials("openCodeApi");

    const agent = this.getNodeParameter("agent", itemIndex) as string;
    const providerID = this.getNodeParameter("providerID", itemIndex) as string;
    const modelID = this.getNodeParameter("modelID", itemIndex) as string;
    const options = this.getNodeParameter("options", itemIndex, {}) as {
      baseUrl?: string;
      temperature?: number;
      maxTokens?: number;
    };

    // Use baseUrl from options, fallback to credentials, fallback to default
    const baseUrl =
      options.baseUrl ||
      (credentials?.baseUrl as string) ||
      "http://localhost:4096";

    const model = new OpenCodeChatModel({
      baseUrl,
      apiKey: credentials?.apiKey as string | undefined,
      agent,
      providerID,
      modelID,
      temperature: options.temperature,
      maxTokens: options.maxTokens !== -1 ? options.maxTokens : undefined,
    });

    return {
      response: model,
    };
  }
}
