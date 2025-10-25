import {
  BaseChatModel,
  type BaseChatModelParams,
  type BindToolsInput,
} from "@langchain/core/language_models/chat_models";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
import type { Runnable } from "@langchain/core/runnables";

export interface OpenCodeChatModelInput extends BaseChatModelParams {
  baseUrl?: string;
  apiKey?: string;
  agent?: string;
  providerID?: string;
  modelID?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenCodeSession {
  id: string;
  createdAt: string;
}

interface OpenCodeMessagePart {
  type: "text" | "file" | "tool" | "reasoning";
  text?: string;
  content?: string;
  url?: string;
  filename?: string;
  mime?: string;
}

interface OpenCodeMessageResponse {
  parts: OpenCodeMessagePart[];
}

export class OpenCodeChatModel extends BaseChatModel {
  baseUrl = "http://127.0.0.1:4096";
  apiKey?: string;
  agent = "build";
  providerID = "anthropic";
  modelID = "claude-3-5-sonnet-20241022";
  temperature?: number;
  maxTokens?: number;
  private requestTimeout = 30000; // 30 second timeout for API requests

  constructor(fields: OpenCodeChatModelInput) {
    super(fields);

    // Validate and set baseUrl
    const baseUrl = fields.baseUrl ?? this.baseUrl;
    try {
      new URL(baseUrl);
      this.baseUrl = baseUrl;
    } catch {
      throw new Error(`Invalid baseUrl: ${baseUrl}. Must be a valid URL.`);
    }

    // Validate required fields
    const providerID = fields.providerID ?? this.providerID;
    const modelID = fields.modelID ?? this.modelID;

    if (!providerID || providerID.trim() === "") {
      throw new Error("providerID is required and cannot be empty");
    }
    if (!modelID || modelID.trim() === "") {
      throw new Error("modelID is required and cannot be empty");
    }

    this.apiKey = fields.apiKey;
    this.agent = fields.agent ?? this.agent;
    this.providerID = providerID;
    this.modelID = modelID;
    this.temperature = fields.temperature;
    this.maxTokens = fields.maxTokens;
  }

  _llmType(): string {
    return "opencode";
  }

  // Declare that this model supports tool calling
  // This is required for n8n AI Agent to recognize tool support
  get supportsToolCalling(): boolean {
    return true;
  }

  // Implement bindTools to enable tool calling functionality
  // This method is called by LangChain when tools are bound to the model
  bindTools(
    _tools: BindToolsInput[],
    _kwargs?: Partial<this["ParsedCallOptions"]>,
  ): Runnable {
    // Return a runnable that includes the bound tools
    // OpenCode handles tools internally, so we just return this model instance
    return this as unknown as Runnable;
  }

  async _generate(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    let sessionId: string | undefined;

    try {
      // Create fresh session for this execution
      sessionId = await this.createSession();

      // Convert messages to OpenCode prompt format
      const promptParts = this.convertMessagesToPromptParts(messages);

      // Send prompt to OpenCode and get response directly
      const responseText = await this.sendPrompt(sessionId, promptParts);

      // Notify callback manager if provided
      if (runManager) {
        await runManager.handleLLMNewToken(responseText);
      }

      return {
        generations: [
          {
            text: responseText,
            message: new AIMessage(responseText),
          },
        ],
      };
    } finally {
      // Clean up session after execution if one was created
      if (sessionId) {
        await this.deleteSession(sessionId);
      }
    }
  }

  // Streaming is not implemented - OpenCode API returns complete responses
  // LangChain will automatically fall back to using _generate for streaming calls

  private async createSession(): Promise<string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(`${this.baseUrl}/session`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          agent: this.agent,
          model: {
            providerID: this.providerID,
            modelID: this.modelID,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to create OpenCode session (${response.status}): ${errorBody}`,
        );
      }

      // Validate response structure
      const data: any = await response.json();
      if (typeof data?.id !== "string") {
        throw new Error(
          'Failed to create session: API response is missing or has an invalid "id" field',
        );
      }

      const session = data as OpenCodeSession;
      return session.id;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Request to create session timed out after ${this.requestTimeout / 1000} seconds`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private convertMessagesToPromptParts(
    messages: BaseMessage[],
  ): OpenCodeMessagePart[] {
    const parts: OpenCodeMessagePart[] = [];

    for (const message of messages) {
      const content = message.content;

      if (typeof content === "string") {
        parts.push({
          type: "text",
          text: content,
        });
      } else if (Array.isArray(content)) {
        for (const item of content) {
          if (typeof item === "string") {
            parts.push({
              type: "text",
              text: item,
            });
          } else if (item.type === "text") {
            parts.push({
              type: "text",
              text: item.text,
            });
          }
          // Could add support for image_url and other types here
        }
      }
    }

    return parts;
  }

  private async sendPrompt(
    sessionId: string,
    parts: OpenCodeMessagePart[],
  ): Promise<string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      // Build request body with optional parameters
      const body: Record<string, any> = {
        parts,
        model: {
          providerID: this.providerID,
          modelID: this.modelID,
        },
        agent: this.agent,
      };

      // Add optional model parameters if specified
      if (this.temperature !== undefined) {
        body.temperature = this.temperature;
      }
      if (this.maxTokens !== undefined) {
        body.max_tokens = this.maxTokens;
      }

      const response = await fetch(
        `${this.baseUrl}/session/${sessionId}/message`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to send prompt to OpenCode (${response.status}): ${errorBody}`,
        );
      }

      // Parse the response and validate structure
      const data: any = await response.json();
      if (!data || !Array.isArray(data.parts)) {
        throw new Error(
          'Invalid response from OpenCode: missing or invalid "parts" field',
        );
      }

      const responseData = data as OpenCodeMessageResponse;
      const textParts: string[] = [];

      for (const part of responseData.parts) {
        if (part.type === "text" && part.text) {
          textParts.push(part.text);
        }
      }

      // Ensure we got some text content back
      if (textParts.length === 0) {
        throw new Error(
          "OpenCode API returned a response with no text content",
        );
      }

      return textParts.join("");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Request to send prompt timed out after ${this.requestTimeout / 1000} seconds`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async deleteSession(sessionId: string): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.requestTimeout,
      );

      try {
        await fetch(`${this.baseUrl}/session/${sessionId}`, {
          method: "DELETE",
          headers,
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.warn(
            `Session deletion timed out after ${this.requestTimeout / 1000} seconds for session ${sessionId}`,
          );
        } else {
          // Log cleanup errors for monitoring but don't throw
          console.warn(
            `Failed to clean up OpenCode session ${sessionId}:`,
            error,
          );
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Log any outer errors but don't throw
      console.warn(`Error during session cleanup for ${sessionId}:`, error);
    }
  }

  // Deprecated: Kept for backward compatibility, but no longer needed
  async cleanup(): Promise<void> {
    // Sessions are now cleaned up automatically per-execution
  }
}
