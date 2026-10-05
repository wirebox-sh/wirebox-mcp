import { Wirebox } from "@wirebox-sh/sdk";
import { ServerConfig } from "../config.js";

async function resolveIdentity(client: Wirebox, config: ServerConfig, overrideIdentity?: string) {
  const target = overrideIdentity || config.defaultIdentity;
  if (target) {
    return await client.getIdentity(target);
  }
  const whoami = await client.whoami();
  if (whoami.auth.scoped_identity_id) {
    return await client.getIdentity(whoami.auth.scoped_identity_id);
  }
  const result = await client.listIdentities({ limit: 1 });
  if (result.identities.length > 0 && result.identities[0]) {
    return result.identities[0];
  }
  throw new Error("No agent identity configured. Set WIREBOX_IDENTITY or pass identity parameter.");
}

export async function handleMailSend(
  client: Wirebox,
  config: ServerConfig,
  params: {
    to: string;
    subject: string;
    body: string;
    identity?: string;
  }
) {
  const identity = await resolveIdentity(client, config, params.identity);
  const result = await identity.sendEmail({
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  return {
    success: true,
    messageId: result.message_id,
    mailboxAddress: result.mailbox_address,
    status: result.status,
    to: params.to,
    subject: params.subject,
  };
}

export async function handleMailList(
  client: Wirebox,
  config: ServerConfig,
  params: {
    limit?: number;
    offset?: number;
    status?: "queued" | "sent" | "delivered" | "bounced" | "failed";
    identity?: string;
  }
) {
  const identity = await resolveIdentity(client, config, params.identity);
  const result = await identity.listMessages({
    limit: params.limit,
    offset: params.offset,
    status: params.status,
  });

  return {
    mailbox: identity.mailbox?.email_address,
    messages: result.messages,
    pagination: {
      total: result.total,
    },
  };
}

export async function handleMailGet(
  client: Wirebox,
  config: ServerConfig,
  params: {
    messageId: string;
    identity?: string;
  }
) {
  const identity = await resolveIdentity(client, config, params.identity);
  const message = await identity.getMessage(params.messageId);

  return {
    id: message.id,
    mailboxId: message.mailbox_id,
    direction: message.direction,
    status: message.status,
    from: message.from_address,
    to: message.to_addresses,
    cc: message.cc_addresses,
    bcc: message.bcc_addresses,
    replyTo: message.reply_to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments,
    createdAt: message.created_at,
  };
}

export async function handleMailReply(
  client: Wirebox,
  config: ServerConfig,
  params: {
    messageId: string;
    body: string;
    html?: string;
    to?: string;
    cc?: string;
    bcc?: string;
    identity?: string;
  }
) {
  const identity = await resolveIdentity(client, config, params.identity);
  const result = await identity.replyEmail(params.messageId, {
    text: params.body,
    html: params.html,
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
  });

  return {
    success: true,
    messageId: result.message_id,
    mailboxAddress: result.mailbox_address,
    status: result.status,
  };
}

export async function handleMailDelete(
  client: Wirebox,
  config: ServerConfig,
  params: {
    messageId: string;
    identity?: string;
  }
) {
  const identity = await resolveIdentity(client, config, params.identity);
  const result = await identity.deleteMessage(params.messageId);

  return {
    success: result.deleted,
    messageId: result.message_id,
  };
}
