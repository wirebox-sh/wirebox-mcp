import { Wirebox } from "@wirebox-sh/sdk";

export interface ServerConfig {
  apiKey: string;
  baseUrl?: string;
  defaultIdentity?: string;
  mode?: "remote" | "local" | "auto";
  mcpUrl?: string;
  /**
   * Pins every tool call to `defaultIdentity` and hides the `identity`
   * parameter from the model.
   *
   * Meant for hosts that answer strangers — a messaging bridge, say — where
   * which identity the agent speaks as is the host's decision, not something a
   * message should be able to steer. An identity-scoped API key enforces the
   * same thing server-side; this closes the gap for organization-wide keys.
   */
  lockIdentity?: boolean;
}

export function loadConfig(): ServerConfig {
  const apiKey = process.env.WIREBOX_API_KEY || "";
  const baseUrl = process.env.WIREBOX_BASE_URL || undefined;
  const defaultIdentity = process.env.WIREBOX_IDENTITY || undefined;
  const mode = (process.env.WIREBOX_MCP_MODE as any) || "auto";
  const lockIdentity = /^(1|true|yes)$/i.test(process.env.WIREBOX_IDENTITY_LOCKED || "");
  const mcpUrl =
    process.env.WIREBOX_MCP_URL ||
    (baseUrl
      ? `${baseUrl.replace(/\/+$/, "")}/api/v1/mcp`
      : "https://api.wirebox.sh/api/v1/mcp");

  return {
    apiKey,
    baseUrl,
    defaultIdentity,
    mode,
    mcpUrl,
    lockIdentity,
  };
}

export function getClient(config: ServerConfig): Wirebox {
  // Passing an empty key lets the SDK's own credential resolver run its full
  // hierarchy (explicit key -> WIREBOX_API_KEY -> ~/.wirebox/credentials).
  return new Wirebox({
    apiKey: config.apiKey || undefined,
    baseUrl: config.baseUrl,
  });
}
