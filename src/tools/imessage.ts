import { Wirebox } from "@wirebox-sh/sdk";
import { ServerConfig } from "../config.js";

export async function handleImessageSend(
  client: Wirebox,
  config: ServerConfig,
  params: {
    text: string;
    to?: string;
    conversationId?: string;
    identity?: string;
  }
) {
  const identityId = params.identity || config.defaultIdentity;
  const result = await client.imessage.messages.send({
    text: params.text,
    to: params.to,
    conversation_id: params.conversationId,
    identity_id: identityId,
  });

  return {
    success: true,
    messageId: result.id,
    conversationId: result.conversation_id,
    status: result.status,
  };
}

export async function handleImessageListConversations(
  client: Wirebox,
  config: ServerConfig,
  params: {
    limit?: number;
    cursor?: string;
    identity?: string;
  }
) {
  const identityId = params.identity || config.defaultIdentity;
  const result = await client.imessage.conversations.list({
    limit: params.limit,
    cursor: params.cursor,
    identity_id: identityId,
  });

  return {
    conversations: result.data,
    pagination: {
      next_cursor: result.next_cursor,
      has_more: result.has_more,
    },
  };
}

export async function handleImessageGetMessages(
  client: Wirebox,
  config: ServerConfig,
  params: {
    conversationId: string;
    limit?: number;
    cursor?: string;
    identity?: string;
  }
) {
  const result = await client.imessage.messages.list({
    conversation_id: params.conversationId,
    limit: params.limit,
    cursor: params.cursor,
  });

  return {
    messages: result.data,
    pagination: {
      next_cursor: result.next_cursor,
      has_more: result.has_more,
    },
  };
}
