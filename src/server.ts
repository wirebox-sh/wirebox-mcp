import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, loadConfig, ServerConfig } from "./config.js";
import { handleWhoami } from "./tools/whoami.js";
import {
  handleImessageSend,
  handleImessageListConversations,
  handleImessageGetMessages,
} from "./tools/imessage.js";
import { handleMailSend, handleMailList } from "./tools/mail.js";

export function createServer(customConfig?: Partial<ServerConfig>) {
  const config = { ...loadConfig(), ...customConfig };

  const server = new McpServer({
    name: "@wirebox-sh/mcp",
    version: "0.1.0",
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
      identity: z
        .string()
        .optional()
        .describe("Agent identity handle or ID to send from. Defaults to WIREBOX_IDENTITY."),
    },
    async (params: {
      text: string;
      to?: string;
      conversationId?: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleImessageSend(client, config, params);
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
      identity: z.string().optional().describe("Agent identity handle or ID. Defaults to WIREBOX_IDENTITY."),
    },
    async (params: {
      limit?: number;
      cursor?: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleImessageListConversations(client, config, params);
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
      identity: z.string().optional().describe("Agent identity handle or ID. Defaults to WIREBOX_IDENTITY."),
    },
    async (params: {
      conversationId: string;
      limit?: number;
      cursor?: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleImessageGetMessages(client, config, params);
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
      identity: z.string().optional().describe("Agent identity handle or ID. Defaults to WIREBOX_IDENTITY."),
    },
    async (params: {
      to: string;
      subject: string;
      body: string;
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleMailSend(client, config, params);
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
      identity: z.string().optional().describe("Agent identity handle or ID. Defaults to WIREBOX_IDENTITY."),
    },
    async (params: {
      limit?: number;
      offset?: number;
      status?: "queued" | "sent" | "delivered" | "bounced" | "failed";
      identity?: string;
    }) => {
      const client = getClient(config);
      const result = await handleMailList(client, config, params);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return { server, config };
}
