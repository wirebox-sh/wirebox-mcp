import { describe, it, expect } from "vitest";
import { createServer } from "../src/server.js";

describe("@wirebox-sh/mcp", () => {
  it("creates MCP server instance with configured tools", () => {
    const { server, config } = createServer({
      apiKey: "wb_test_dummy",
      defaultIdentity: "test-agent",
    });

    expect(server).toBeDefined();
    expect(config.apiKey).toBe("wb_test_dummy");
    expect(config.defaultIdentity).toBe("test-agent");
  });
});
