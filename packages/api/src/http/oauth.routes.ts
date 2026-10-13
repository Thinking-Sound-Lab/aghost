import {
  OAuthError,
  OAuthErrorCode,
  type OAuthMetadata,
  type OAuthProtectedResourceMetadata,
} from "@modelcontextprotocol/server"
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify"
import { authorizePath } from "../contract/oauth"
import {
  InvalidAuthorizationRequestError,
  type OAuthEndpoints,
} from "../modules/oauth/oauth"
import {
  TOKEN_ENDPOINT_AUTH_METHODS,
  type OAuthService,
} from "../modules/oauth/oauth.service"

type ErrorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => unknown

// The consent page explains a request that cannot be sent back to its app.
const UNRETURNABLE_PATH = "/authorize?error=invalid_request"

// Apps call these from their servers, without cookies.
const fromApps = { config: { oauth: true } }

function statusOf(error: OAuthError): number {
  if (error.code === OAuthErrorCode.InvalidClient) return 401
  if (error.code === OAuthErrorCode.ServerError) return 500
  return 400
}

/** Form-encoded parameters. A repeated one becomes a list, which validation refuses. */
function parseForm(body: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}
  for (const [name, value] of new URLSearchParams(body)) {
    const previous = params[name]
    params[name] = previous === undefined ? value : [previous, value].flat()
  }
  return params
}

/**
 * Discovery documents, at the well-known paths of the web app's origin: the
 * MCP endpoint's protected resource metadata (RFC 9728) and the authorization
 * server's metadata (RFC 8414).
 */
export function oauthDiscoveryRoutes(endpoints: OAuthEndpoints) {
  const authorizationServer: OAuthMetadata = {
    issuer: endpoints.issuer,
    authorization_endpoint: endpoints.authorization,
    token_endpoint: endpoints.token,
    registration_endpoint: endpoints.registration,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [...TOKEN_ENDPOINT_AUTH_METHODS],
    authorization_response_iss_parameter_supported: true,
  }
  const protectedResource: OAuthProtectedResourceMetadata = {
    resource: endpoints.resource,
    authorization_servers: [endpoints.issuer],
    bearer_methods_supported: ["header"],
    resource_name: "aghost",
  }
  return async (app: FastifyInstance) => {
    app.get(
      "/.well-known/oauth-authorization-server",
      async () => authorizationServer
    )
    // Clients look under the MCP endpoint's path first, then at the origin.
    for (const path of [
      "/.well-known/oauth-protected-resource/api/mcp",
      "/.well-known/oauth-protected-resource",
    ])
      app.get(path, async () => protectedResource)
  }
}

/** The authorization server's endpoints, which answer in OAuth's error format. */
export function oauthRoutes(
  service: OAuthService,
  appUrl: string,
  sendError: ErrorHandler
) {
  const page = (path: string) => new URL(path, appUrl).toString()
  return async (app: FastifyInstance) => {
    app.addContentTypeParser(
      "application/x-www-form-urlencoded",
      { parseAs: "string" },
      (_request, body, done) => done(null, parseForm(body as string))
    )
    app.setErrorHandler<FastifyError>((error, request, reply) => {
      if (error instanceof OAuthError) {
        // RFC 6749, section 5.2: a failed HTTP Basic login is challenged.
        if (statusOf(error) === 401 && request.headers.authorization)
          reply.header("WWW-Authenticate", 'Basic realm="aghost"')
        return reply.code(statusOf(error)).send(error.toResponseObject())
      }
      if (error.code?.startsWith("FST_ERR_CTP_"))
        return reply
          .code(400)
          .send(
            new OAuthError(
              OAuthErrorCode.InvalidRequest,
              "Send a form-encoded or JSON body."
            ).toResponseObject()
          )
      return sendError(error, request, reply)
    })

    // The browser comes here from the app and goes on to the consent page.
    app.get<{ Querystring: Record<string, unknown> }>(
      "/authorize",
      async (request, reply) => {
        try {
          const outcome = await service.authorize(request.query)
          return reply.redirect(
            "redirectUrl" in outcome
              ? outcome.redirectUrl
              : page(authorizePath(outcome.requestId))
          )
        } catch (error) {
          if (error instanceof InvalidAuthorizationRequestError)
            return reply.redirect(page(UNRETURNABLE_PATH))
          throw error
        }
      }
    )
    app.post("/register", fromApps, async (request, reply) =>
      reply.code(201).send(await service.register(request.body))
    )
    app.post("/token", fromApps, async (request) =>
      service.exchange(
        typeof request.body === "object" && request.body !== null
          ? (request.body as Record<string, unknown>)
          : {},
        request.headers.authorization
      )
    )
  }
}
