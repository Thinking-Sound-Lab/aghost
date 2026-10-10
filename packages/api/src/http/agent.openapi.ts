import { z } from "zod"
import { apiErrorBodySchema } from "../contract/errors"
import { AGENT_OPERATIONS } from "../modules/agents/operations"

/** REST documentation derived from the same schemas the MCP tools validate. */
export function agentOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const operation of AGENT_OPERATIONS) {
    const pathNames = [...operation.path.matchAll(/:([A-Za-z]+)/g)].map(
      (match) => match[1]!
    )
    const path = operation.path.replace(/:([A-Za-z]+)/g, "{$1}")
    const schema = z.toJSONSchema(operation.schema, { io: "input" })
    const properties = schema.properties ?? {}
    const parameters: Record<string, unknown>[] = pathNames.map((name) => ({
      name,
      in: "path",
      required: true,
      schema: properties[name],
    }))
    if (operation.method === "GET") {
      for (const [name, field] of Object.entries(properties)) {
        if (!pathNames.includes(name))
          parameters.push({
            name,
            in: "query",
            required: schema.required?.includes(name) ?? false,
            schema: field,
          })
      }
    }
    const writesBody = ["POST", "PATCH"].includes(operation.method)
    const bodySchema = properties.input ?? {
      ...schema,
      properties: Object.fromEntries(
        Object.entries(properties).filter(([name]) => !pathNames.includes(name))
      ),
      required: schema.required?.filter((name) => !pathNames.includes(name)),
    }
    const status = String(operation.status ?? 200)
    const errorResponse = {
      description:
        "The request failed. See error.code, error.message, and optional error.fields.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ApiError" },
        },
      },
    }
    paths[path] ??= {}
    paths[path]![operation.method.toLowerCase()] = {
      operationId: operation.name,
      description: operation.description,
      "x-required-scope": operation.scope,
      ...(parameters.length > 0 && { parameters }),
      ...(writesBody && {
        requestBody: {
          required: true,
          content: { "application/json": { schema: bodySchema } },
        },
      }),
      responses: {
        [status]: {
          description:
            status === "204"
              ? "Completed without a response body."
              : "The workspace resource or collection.",
        },
        "400": errorResponse,
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
        "409": errorResponse,
        "422": errorResponse,
        "429": errorResponse,
        "500": errorResponse,
        "502": errorResponse,
        "503": errorResponse,
      },
    }
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "aghost Agent API",
      version: "1.0.0",
      description:
        "Workspace-scoped access to Instagram automations, delivery activity, accounts, contacts, and inbox. Create API keys in Settings → API & MCP.",
    },
    servers: [{ url: "/api/v1" }],
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "aghost API key",
        },
      },
      schemas: { ApiError: z.toJSONSchema(apiErrorBodySchema) },
    },
  }
}
