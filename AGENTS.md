# AGENTS.md

> Guidance and instructions for AI coding agents working on the **@wirebox-sh/mcp** codebase.

---

## 1. Project Overview

**@wirebox-sh/mcp** is the official Model Context Protocol (MCP) server for Wirebox.
It equips autonomous AI agents with real-world communication tools: iMessage, email, and agent identities.

- **Package**: `@wirebox-sh/mcp`
- **Repository**: `https://github.com/wirebox-sh/wirebox-mcp`
- **Runtime**: Node.js 18+ (ESM, stdio transport)
- **Protocol**: Standard Model Context Protocol via `@modelcontextprotocol/sdk`

---

## 2. Essential Commands

| Task | Command | Purpose |
| :--- | :--- | :--- |
| **Build** | `npm run build` | Bundles executable bundle to `dist/index.js` via tsup |
| **Test** | `npm test` | Runs unit tests via Vitest |
| **Typecheck** | `npm run typecheck` | Static TypeScript verification (`tsc --noEmit`) |

---

## 3. Architecture & Conventions

1. **Tool Definitions**: Tools are registered on `McpServer` with Zod input schemas in `src/server.ts`.
2. **SDK Integration**: All actions delegate directly to `@wirebox-sh/sdk`. Avoid raw HTTP fetch calls when SDK methods exist.
3. **Stdio Protocol**: The server operates over standard I/O (`process.stdin` / `process.stdout`). Never print unformatted `console.log` messages to stdout, as it corrupts the JSON-RPC communication stream. Use `console.error` for diagnostic logging.

---

## 4. Release Process

Releases to npm are triggered strictly by creating and publishing a GitHub Release:

```bash
gh release create v<x.y.z> --title "v<x.y.z>" --notes "<release notes>"
```

Authentication is managed via OpenID Connect (OIDC) Trusted Publishing with cryptographic Sigstore provenance. Zero long-lived tokens exist in the repository.
