import { OpenCodeChatModel } from "../nodes/LmChatOpenCode/OpenCodeChatModel";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Integration tests that require a running OpenCode server
 * Set OPENCODE_BASE_URL environment variable to test against a real server
 * Otherwise, these tests will be skipped
 */

const OPENCODE_BASE_URL =
  process.env.OPENCODE_BASE_URL || "http://localhost:4096";
const RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS === "true";

const describeIntegration = RUN_INTEGRATION_TESTS ? describe : describe.skip;

describeIntegration("OpenCode Integration Tests", () => {
  let model: OpenCodeChatModel;

  beforeAll(async () => {
    // Check if OpenCode server is running
    try {
      const response = await fetch(`${OPENCODE_BASE_URL}/app`);
      if (!response.ok) {
        throw new Error("OpenCode server not responding");
      }
    } catch (error) {
      console.warn("OpenCode server not available, skipping integration tests");
      throw error;
    }
  });

  beforeEach(() => {
    model = new OpenCodeChatModel({
      baseUrl: OPENCODE_BASE_URL,
      providerID: "anthropic",
      modelID: "claude-3-5-sonnet-20241022",
      agent: "build",
    });
  });

  afterEach(async () => {
    await model.cleanup();
  });

  describe("Session Creation", () => {
    it("should successfully create a session", async () => {
      const sessionId = await (model as any).getOrCreateSession();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe("string");
      expect(sessionId.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe("Simple Message Generation", () => {
    it("should generate a response to a simple prompt", async () => {
      const messages = [new HumanMessage('Say "Hello" and nothing else')];

      const result = await model.invoke(messages);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe("string");
      expect((result.content as string).length).toBeGreaterThan(0);
    }, 30000);

    it("should handle code generation requests", async () => {
      const messages = [
        new HumanMessage(
          'Write a simple Python function that returns the string "test". Just the code, no explanation.',
        ),
      ];

      const result = await model.invoke(messages);

      expect(result.content).toBeDefined();
      const content = result.content as string;
      expect(content).toContain("def");
      expect(content).toContain("test");
    }, 30000);
  });

  describe("Streaming", () => {
    it("should stream responses", async () => {
      const messages = [new HumanMessage("Count from 1 to 5")];

      const chunks: string[] = [];
      const stream = await model.stream(messages);

      for await (const chunk of stream) {
        if (chunk.content) {
          chunks.push(chunk.content as string);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullContent = chunks.join("");
      expect(fullContent.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Multiple Requests", () => {
    it("should handle multiple sequential requests", async () => {
      const result1 = await model.invoke([new HumanMessage('Say "First"')]);
      expect(result1.content).toBeDefined();

      const result2 = await model.invoke([new HumanMessage('Say "Second"')]);
      expect(result2.content).toBeDefined();

      const result3 = await model.invoke([new HumanMessage('Say "Third"')]);
      expect(result3.content).toBeDefined();
    }, 60000);
  });

  describe("Different Agents", () => {
    it("should work with chat agent", async () => {
      const chatModel = new OpenCodeChatModel({
        baseUrl: OPENCODE_BASE_URL,
        providerID: "anthropic",
        modelID: "claude-3-5-sonnet-20241022",
        agent: "chat",
      });

      const result = await chatModel.invoke([new HumanMessage("Hello!")]);
      expect(result.content).toBeDefined();

      await chatModel.cleanup();
    }, 30000);
  });

  describe("Error Handling", () => {
    it("should handle invalid model gracefully", async () => {
      const invalidModel = new OpenCodeChatModel({
        baseUrl: OPENCODE_BASE_URL,
        providerID: "invalid-provider" as any,
        modelID: "invalid-model",
        agent: "build",
      });

      await expect(
        invalidModel.invoke([new HumanMessage("Test")]),
      ).rejects.toThrow();

      await invalidModel.cleanup();
    }, 30000);
  });
});

// Manual test helper (not run in CI)
export async function manualTest() {
  console.log("Starting manual OpenCode integration test...");

  const model = new OpenCodeChatModel({
    baseUrl: OPENCODE_BASE_URL,
    providerID: "anthropic",
    modelID: "claude-3-5-sonnet-20241022",
    agent: "build",
  });

  console.log("Sending test message...");
  const result = await model.invoke([
    new HumanMessage("Write a simple hello world function in TypeScript"),
  ]);

  console.log("Response:", result.content);

  await model.cleanup();
  console.log("Test complete!");
}

// Run manual test if called directly
if (require.main === module) {
  manualTest().catch(console.error);
}
