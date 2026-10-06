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
import { MCP_VERSION } from "./version.js";

/**
 * Creates a stdio-to-Streamable-HTTP bridge that delegates tool discovery
 * and execution to the remote Wirebox MCP server (api.wirebox.sh/api/v1/mcp).
 */
export async function createBridgeServer(
  config: ServerConfig,
  localTransport: Transport,
  /** Overrides the remote connection; tests use it to stand in for the API. */
  transportOverride?: Transport
) {
  const mcpUrl = new URL(config.mcpUrl || "https://api.wirebox.sh/api/v1/mcp");

  const remoteTransport =
    transportOverride ??
    new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "X-API-Key": config.apiKey,
          "User-Agent": `@wirebox-sh/mcp-bridge/${MCP_VERSION}`,
        },
      },
    });

  const server = new Server(
    { name: "@wirebox-sh/mcp", version: MCP_VERSION },
    { capabilities: { tools: { listChanged: true } } }
  );

  const client = new Client({
    name: "@wirebox-sh/mcp-bridge",
    version: MCP_VERSION,
  });

  client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
    server.sendToolListChanged();
  });

  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const listed = await client.listTools(request.params);
    if (!config.lockIdentity) return listed;
    // With the identity pinned, the parameter is not the model's to set, so it
    // does not belong in the schema it is shown.
    return {
      ...listed,
      tools: listed.tools.map((tool) => ({ ...tool, inputSchema: withoutIdentity(tool.inputSchema) })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return client.callTool({
      ...request.params,
      arguments: applyIdentity(config, request.params.arguments),
    });
  });

  await client.connect(remoteTransport);
  await server.connect(localTransport);

  return { server, client };
}

/**
 * Settles which identity a forwarded call acts as.
 *
 * The remote resolves an absent identity from the API key's own scope, so
 * without this the configured `WIREBOX_IDENTITY` would be silently ignored in
 * bridge mode — a call would act as whatever the key happens to default to.
 */
function applyIdentity(
  config: ServerConfig,
  args: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!config.defaultIdentity) return args;
  const supplied = (args ?? {}).identity;
  if (!config.lockIdentity && typeof supplied === "string" && supplied.trim()) {
    return args;
  }
  return { ...(args ?? {}), identity: config.defaultIdentity };
}

/** Drops the `identity` property from a tool's advertised input schema. */
function withoutIdentity(inputSchema: unknown): any {
  const schema = inputSchema as { properties?: Record<string, unknown>; required?: string[] };
  if (!schema?.properties || !("identity" in schema.properties)) return inputSchema;
  const { identity: _removed, ...properties } = schema.properties;
  return {
    ...schema,
    properties,
    ...(schema.required ? { required: schema.required.filter((name) => name !== "identity") } : {}),
  };
}
