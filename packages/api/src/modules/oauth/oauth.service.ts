import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import {
  checkResourceAllowed,
  OAuthError,
  OAuthErrorCode,
  type OAuthClientInformationFull,
  type OAuthTokens,
} from "@modelcontextprotocol/server"
import { z } from "zod"
import { API_KEY_NAME_MAX_LENGTH, API_KEY_SCOPES } from "../../contract/api-key"
import type {
  AuthorizationDecision,
  AuthorizationRequest,
} from "../../contract/oauth"
import { AuthorizationExpiredError } from "../../shared/errors"
import type { ApiKeyService } from "../api-keys/api-key.service"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { WorkspaceRepository } from "../workspaces/workspace.repository"
import {
  InvalidAuthorizationRequestError,
  type OAuthClientRecord,
  type OAuthEndpoints,
} from "./oauth"
import type { OAuthRepository } from "./oauth.repository"

const CONSENT_LIFETIME_MS = 10 * 60_000
const CODE_LIFETIME_MS = 5 * 60_000
const STATE_MAX_LENGTH = 2000
const UNNAMED_CLIENT = "MCP client"
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])
// Schemes a browser must never be sent to with a code.
const UNSAFE_SCHEMES = new Set([
  "http:",
  "javascript:",
  "data:",
  "file:",
  "vbscript:",
  "about:",
  "blob:",
  "ws:",
  "wss:",
  "ftp:",
])
// Postgres cannot store NUL, and no name or state needs control characters.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Base64url of a SHA-256 digest (RFC 7636).
const CODE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/
const CODE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/

export const TOKEN_ENDPOINT_AUTH_METHODS = [
  "none",
  "client_secret_post",
  "client_secret_basic",
] as const

const registrationSchema = z.object({
  redirect_uris: z.array(z.string()).min(1).max(10),
  client_name: z
    .string()
    .refine(
      (name) => !CONTROL_CHARACTERS.test(name),
      "Remove control characters."
    )
    .optional(),
  // RFC 7591's default, for a client that does not say.
  token_endpoint_auth_method: z
    .enum(TOKEN_ENDPOINT_AUTH_METHODS)
    .default("client_secret_basic"),
  grant_types: z.array(z.string()).default(["authorization_code"]),
  response_types: z.array(z.string()).default(["code"]),
})

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function sameHash(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
}

function isLoopback(url: URL): boolean {
  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)
}

/** https, http on this computer, or an app's own scheme; never a fragment. */
function isAllowedRedirectUri(value: string): boolean {
  if (
    value.length > 2000 ||
    /[\s#]/.test(value) ||
    CONTROL_CHARACTERS.test(value)
  )
    return false
  const url = URL.parse(value)
  if (!url) return false
  return isLoopback(url) || !UNSAFE_SCHEMES.has(url.protocol)
}

/**
 * Registered addresses match exactly, except that an app on this computer may
 * listen on any port (RFC 8252, section 7.3).
 */
function redirectMatches(registered: string, requested: string): boolean {
  if (registered === requested) return true
  const a = new URL(registered)
  const b = new URL(requested)
  return (
    isLoopback(a) &&
    isLoopback(b) &&
    a.hostname === b.hostname &&
    a.pathname === b.pathname &&
    a.search === b.search
  )
}

/** Longer names are shortened to fit an API key name, by code point as Postgres counts. */
function clientName(name: string | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) return UNNAMED_CLIENT
  return [...trimmed].slice(0, API_KEY_NAME_MAX_LENGTH).join("")
}

/** RFC 6749, section 2.3.1: the form-encoded id and secret, in base64. */
function basicCredentials(
  header: string
): { id: string; secret: string } | null {
  const match = /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(header)
  if (!match) return null
  const decoded = Buffer.from(match[1]!, "base64").toString()
  const separator = decoded.indexOf(":")
  if (separator < 0) return null
  try {
    return {
      id: decodeURIComponent(decoded.slice(0, separator)),
      secret: decodeURIComponent(decoded.slice(separator + 1)),
    }
  } catch {
    return null
  }
}

function destinationOf(redirectUri: string): string {
  const url = new URL(redirectUri)
  return url.protocol === "https:" || url.protocol === "http:"
    ? url.host
    : `${url.protocol}//${url.host}`
}

/**
 * The OAuth 2.1 authorization server MCP clients sign in with. The access
 * token a client receives is a full-access workspace API key, named after the
 * client, that the owner can revoke in Settings like any other.
 */
export class OAuthService {
  constructor(
    private readonly repository: OAuthRepository,
    private readonly workspaces: WorkspaceRepository,
    private readonly apiKeys: ApiKeyService,
    private readonly endpoints: OAuthEndpoints
  ) {}

