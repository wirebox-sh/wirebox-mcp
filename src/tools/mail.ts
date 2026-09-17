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
