import type { FastifyInstance } from "fastify"
import type { AuthenticateAgent } from "./context"
import { AGENT_OPERATIONS } from "../modules/agents/operations"
import { InvalidApiKeyError } from "../shared/errors"
import { serveMcp } from "../mcp/server"
import { agentOpenApi } from "./agent.openapi"

export function agentRoutes(authenticate: AuthenticateAgent) {
  return async (app: FastifyInstance) => {
    app.addHook("onRequest", async (request, reply) => {
      const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? "")
      try {
        if (!match?.[1]) throw new InvalidApiKeyError()
        request.agentIdentity = await authenticate(match[1])
      } catch (error) {
        reply.header("WWW-Authenticate", 'Bearer realm="aghost"')
        throw error
      }
    })

    app.get("/v1/openapi.json", { config: { agent: true } }, agentOpenApi)

    for (const operation of AGENT_OPERATIONS) {
      app.route({
        method: operation.method,
        url: `/v1${operation.path}`,
        config: { agent: true },
        handler: async (request, reply) => {
          const result = await operation.execute(
            request.agentIdentity,
            operation.requestInput(request)
          )
          if (operation.status === 204) return reply.code(204).send()
          return reply.code(operation.status ?? 200).send(result)
        },
      })
    }

    app.route({
      method: ["POST", "GET", "DELETE"],
      url: "/mcp",
      config: { agent: true },
      handler: serveMcp,
    })
  }
}
