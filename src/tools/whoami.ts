import { Wirebox } from "@wirebox-sh/sdk";
import { ServerConfig } from "../config.js";

export async function handleWhoami(client: Wirebox, config: ServerConfig) {
  try {
    const whoami = await client.whoami();
    let identityDetails: Record<string, unknown> | null = null;

    const targetHandleOrId = config.defaultIdentity || whoami.auth.scoped_identity_id;
    if (targetHandleOrId) {
      try {
        const identity = await client.getIdentity(targetHandleOrId);
        identityDetails = {
          id: identity.id,
          handle: identity.agent_handle,
          displayName: identity.display_name,
          status: identity.status,
          email: identity.mailbox?.email_address || null,
        };
      } catch {
        // Fallback if specific identity cannot be fetched
      }
    }

    let routerStatus: Record<string, unknown> | null = null;
    try {
      const router = await client.imessage.getRouter();
      routerStatus = {
        connected: router.status === "online",
        routerNumber: router.router_number,
        connectCommand: router.connect_command,
        qrAvailable: Boolean(router.qr_uri),
      };
    } catch {
      // Router might not be provisioned yet
    }

    return {
      authenticated: true,
      organization: {
        name: whoami.organization.name,
        slug: whoami.organization.slug,
        plan: whoami.organization.billing_plan,
      },
      identity: identityDetails,
      imessage: routerStatus,
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
