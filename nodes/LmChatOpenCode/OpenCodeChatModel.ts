import {
  BaseChatModel,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
  AIMessageChunk,
  BaseMessage,
  AIMessage,
} from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";

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

interface OpenCodeEvent {
  type: string;
  properties?: {
    part?: OpenCodeMessagePart;
    info?: {
      status?: string;
      cost?: number;
    };
    text?: string;
  };
}

export class OpenCodeChatModel extends BaseChatModel {
  baseUrl = "http://localhost:4096";
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

  async _generate(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    // Create fresh session for this execution
    const sessionId = await this.createSession();

    try {
      // Convert messages to OpenCode prompt format
      const promptParts = this.convertMessagesToPromptParts(messages);

      // Send prompt to OpenCode
      await this.sendPrompt(sessionId, promptParts);

      // Collect response from event stream
      const responseText = await this.collectResponse(sessionId, runManager);

      return {
        generations: [
          {
            text: responseText,
            message: new AIMessage(responseText),
          },
        ],
      };
    } finally {
      // Clean up session after execution
      await this.deleteSession(sessionId);
    }
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    // Create fresh session for this execution
    const sessionId = await this.createSession();

    try {
      // Convert messages to OpenCode prompt format
      const promptParts = this.convertMessagesToPromptParts(messages);

      // Send prompt to OpenCode
      await this.sendPrompt(sessionId, promptParts);

      // Stream response from event stream
      yield* this.streamResponse(sessionId, runManager);
    } finally {
      // Clean up session after execution
      await this.deleteSession(sessionId);
    }
  }

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

      const session = (await response.json()) as OpenCodeSession;
      return session.id;
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
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(
        `${this.baseUrl}/session/${sessionId}/prompt`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ parts }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to send prompt to OpenCode (${response.status}): ${errorBody}`,
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async collectResponse(
    sessionId: string,
    runManager?: CallbackManagerForLLMRun,
  ): Promise<string> {
    const chunks: string[] = [];

    for await (const chunk of this.streamResponse(sessionId, runManager)) {
      if (chunk.text) {
        chunks.push(chunk.text);
      }
    }

    return chunks.join("");
  }

  private async *streamResponse(
    _sessionId: string,
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    // Note: No timeout for SSE stream as it's expected to be long-lived
    const response = await fetch(`${this.baseUrl}/event`, {
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to connect to OpenCode event stream (${response.status}): ${errorBody}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return;
            }

            try {
              const event: OpenCodeEvent = JSON.parse(data);

              // Handle message.part.updated events
              if (
                event.type === "message.part.updated" &&
                event.properties?.part
              ) {
                const part = event.properties.part;

                if (part.type === "text" && part.text) {
                  const chunk = new ChatGenerationChunk({
                    text: part.text,
                    message: new AIMessageChunk(part.text),
                  });

                  yield chunk;

                  await runManager?.handleLLMNewToken(part.text);
                }
              }

              // Handle session.updated to detect completion
              if (
                event.type === "session.updated" &&
                event.properties?.info?.status === "completed"
              ) {
                return;
              }
            } catch (error) {
              // Log malformed SSE data for debugging
              console.warn(`Skipping malformed SSE data: "${data}"`, error);
              continue;
            }
          }
        }
      }
    } finally {
      // Cancel the stream to prevent resource leaks if consumer stops iterating
      await reader.cancel().catch(() => {
        // Ignore cancellation errors during cleanup
      });
      reader.releaseLock();
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
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Log cleanup errors for monitoring but don't throw
      console.warn(`Failed to clean up OpenCode session ${sessionId}:`, error);
    }
  }

  // Deprecated: Kept for backward compatibility, but no longer needed
  async cleanup(): Promise<void> {
    // Sessions are now cleaned up automatically per-execution
  }
}
