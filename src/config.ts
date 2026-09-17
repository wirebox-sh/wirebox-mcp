import { Wirebox } from "@wirebox-sh/sdk";

export interface ServerConfig {
  apiKey: string;
  baseUrl?: string;
  defaultIdentity?: string;
}

export function loadConfig(): ServerConfig {
  const apiKey = process.env.WIREBOX_API_KEY || "";
  const baseUrl = process.env.WIREBOX_BASE_URL || undefined;
  const defaultIdentity = process.env.WIREBOX_IDENTITY || undefined;

  return {
    apiKey,
    baseUrl,
    defaultIdentity,
  };
}

export function getClient(config: ServerConfig): Wirebox {
  if (!config.apiKey) {
    throw new Error(
      "WIREBOX_API_KEY is required. Please set the WIREBOX_API_KEY environment variable."
    );
  }

  return new Wirebox({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });
}
