import type {
  ScheduledPostRange,
  ScheduledPostStatus,
} from "../../contract/post"
import type {
  NewScheduledPost,
  PostContent,
  PublishingState,
  ScheduledPostRecord,
} from "./post"

export interface ScheduledPostRepository {
  /** Posts scheduled within the range, earliest first. */
  listByRange(
    workspaceId: string,
    range: ScheduledPostRange
  ): Promise<ScheduledPostRecord[]>
  listByAccount(
    workspaceId: string,
    accountId: string
  ): Promise<ScheduledPostRecord[]>
  /** Posts still waiting for their time. */
  listScheduled(workspaceId: string): Promise<ScheduledPostRecord[]>
  findById(workspaceId: string, id: string): Promise<ScheduledPostRecord | null>
  insert(post: NewScheduledPost): Promise<ScheduledPostRecord>
  updateContent(
    workspaceId: string,
    id: string,
    content: PostContent
  ): Promise<ScheduledPostRecord>
  /**
   * Stores the provider's state unless the stored status is no longer `from`,
   * because another request recorded the change first. Returns whether it did.
   */
  updateState(
    workspaceId: string,
    id: string,
    from: ScheduledPostStatus,
    state: PublishingState
  ): Promise<boolean>
  delete(workspaceId: string, id: string): Promise<void>
}
