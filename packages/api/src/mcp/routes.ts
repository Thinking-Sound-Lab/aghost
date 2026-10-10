import type { FastifyInstance } from "fastify"
import type { AuthenticateAgent } from "../http/context"
import { requireApiKey } from "../http/agent-auth"
import { serveMcp } from "./server"
import { agentSkill } from "./skill"

export function mcpRoutes(authenticate: AuthenticateAgent, appUrl: string) {
  return async (app: FastifyInstance) => {
    app.get("/mcp/skill.md", (_request, reply) =>
      reply
        .type("text/markdown; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="SKILL.md"')
        .send(agentSkill(appUrl))
    )

    app.register(async (protectedRoutes) => {
      protectedRoutes.addHook("onRequest", requireApiKey(authenticate))
      protectedRoutes.route({
        method: ["POST", "GET", "DELETE"],
        url: "/mcp",
        config: { agent: true },
        handler: serveMcp,
      })
    })
  }
}