  /** Dynamic client registration (RFC 7591). */
  async register(body: unknown): Promise<OAuthClientInformationFull> {
    const parsed = registrationSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!
      throw new OAuthError(
        issue.path[0] === "redirect_uris"
          ? OAuthErrorCode.InvalidRedirectUri
          : OAuthErrorCode.InvalidClientMetadata,
        `${issue.path.join(".") || "body"}: ${issue.message}`
      )
    }
    const input = parsed.data
    if (!input.redirect_uris.every(isAllowedRedirectUri))
      throw new OAuthError(
        OAuthErrorCode.InvalidRedirectUri,
        "Use https, http on localhost or 127.0.0.1, or an app's own scheme, without a fragment."
      )
    if (
      !input.grant_types.includes("authorization_code") ||
      input.grant_types.some(
        (grant) => !["authorization_code", "refresh_token"].includes(grant)
      )
    )
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        "Only the authorization_code grant is supported."
      )
    if (
      input.response_types.length === 0 ||
      input.response_types.some((type) => type !== "code")
    )
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        "Only the code response type is supported."
      )
    const secret =
      input.token_endpoint_auth_method === "none"
        ? null
        : randomBytes(32).toString("base64url")
    const client = await this.repository.insertClient({
      name: clientName(input.client_name),
      redirectUris: input.redirect_uris,
      secretHash: secret && hash(secret),
    })
    return {
      client_id: client.id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      ...(secret && { client_secret: secret, client_secret_expires_at: 0 }),
      client_name: client.name,
      redirect_uris: client.redirectUris,
      // No refresh tokens: the access token lasts until the owner revokes it.
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: input.token_endpoint_auth_method,
    }
  }

  /**
   * Validates an authorization request. A valid one waits for the owner on the
   * consent page; an invalid one goes back to the app with an error.
   */
  async authorize(
    query: Record<string, unknown>
  ): Promise<{ requestId: string } | { redirectUrl: string }> {
    const { client_id: clientId, redirect_uri: redirectUri } = query
    if (typeof clientId !== "string" || !UUID.test(clientId))
      throw new InvalidAuthorizationRequestError()
    const client = await this.repository.findClient(clientId)
    if (
      !client ||
      typeof redirectUri !== "string" ||
      !isAllowedRedirectUri(redirectUri) ||
      !client.redirectUris.some((uri) => redirectMatches(uri, redirectUri))
    )
      throw new InvalidAuthorizationRequestError()

    const state =
      typeof query.state === "string" &&
      query.state.length <= STATE_MAX_LENGTH &&
      !CONTROL_CHARACTERS.test(query.state)
        ? query.state
        : null
    const fail = (error: OAuthErrorCode, description: string) => ({
      redirectUrl: this.callback(redirectUri, {
        error,
        error_description: description,
        ...(state !== null && { state }),
      }),
    })
    if (query.state !== undefined && state === null)
      return fail(
        OAuthErrorCode.InvalidRequest,
        `Send one state of up to ${STATE_MAX_LENGTH} printable characters.`
      )
    if (query.response_type !== "code")
      return fail(
        OAuthErrorCode.UnsupportedResponseType,
        "Only the code response type is supported."
      )
    if (
      query.code_challenge_method !== "S256" ||
      typeof query.code_challenge !== "string" ||
      !CODE_CHALLENGE.test(query.code_challenge)
    )
      return fail(
        OAuthErrorCode.InvalidRequest,
        "PKCE is required, with an S256 code_challenge."
      )
    if (query.resource !== undefined && !this.allowsResource(query.resource))
      return fail(
        OAuthErrorCode.InvalidTarget,
        `Tokens are only issued for ${this.endpoints.resource}.`
      )

    await this.repository.deleteExpired()
    const request = await this.repository.insertAuthorization({
      clientId,
      redirectUri,
      codeChallenge: query.code_challenge,
      state,
      expiresAt: new Date(Date.now() + CONSENT_LIFETIME_MS).toISOString(),
    })
    return { requestId: request.id }
  }

  /** The request as the consent page shows it to the signed-in owner. */
  async describe(requestId: string): Promise<AuthorizationRequest> {
    const request = await this.repository.findPending(requestId)
    if (!request) throw new AuthorizationExpiredError()
    return {
      id: request.id,
      clientName: request.clientName,
      destination: destinationOf(request.redirectUri),
      local: isLoopback(new URL(request.redirectUri)),
    }
  }

  async approve(
    requestId: string,
    workspace: WorkspaceRecord
  ): Promise<AuthorizationDecision> {
    const code = randomBytes(32).toString("base64url")
    const approved = await this.repository.approve(requestId, {
      workspaceId: workspace.id,
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + CODE_LIFETIME_MS).toISOString(),
    })
    if (!approved) throw new AuthorizationExpiredError()
    return {
      redirectUrl: this.callback(approved.redirectUri, {
        code,
        ...(approved.state !== null && { state: approved.state }),
      }),
    }
  }

  async deny(requestId: string): Promise<AuthorizationDecision> {
    const denied = await this.repository.deny(requestId)
    if (!denied) throw new AuthorizationExpiredError()
    return {
      redirectUrl: this.callback(denied.redirectUri, {
        error: OAuthErrorCode.AccessDenied,
        error_description: "The workspace owner denied access.",
        ...(denied.state !== null && { state: denied.state }),
      }),
    }
  }

  /** The token endpoint: exchanges an approved code for a workspace API key. */
  async exchange(
    params: Record<string, unknown>,
    authorization: string | undefined
  ): Promise<OAuthTokens> {
    const client = await this.authenticateClient(params, authorization)
    if (params.grant_type !== "authorization_code")
      throw new OAuthError(
        OAuthErrorCode.UnsupportedGrantType,
        "Only the authorization_code grant is supported."
      )
    const { code, redirect_uri: redirectUri, code_verifier: verifier } = params
    if (
      typeof code !== "string" ||
      typeof redirectUri !== "string" ||
      typeof verifier !== "string"
    )
      throw new OAuthError(
        OAuthErrorCode.InvalidRequest,
        "Send one code, redirect_uri and code_verifier."
      )
    if (!CODE_VERIFIER.test(verifier))
      throw new OAuthError(
        OAuthErrorCode.InvalidRequest,
        "The code_verifier must be 43 to 128 unreserved characters."
      )
    if (params.resource !== undefined && !this.allowsResource(params.resource))
      throw new OAuthError(
        OAuthErrorCode.InvalidTarget,
        `Tokens are only issued for ${this.endpoints.resource}.`
      )

    // The code is spent by this attempt, whether or not the rest matches.
    const redeemed = await this.repository.redeem(hash(code))
    const workspace =
      redeemed &&
      redeemed.clientId === client.id &&
      redeemed.redirectUri === redirectUri &&
      createHash("sha256").update(verifier).digest("base64url") ===
        redeemed.codeChallenge
        ? await this.workspaces.findById(redeemed.workspaceId)
        : null
    if (!workspace)
      throw new OAuthError(
        OAuthErrorCode.InvalidGrant,
        "The authorization code is invalid, expired or already used."
      )

    const { key, token } = await this.apiKeys.create(workspace, {
      name: client.name,
      scopes: [...API_KEY_SCOPES],
      expiresAt: null,
    })
    return {
      access_token: token,
      token_type: "Bearer",
      scope: key.scopes.join(" "),
    }
  }

  /** client_secret_basic, client_secret_post, or a public client's id. */
  private async authenticateClient(
    params: Record<string, unknown>,
    authorization: string | undefined
  ): Promise<OAuthClientRecord> {
    let id = params.client_id
    let secret = params.client_secret
    if (authorization !== undefined) {
      const credentials = basicCredentials(authorization)
      if (
        !credentials ||
        secret !== undefined ||
        (id !== undefined && id !== credentials.id)
      )
        throw new OAuthError(
          OAuthErrorCode.InvalidClient,
          "Authenticate the client with one method: HTTP Basic or client_secret_post."
        )
      ;({ id, secret } = credentials)
    }
    const client =
      typeof id === "string" && UUID.test(id)
        ? await this.repository.findClient(id)
        : null
    if (!client)
      throw new OAuthError(OAuthErrorCode.InvalidClient, "Unknown client.")
    if (
      client.secretHash !== null &&
      (typeof secret !== "string" || !sameHash(hash(secret), client.secretHash))
    )
      throw new OAuthError(
        OAuthErrorCode.InvalidClient,
        "Client authentication failed."
      )
    return client
  }

  /** RFC 8707: a token may only be requested for the MCP endpoint. */
  private allowsResource(resource: unknown): boolean {
    return (
      typeof resource === "string" &&
      URL.canParse(resource) &&
      checkResourceAllowed({
        requestedResource: resource,
        configuredResource: this.endpoints.resource,
      })
    )
  }

  /** The app's redirect address with the outcome, naming the issuer (RFC 9207). */
  private callback(redirectUri: string, params: Record<string, string>) {
    const url = new URL(redirectUri)
    for (const [name, value] of Object.entries({
      ...params,
      iss: this.endpoints.issuer,
    }))
      url.searchParams.set(name, value)
    return url.toString()
  }
}
