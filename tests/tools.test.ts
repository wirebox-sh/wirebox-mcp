import { describe, it, expect, vi } from "vitest";
import { createServer } from "../src/server.js";
import { handleMailGet, handleMailReply, handleMailDelete, handleMailSearch } from "../src/tools/mail.js";

describe("@wirebox-sh/mcp", () => {
  it("creates MCP server instance with configured tools", () => {
    const { server, config } = createServer({
      apiKey: "wb_test_dummy",
      defaultIdentity: "test-agent",
    });

    expect(server).toBeDefined();
    expect(config.apiKey).toBe("wb_test_dummy");
    expect(config.defaultIdentity).toBe("test-agent");
  });

  describe("mail tools handlers", () => {
    const mockIdentity = {
      getMessage: vi.fn().mockResolvedValue({
        id: "msg_123",
        mailbox_id: "mbx_123",
        direction: "inbound",
        status: "delivered",
        from_address: "alice@example.com",
        to_addresses: ["agent@wireboxmail.com"],
        cc_addresses: [],
        bcc_addresses: [],
        reply_to: null,
        subject: "Hello Agent",
        text: "Can you help me?",
        html: "<p>Can you help me?</p>",
        attachments: [],
        created_at: "2026-10-05T00:00:00Z",
      }),
      replyEmail: vi.fn().mockResolvedValue({
        message_id: "msg_reply_456",
        mailbox_address: "agent@wireboxmail.com",
        status: "sent",
        created_at: "2026-10-05T00:01:00Z",
      }),
      deleteMessage: vi.fn().mockResolvedValue({
        deleted: true,
        message_id: "msg_123",
      }),
      searchMessages: vi.fn().mockResolvedValue({
        messages: [
          {
            id: "msg_123",
            direction: "inbound",
            subject: "Hello Agent",
            from_address: "alice@example.com",
            snippet: "Can you help me?",
            highlight: "Can you <b>help</b> me?",
            created_at: "2026-10-05T00:00:00Z",
          },
        ],
        count: 1,
      }),
    };

    const mockClient = {
      getIdentity: vi.fn().mockResolvedValue(mockIdentity),
    } as any;

    const mockConfig = {
      apiKey: "wb_test",
      defaultIdentity: "test-agent",
      apiBaseUrl: "https://api.wirebox.sh",
    };

    it("handleMailGet retrieves full email content", async () => {
      const result = await handleMailGet(mockClient, mockConfig, {
        messageId: "msg_123",
      });

      expect(mockIdentity.getMessage).toHaveBeenCalledWith("msg_123");
      expect(result.id).toBe("msg_123");
      expect(result.subject).toBe("Hello Agent");
      expect(result.text).toBe("Can you help me?");
      expect(result.from).toBe("alice@example.com");
    });

    it("handleMailReply sends in-thread reply", async () => {
      const result = await handleMailReply(mockClient, mockConfig, {
        messageId: "msg_123",
        body: "Yes, I can help!",
      });

      expect(mockIdentity.replyEmail).toHaveBeenCalledWith("msg_123", {
        text: "Yes, I can help!",
        html: undefined,
        to: undefined,
        cc: undefined,
        bcc: undefined,
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_reply_456");
    });

    it("handleMailDelete deletes message from mailbox", async () => {
      const result = await handleMailDelete(mockClient, mockConfig, {
        messageId: "msg_123",
      });

      expect(mockIdentity.deleteMessage).toHaveBeenCalledWith("msg_123");
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_123");
    });

    it("handleMailSearch returns ranked matches", async () => {
      const result = await handleMailSearch(mockClient, mockConfig, {
        query: "help",
        limit: 5,
      });

      expect(mockIdentity.searchMessages).toHaveBeenCalledWith({ q: "help", limit: 5 });
      expect(result.query).toBe("help");
      expect(result.count).toBe(1);
      expect(result.matches[0].highlight).toContain("help");
    });
  });
});

