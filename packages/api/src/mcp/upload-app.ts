import { readFileSync } from "node:fs"
import type { McpServer } from "@modelcontextprotocol/server"
import { MEDIA_CONTENT_TYPES, POST_LIMITS } from "../contract/post"
import type { AGENT_OPERATIONS } from "../modules/agents/operations"

// An MCP Apps view (io.modelcontextprotocol/ui): apps that support them show
// it with create_upload_link's result, so the owner uploads inside the chat.
// It runs in the app's sandboxed frame, calls tools through the app, and
// sends each file's bytes from the owner's browser straight to storage.
const UPLOAD_APP_URI = "ui://aghost/upload"
const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app"

type ToolUi = { resourceUri?: string; visibility?: ("model" | "app")[] }

/** MCP Apps metadata of the tools behind the upload box; other tools have none. */
export const TOOL_UI: Partial<
  Record<(typeof AGENT_OPERATIONS)[number]["name"], ToolUi>
> = {
  create_upload_link: { resourceUri: UPLOAD_APP_URI },
  // Agents read the files with get_upload_link instead.
  complete_upload_link: { visibility: ["app"] },
}

const limits = {
  maxItems: POST_LIMITS.maxMediaItems,
  types: MEDIA_CONTENT_TYPES,
  maxBytes: {
    image: POST_LIMITS.imageMaxBytes,
    video: POST_LIMITS.videoMaxBytes,
  },
}

const html = readFileSync(
  new URL("./upload-app.html", import.meta.url),
  "utf8"
).replace("{{LIMITS}}", () => JSON.stringify(limits).replaceAll("<", "\\u003c"))

/** Serves the upload box, which may upload only to `uploadOrigin`. */
export function registerUploadApp(server: McpServer, uploadOrigin: string) {
  server.registerResource(
    "Upload box",
    UPLOAD_APP_URI,
    {
      description: "Upload photos and videos for a post from this device",
      mimeType: MCP_APP_MIME_TYPE,
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: MCP_APP_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              csp: { connectDomains: [uploadOrigin] },
              prefersBorder: true,
            },
          },
        },
      ],
    })
  )
}
