import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "../src/config.js";
import { createServer } from "../src/server.js";
import { createBridgeServer } from "../src/bridge.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

/** Reads a tool's advertised schema straight off the built server. */
async function listedTools(server: any) {
  const handler = server.server._requestHandlers.get("tools/list");
  const result = await handler({ method: "tools/list", params: {} }, {});
  return result.tools as Array<{ name: string; inputSchema: any }>;
}

describe("identity parameter", () => {
  it("is offered when the host has not pinned an identity", async () => {
    const { server } = createServer({ apiKey: "wb_test", defaultIdentity: "agent-a" });
    const send = (await listedTools(server)).find((t) => t.name === "wirebox_imessage_send");
    expect(Object.keys(send!.inputSchema.properties)).toContain("identity");
  });

  it("is hidden from the model when the host pins one", async () => {
    const { server } = createServer({
      apiKey: "wb_test",
      defaultIdentity: "agent-a",
      lockIdentity: true,
    });
    const tools = await listedTools(server);
    for (const tool of tools) {
      expect(Object.keys(tool.inputSchema.properties ?? {})).not.toContain("identity");
    }
  });
});

describe("config", () => {
  beforeEach(() => {
    process.env.WIREBOX_API_KEY = "wb_test";
    process.env.WIREBOX_IDENTITY = "agent-a";
  });

  it("reads the identity lock from the environment", () => {
    expect(loadConfig().lockIdentity).toBe(false);
    process.env.WIREBOX_IDENTITY_LOCKED = "1";
    expect(loadConfig().lockIdentity).toBe(true);
    process.env.WIREBOX_IDENTITY_LOCKED = "true";
    expect(loadConfig().lockIdentity).toBe(true);
    process.env.WIREBOX_IDENTITY_LOCKED = "0";
    expect(loadConfig().lockIdentity).toBe(false);
  });
});

/** A remote that records what the bridge forwarded to it. */
function fakeRemote() {
  const calls: Array<{ name: string; arguments: any }> = [];
  return {
    calls,
    transport: {
      async start() {},
      async close() {},
      async send(message: any) {
        if (!("method" in message)) return;
        let result: any = {};
        if (message.method === "initialize") {
          result = {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "fake-remote", version: "0" },
          };
        } else if (message.method === "tools/list") {
          result = {
            tools: [
              {
                name: "wirebox_imessage_send",
                description: "send",
                inputSchema: {
                  type: "object",
                  properties: { text: { type: "string" }, identity: { type: "string" } },
                  required: ["text"],
                },
              },
            ],
          };
        } else if (message.method === "tools/call") {
          calls.push(message.params);
          result = { content: [{ type: "text", text: "{}" }] };
        }
        queueMicrotask(() =>
          (this as any).onmessage?.({ jsonrpc: "2.0", id: message.id, result })
        );
      },
    } as any,
  };
}

/** A local transport the test can drive the bridge's server through. */
function localPair() {
  const inbound: any = {
    async start() {},
    async close() {},
    async send(message: any) {
      inbound.sent.push(message);
      inbound.waiters.shift()?.(message);
    },
    sent: [] as any[],
    waiters: [] as Array<(m: any) => void>,
  };
  return inbound;
}

async function request(local: any, message: any) {
  const reply = new Promise((resolve) => local.waiters.push(resolve));
  local.onmessage?.(message);
  return reply as Promise<any>;
}

describe("bridge identity forwarding", () => {
  it("applies the configured identity to calls that omit one", async () => {
    const remote = fakeRemote();
    const local = localPair();
    await createBridgeServer(
      { apiKey: "wb_test", defaultIdentity: "agent-a", mcpUrl: "http://x" } as any,
      local,
      remote.transport
    );

    await request(local, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "wirebox_imessage_send", arguments: { text: "hi" } },
    });

    expect(remote.calls[0]?.arguments).toEqual({ text: "hi", identity: "agent-a" });
  });

  it("keeps an explicit identity when the host has not pinned one", async () => {
    const remote = fakeRemote();
    const local = localPair();
    await createBridgeServer(
      { apiKey: "wb_test", defaultIdentity: "agent-a", mcpUrl: "http://x" } as any,
      local,
      remote.transport
    );

    await request(local, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "wirebox_imessage_send", arguments: { text: "hi", identity: "agent-b" } },
    });

    expect(remote.calls[0]?.arguments.identity).toBe("agent-b");
  });

  it("overrides the caller's identity when the host pins one", async () => {
    const remote = fakeRemote();
    const local = localPair();
    await createBridgeServer(
      {
        apiKey: "wb_test",
        defaultIdentity: "agent-a",
        lockIdentity: true,
        mcpUrl: "http://x",
      } as any,
      local,
      remote.transport
    );

    // A message that talked the agent into naming another identity must not
    // change who the send goes out as.
    await request(local, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "wirebox_imessage_send", arguments: { text: "hi", identity: "agent-b" } },
    });

    expect(remote.calls[0]?.arguments.identity).toBe("agent-a");
  });

  it("hides the identity parameter from forwarded schemas when pinned", async () => {
    const remote = fakeRemote();
    const local = localPair();
    await createBridgeServer(
      {
        apiKey: "wb_test",
        defaultIdentity: "agent-a",
        lockIdentity: true,
        mcpUrl: "http://x",
      } as any,
      local,
      remote.transport
    );

    const reply = await request(local, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });

    const properties = reply.result.tools[0].inputSchema.properties;
    expect(Object.keys(properties)).toContain("text");
    expect(Object.keys(properties)).not.toContain("identity");
  });
});
