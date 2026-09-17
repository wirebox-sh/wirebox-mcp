import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";
import { createBridgeServer } from "./bridge.js";

async function main() {
  const config = loadConfig();
  const transport = new StdioServerTransport();

  // Explicit local direct mode
  if (config.mode === "local" || process.argv.includes("--local")) {
    const { server } = createServer(config);
    await server.connect(transport);
    return;
  }

  // Remote Streamable HTTP Bridge Mode (AgentMail style)
  try {
    await createBridgeServer(config, transport);
  } catch (err: any) {
    if (config.mode === "remote" || process.argv.includes("--remote")) {
      throw err;
    }
    // In auto mode, fallback to direct local mode
    console.error(
      "Warning: Could not connect to remote Wirebox MCP endpoint, falling back to direct local mode:",
      err?.message || err
    );
    const { server } = createServer(config);
    await server.connect(transport);
  }
}

main().catch((error) => {
  console.error("Fatal error running @wirebox-sh/mcp:", error);
  process.exit(1);
});
