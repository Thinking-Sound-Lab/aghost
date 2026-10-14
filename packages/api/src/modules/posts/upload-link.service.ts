import {
  POST_LIMITS,
  uploadLinkPath,
  type PostMedia,
  type UploadLink,
} from "../../contract/post"
import { ConflictError, NotFoundError } from "../../shared/errors"
import { actorOf, type ProductAnalytics } from "../analytics/analytics"
import type { WorkspaceOwner } from "../workspaces/workspace"
import type { UploadLinkRecord } from "./upload-link"
import type { UploadLinkRepository } from "./upload-link.repository"

const HOUR_MS = 3_600_000
// Zernio deletes uploads that no post uses after a week, so older links
// only point at files that are gone.
const KEEP_MS = 7 * 24 * HOUR_MS

/**
 * Lets an agent that cannot upload files itself ask the owner to upload them
 * in the browser, then read what they uploaded.
 */
export class UploadLinkService {
  constructor(
    private readonly links: UploadLinkRepository,
    private readonly appUrl: string,
    private readonly analytics: ProductAnalytics
  ) {}

  async create(workspace: WorkspaceOwner): Promise<UploadLink> {
    await this.links.deleteCreatedBefore(
      workspace.id,
      new Date(Date.now() - KEEP_MS).toISOString()
    )
    const link = await this.links.insert({
      workspaceId: workspace.id,
      expiresAt: new Date(
        Date.now() + POST_LIMITS.uploadLinkHours * HOUR_MS
      ).toISOString(),
    })
    return this.present(link)
  }

  async get(workspace: WorkspaceOwner, id: string): Promise<UploadLink> {
    return this.present(await this.find(workspace.id, id))
  }

  /** Hands the owner's uploaded files to the agent. A link takes files once. */
  async complete(
    workspace: WorkspaceOwner,
    id: string,
    media: PostMedia[]
  ): Promise<UploadLink> {
    const stored = await this.links.complete(workspace.id, id, media)
    if (stored) {
      this.analytics.capture(actorOf(workspace), {
        name: "upload_link_completed",
        upload_link_id: id,
        media_count: media.length,
        video_count: media.filter((item) => item.type === "video").length,
      })
      return this.present(stored)
    }
    const link = this.present(await this.find(workspace.id, id))
    throw new ConflictError(
      link.status === "uploaded"
        ? "These files were already sent to your agent. Ask it for a new link to send others."
        : "This link has expired. Ask your agent for a new one."
    )
  }

  private async find(
    workspaceId: string,
    id: string
  ): Promise<UploadLinkRecord> {
    const link = await this.links.findById(workspaceId, id)
    if (!link) throw new NotFoundError("Upload link")
    return link
  }

  private present(link: UploadLinkRecord): UploadLink {
    return {
      id: link.id,
      url: new URL(uploadLinkPath(link.id), this.appUrl).toString(),
      status: link.uploadedAt
        ? "uploaded"
        : Date.parse(link.expiresAt) > Date.now()
          ? "waiting"
          : "expired",
      media: link.media ?? [],
      expiresAt: link.expiresAt,
      uploadedAt: link.uploadedAt,
    }
  }
}
