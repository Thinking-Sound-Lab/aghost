import type { FastifyReply, FastifyRequest } from "fastify"
import type { AuthenticateAgent } from "./context"
import { InvalidApiKeyError } from "../shared/errors"

/**
 * REST and MCP each authenticate every request with the same key policy. A
 * valid key works only while its workspace has a plan.
 */
export function requireApiKey(authenticate: AuthenticateAgent) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? "")
    try {
      if (!match?.[1]) throw new InvalidApiKeyError()
      request.agentIdentity = await authenticate(match[1])
    } catch (error) {
      reply.header("WWW-Authenticate", 'Bearer realm="aghost"')
      throw error
    }
    const { services, workspace } = request.agentIdentity
    await services.plans.assertCanUseWorkspace(workspace)
  }
}
