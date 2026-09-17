# @wirebox-sh/mcp

> Official [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for **Wirebox** — Real-world identity and communication layer for autonomous AI agents.

Equip Claude Desktop, Claude Code, Cursor, Windsurf, Zed, Muse, and custom agent harnesses with real-world communication tools: **iMessage (Blue Bubbles)**, **Mailbox (Email)**, and **Agent Identity Management**.

---

## 1. Quickstart

### Option A: Hosted Remote URL (Zero-Install, Recommended for Cursor & Web)

Directly connect via Streamable HTTP — no Node.js or local package installation required:

```json
{
  "mcpServers": {
    "wirebox": {
      "url": "https://api.wirebox.sh/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer wb_live_..."
      }
    }
  }
}
```

*Tip: Cursor also supports appending your key directly to the URL: `https://api.wirebox.sh/api/v1/mcp?apiKey=wb_live_...`*

### Option B: Run via `npx` (Local Stdio Bridge)

```bash
npx -y @wirebox-sh/mcp
```

### Option C: Claude Desktop Configuration (Stdio)

Add the following to your `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "wirebox": {
      "command": "npx",
      "args": ["-y", "@wirebox-sh/mcp"],
      "env": {
        "WIREBOX_API_KEY": "wb_live_...",
        "WIREBOX_IDENTITY": "your-agent-handle"
      }
    }
  }
}
```

### Option D: Cursor / Windsurf (Stdio)

Add to `.cursor/mcp.json` or your Cursor Settings:

```json
{
  "mcpServers": {
    "wirebox": {
      "command": "npx",
      "args": ["-y", "@wirebox-sh/mcp"],
      "env": {
        "WIREBOX_API_KEY": "wb_live_...",
        "WIREBOX_IDENTITY": "your-agent-handle"
      }
    }
  }
}
```

### Option E: Claude Code

```bash
claude mcp add wirebox -- npx -y @wirebox-sh/mcp
```

Or install as a plugin from the repository root:

```bash
/plugin install wirebox
```

---

## 2. Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `WIREBOX_API_KEY` | **Yes** | Your Wirebox secret API key (starts with `wb_live_` or `wb_test_`). Get one at [wirebox.sh/console](https://wirebox.sh). |
| `WIREBOX_IDENTITY` | No | Default agent handle (e.g. `alice`) to scope communication actions. |
| `WIREBOX_BASE_URL` | No | Override the API base URL (defaults to `https://api.wirebox.sh`). |

---

## 3. Available Tools

### Identity Tools

* **`wirebox_whoami`**: Show this agent's Wirebox identity (handle, email address, display name) and iMessage router connection status.

### iMessage Tools

* **`wirebox_imessage_send`**: Send an iMessage (blue bubble). Reply into an existing conversation via `conversationId`, or initiate to an E.164 phone number / Apple ID email.
* **`wirebox_imessage_list_conversations`**: List active iMessage conversations, participant handles, unread counts, and last message timestamps.
* **`wirebox_imessage_get_messages`**: Fetch message history for a specific iMessage conversation.

### Mail Tools

* **`wirebox_mail_send`**: Send an email from the agent's identity mailbox (`to`, `subject`, `body`).
* **`wirebox_mail_list`**: List email messages in the agent's mailbox (`folder`, `limit`, `offset`).

---

## 4. Development & Testing

```bash
# Install dependencies
npm install

# Run test suite
npm test

# Typecheck
npm run typecheck

# Build bundle
npm run build
```

---

## 5. License

MIT © [Wirebox](https://wirebox.sh)
