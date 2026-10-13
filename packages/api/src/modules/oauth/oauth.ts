/** An app that registered itself to connect over MCP. */
export type OAuthClientRecord = {
  id: string
  name: string
  redirectUris: string[]
  /** Null for public clients, which prove themselves with PKCE alone. */
  secretHash: string | null
}

export type NewOAuthClient = Omit<OAuthClientRecord, "id">

/** A sign-in in progress, from the app's request until it exchanges the code. */
export type AuthorizationRecord = {
  id: string
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string | null
  /** Set when the owner approves, together with the code. */
  workspaceId: string | null
  expiresAt: string
}

export type NewAuthorization = Omit<AuthorizationRecord, "id" | "workspaceId">

export type PendingAuthorization = AuthorizationRecord & { clientName: string }

export type ApprovedAuthorization = AuthorizationRecord & {
  workspaceId: string
}

/** The addresses of the authorization server and of the MCP endpoint it protects. */
export type OAuthEndpoints = {
  issuer: string
  authorization: string
  token: string
  registration: string
  /** The MCP endpoint: the resource every token is for. */
  resource: string
  /** The MCP endpoint's protected resource metadata (RFC 9728). */
  resourceMetadata: string
}

/** The web app's origin is the issuer, so discovery works from the MCP URL's origin. */
export function oauthEndpoints(appUrl: string): OAuthEndpoints {
  const at = (path: string) => new URL(path, appUrl).toString()
  return {
    issuer: new URL(appUrl).origin,
    authorization: at("/api/oauth/authorize"),
    token: at("/api/oauth/token"),
    registration: at("/api/oauth/register"),
    resource: at("/api/mcp"),
    resourceMetadata: at("/.well-known/oauth-protected-resource/api/mcp"),
  }
}

/**
 * The app's request names no client or return address it registered, so the
 * browser cannot be sent back to it.
 */
export class InvalidAuthorizationRequestError extends Error {
  constructor() {
    super("The authorization request names no registered client and address.")
    this.name = "InvalidAuthorizationRequestError"
  }
}
