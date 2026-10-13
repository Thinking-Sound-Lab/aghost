import { z } from "zod"

export const WORKSPACE_NAME_MAX_LENGTH = 80

export const renameWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a workspace name")
    .max(
      WORKSPACE_NAME_MAX_LENGTH,
      `Use ${WORKSPACE_NAME_MAX_LENGTH} characters or fewer`
    ),
})

export type Workspace = {
  id: string
  name: string
}
