import type { FastifyInstance } from "fastify"
import type { AuthenticateAgent } from "../http/context"
import { requireApiKey } from "../http/agent-auth"
import { serveMcp } from "./server"

export function mcpRoutes(authenticate: AuthenticateAgent) {
  return async (app: FastifyInstance) => {
    app.addHook("onRequest", requireApiKey(authenticate))
    app.route({
      method: ["POST", "GET", "DELETE"],
      url: "/mcp",
      config: { agent: true },
      handler: serveMcp,
    })
  }
}
