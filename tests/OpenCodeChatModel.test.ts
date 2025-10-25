import { OpenCodeChatModel } from "../nodes/LmChatOpenCode/OpenCodeChatModel";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

describe("OpenCodeChatModel", () => {
  let model: OpenCodeChatModel;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    model = new OpenCodeChatModel({
      baseUrl: "http://localhost:4096",
      providerID: "anthropic",
      modelID: "claude-3-5-sonnet-20241022",
      agent: "build",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with default values", () => {
      expect(model.baseUrl).toBe("http://localhost:4096");
      expect(model.agent).toBe("build");
      expect(model.providerID).toBe("anthropic");
      expect(model.modelID).toBe("claude-3-5-sonnet-20241022");
    });

    it("should accept custom configuration", () => {
      const customModel = new OpenCodeChatModel({
        baseUrl: "http://custom:8080",
        apiKey: "test-key",
        agent: "chat",
        providerID: "openai",
        modelID: "gpt-4",
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(customModel.baseUrl).toBe("http://custom:8080");
      expect(customModel.apiKey).toBe("test-key");
      expect(customModel.agent).toBe("chat");
      expect(customModel.providerID).toBe("openai");
      expect(customModel.modelID).toBe("gpt-4");
      expect(customModel.temperature).toBe(0.5);
      expect(customModel.maxTokens).toBe(1000);
    });

    it("should validate baseUrl", () => {
      expect(() => {
        new OpenCodeChatModel({
          baseUrl: "not-a-url",
          providerID: "anthropic",
          modelID: "claude-3-5-sonnet-20241022",
        });
      }).toThrow("Invalid baseUrl");
    });

    it("should validate providerID", () => {
      expect(() => {
        new OpenCodeChatModel({
          providerID: "",
          modelID: "claude-3-5-sonnet-20241022",
        });
      }).toThrow("providerID is required");
    });

    it("should validate modelID", () => {
      expect(() => {
        new OpenCodeChatModel({
          providerID: "anthropic",
          modelID: "",
        });
      }).toThrow("modelID is required");
    });
  });

  describe("_llmType", () => {
    it('should return "opencode"', () => {
      expect(model._llmType()).toBe("opencode");
    });
  });

  describe("Session Management", () => {
    it("should create a session when needed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "session-123",
          createdAt: "2025-01-01T00:00:00Z",
        }),
      });

      const sessionId = await (model as any).createSession();

      expect(sessionId).toBe("session-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4096/session",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: expect.any(AbortSignal),
          body: JSON.stringify({
            agent: "build",
            model: {
              providerID: "anthropic",
              modelID: "claude-3-5-sonnet-20241022",
            },
          }),
        }),
      );
    });

    it("should create a new session each time", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-123",
            createdAt: "2025-01-01T00:00:00Z",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "session-456",
            createdAt: "2025-01-01T00:00:01Z",
          }),
        });

      const sessionId1 = await (model as any).createSession();
      const sessionId2 = await (model as any).createSession();

      expect(sessionId1).toBe("session-123");
      expect(sessionId2).toBe("session-456");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should include API key in headers when provided", async () => {
      const modelWithKey = new OpenCodeChatModel({
        baseUrl: "http://localhost:4096",
        apiKey: "test-key-123",
        providerID: "anthropic",
        modelID: "claude-3-5-sonnet-20241022",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "session-123" }),
      });

      await (modelWithKey as any).createSession();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-key-123",
          }),
        }),
      );
    });

    it("should throw error on failed session creation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect((model as any).createSession()).rejects.toThrow(
        "Failed to create OpenCode session (500): Internal Server Error",
      );
    });
  });

  describe("Message Conversion", () => {
    it("should convert simple string messages", () => {
      const messages = [new HumanMessage("Hello, world!")];
      const parts = (model as any).convertMessagesToPromptParts(messages);

      expect(parts).toEqual([{ type: "text", text: "Hello, world!" }]);
    });

    it("should convert messages with array content", () => {
      const messages = [
        new HumanMessage({
          content: [
            { type: "text", text: "First part" },
            { type: "text", text: "Second part" },
          ],
        }),
      ];
      const parts = (model as any).convertMessagesToPromptParts(messages);

      expect(parts).toEqual([
        { type: "text", text: "First part" },
        { type: "text", text: "Second part" },
      ]);
    });

    it("should handle multiple messages", () => {
      const messages = [
        new HumanMessage("First message"),
        new AIMessage("Response"),
        new HumanMessage("Follow-up"),
      ];
      const parts = (model as any).convertMessagesToPromptParts(messages);

      expect(parts).toHaveLength(3);
      expect(parts[0].text).toBe("First message");
      expect(parts[1].text).toBe("Response");
      expect(parts[2].text).toBe("Follow-up");
    });
  });

  describe("Prompt Sending", () => {
    it("should send prompt to correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const parts = [{ type: "text", text: "Test prompt" }];
      await (model as any).sendPrompt("session-123", parts);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/session-123/prompt",
        expect.objectContaining({
          method: "POST",
          signal: expect.any(AbortSignal),
          body: JSON.stringify({ parts }),
        }),
      );
    });

    it("should throw error on failed prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(
        (model as any).sendPrompt("session-123", [
          { type: "text", text: "Test" },
        ]),
      ).rejects.toThrow("Failed to send prompt to OpenCode (400): Bad Request");
    });
  });

  describe("Cleanup", () => {
    it("should delete session", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await (model as any).deleteSession("session-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/session-123",
        expect.objectContaining({
          method: "DELETE",
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("should handle cleanup errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        (model as any).deleteSession("session-123"),
      ).resolves.not.toThrow();
    });

    it("should do nothing on cleanup() call (deprecated)", async () => {
      await model.cleanup();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
