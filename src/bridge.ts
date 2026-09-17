import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ServerConfig } from "./config.js";

/**
 * Creates a stdio-to-Streamable-HTTP bridge that delegates tool discovery
 * and execution to the remote Wirebox MCP server (api.wirebox.sh/api/v1/mcp).
 */
export async function createBridgeServer(config: ServerConfig, localTransport: Transport) {
  const mcpUrl = new URL(config.mcpUrl || "https://api.wirebox.sh/api/v1/mcp");

  const remoteTransport = new StreamableHTTPClientTransport(mcpUrl, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "X-API-Key": config.apiKey,
        "User-Agent": "@wirebox-sh/mcp-bridge/0.1.0",
      },
    },
  });

  const server = new Server(
    { name: "@wirebox-sh/mcp", version: "0.1.0" },
    { capabilities: { tools: { listChanged: true } } }
  );

  const client = new Client({
    name: "@wirebox-sh/mcp-bridge",
    version: "0.1.0",
  });

  client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
    server.sendToolListChanged();
  });

  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    return client.listTools(request.params);
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return client.callTool(request.params);
  });

  await client.connect(remoteTransport);
  await server.connect(localTransport);

  return { server, client };
}
