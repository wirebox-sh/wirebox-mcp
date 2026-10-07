import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, loadConfig, ServerConfig } from "./config.js";
import { handleWhoami } from "./tools/whoami.js";
import {
  handleImessageSend,
  handleImessageListConversations,
  handleImessageGetMessages,
} from "./tools/imessage.js";
import {
  handleMailSend,
  handleMailList,
  handleMailSearch,
  handleMailGet,
  handleMailReply,
  handleMailDelete,
} from "./tools/mail.js";
import { MCP_VERSION } from "./version.js";

/**
 * The `identity` parameter, unless the host has pinned the identity — in which
 * case the model never sees the knob at all.
 */
function identityParam(config: ServerConfig): Record<string, z.ZodTypeAny> {
  if (config.lockIdentity) return {};
  return {
    identity: z
      .string()
      .optional()
      .describe("Agent identity handle or ID to act as. Defaults to WIREBOX_IDENTITY."),
  };
}

/** The identity a call acts as; a pinned identity overrides what was asked for. */
function resolveIdentity(config: ServerConfig, requested?: string): string | undefined {
  if (config.lockIdentity) return config.defaultIdentity;
  return requested || config.defaultIdentity;
}

export function createServer(customConfig?: Partial<ServerConfig>) {
  const config = { ...loadConfig(), ...customConfig };

  const server = new McpServer({
    name: "@wirebox-sh/mcp",
    version: MCP_VERSION,
  });

  // 1. Identity Whoami
  server.tool(
    "wirebox_whoami",
    "Show this agent's Wirebox identity (handle, email address, display name) and iMessage router connection status.",
    {},
    async () => {
      const client = getClient(config);
      const result = await handleWhoami(client, config);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 2. iMessage Send
  server.tool(
    "wirebox_imessage_send",
    "Send an iMessage. Reply into an existing conversation via conversationId, or start a message to a recipient E.164 phone number / Apple ID email.",
    {
      text: z.string().describe("Message text content to send."),
      to: z
        .string()
        .optional()
        .describe("Recipient phone number (E.164 format) or Apple ID email. Optional if conversationId is provided."),
      conversationId: z
        .string()
        .optional()
        .describe("Existing iMessage conversation ID. Optional if recipient 'to' is provided."),
      ...identityParam(config),
    },
    async (params: {
      text: string;
      to?: string;
      conversationId?: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleImessageSend(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 3. iMessage List Conversations
  server.tool(
    "wirebox_imessage_list_conversations",
    "List active iMessage conversations for this agent, including participants, last message timestamp, and unread count.",
    {
      limit: z.number().optional().describe("Maximum number of conversations to return (default 20)."),
      cursor: z.string().optional().describe("Pagination cursor for next page."),
      ...identityParam(config),
    },
    async (params: {
      limit?: number;
      cursor?: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleImessageListConversations(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 4. iMessage Get Messages
  server.tool(
    "wirebox_imessage_get_messages",
    "Fetch message history for a specific iMessage conversation.",
    {
      conversationId: z.string().describe("iMessage conversation ID."),
      limit: z.number().optional().describe("Maximum number of messages to return (default 50)."),
      cursor: z.string().optional().describe("Pagination cursor for next page."),
      ...identityParam(config),
    },
    async (params: {
      conversationId: string;
      limit?: number;
      cursor?: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleImessageGetMessages(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 5. Mail Send
  server.tool(
    "wirebox_mail_send",
    "Send an email message from this agent's Wirebox mailbox.",
    {
      to: z.string().describe("Recipient email address."),
      subject: z.string().describe("Email subject line."),
      body: z.string().describe("Email plain text or HTML body content."),
      ...identityParam(config),
    },
    async (params: {
      to: string;
      subject: string;
      body: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleMailSend(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 6. Mail List
  server.tool(
    "wirebox_mail_list",
    "List email messages in this agent's mailbox.",
    {
      limit: z.number().optional().describe("Maximum number of messages to return (default 50)."),
      offset: z.number().optional().describe("Pagination offset."),
      status: z
        .enum(["queued", "sent", "delivered", "bounced", "failed"])
        .optional()
        .describe("Filter by message status."),
      ...identityParam(config),
    },
    async (params: {
      limit?: number;
      offset?: number;
      status?: "queued" | "sent" | "delivered" | "bounced" | "failed";
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleMailList(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
 
  // 7. Mail Search
  server.tool(
    "wirebox_mail_search",
    "Full-text search across email messages in this agent's mailbox by query, ranked by relevance. Matches subject, body, sender, and snippet.",
    {
      query: z.string().describe("Full-text search query."),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of matches to return (1-100, default 50)."),
      ...identityParam(config),
    },
    async (params: { query: string; limit?: number; identity?: string }) => {
      const client = getClient(config);
      const result = await handleMailSearch(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 8. Mail Get
  server.tool(
    "wirebox_mail_get",
    "Get the full content of an email message (subject, headers, text body, HTML, attachments).",
    {
      messageId: z.string().describe("ID of the email message to retrieve."),
      ...identityParam(config),
    },
    async (params: { messageId: string; identity?: string }) => {
      const client = getClient(config);
      const result = await handleMailGet(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 9. Mail Reply
  server.tool(
    "wirebox_mail_reply",
    "Reply to an existing email message, preserving thread context and RFC headers.",
    {
      messageId: z.string().describe("ID of the message to reply to."),
      body: z.string().describe("Plain text response body."),
      html: z.string().optional().describe("Optional HTML formatted body."),
      to: z.string().optional().describe("Override recipient email (defaults to original sender)."),
      cc: z.string().optional().describe("Optional CC recipient email address."),
      bcc: z.string().optional().describe("Optional BCC recipient email address."),
      ...identityParam(config),
    },
    async (params: {
      messageId: string;
      body: string;
      html?: string;
      to?: string;
      cc?: string;
      bcc?: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleMailReply(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // 10. Mail Delete
  server.tool(
    "wirebox_mail_delete",
    "Permanently delete an email message from the mailbox.",
    {
      messageId: z.string().describe("ID of the email message to delete."),
      ...identityParam(config),
    },
    async (params: { messageId: string; identity?: string }) => {
      const client = getClient(config);
      const result = await handleMailDelete(client, config, {
        ...params,
        identity: resolveIdentity(config, params.identity),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return { server, config };
}
