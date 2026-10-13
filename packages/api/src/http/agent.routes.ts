import type { FastifyInstance } from "fastify"
import type { AuthenticateAgent } from "./context"
import { AGENT_REST_ROUTES } from "./agent.rest"
import { requireApiKey } from "./agent-auth"
import { agentOpenApi } from "./agent.openapi"

export function agentRoutes(authenticate: AuthenticateAgent) {
  return async (app: FastifyInstance) => {
    app.addHook("onRequest", requireApiKey(authenticate, "api", null))

    app.get("/openapi.json", { config: { agent: true } }, agentOpenApi)

    for (const route of AGENT_REST_ROUTES) {
      app.route({
        method: route.method,
        url: route.path,
        config: { agent: true },
        handler: async (request, reply) => {
          const result = await route.operation.execute(
            request.agentIdentity,
            () => route.requestInput(request)
          )
          if (route.status === 204) return reply.code(204).send()
          return reply.code(route.status ?? 200).send(result)
        },
      })
    }
  }
}
