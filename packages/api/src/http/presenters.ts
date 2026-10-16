import type { Automation } from "../contract/automation"
import type { InstagramAccount } from "../contract/account"
import type { ScheduledPost } from "../contract/post"
import type { SessionUser } from "../contract/auth"
import type { User } from "@supabase/supabase-js"
import type { AutomationRecord } from "../modules/automations/automation"
import type { AccountRecord } from "../modules/accounts/account"
import type { ScheduledPostRecord } from "../modules/posts/post"
import type { WorkspaceRecord } from "../modules/workspaces/workspace"

export function presentWorkspace(record: WorkspaceRecord) {
  return { id: record.id, name: record.name }
}

export function presentUser(user: User): SessionUser {
  const metadata = user.user_metadata
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null
  return {
    id: user.id,
    email: user.email ?? "",
    name: text(metadata.full_name) ?? text(metadata.name),
    avatarUrl: text(metadata.avatar_url) ?? text(metadata.picture),
  }
}

export function presentAccount(record: AccountRecord): InstagramAccount {
  const {
    id,
    username,
    displayName,
    profilePictureUrl,
    status,
    disconnectReason,
    createdAt,
  } = record
  return {
    id,
    username,
    displayName,
    profilePictureUrl,
    status,
    disconnectReason,
    createdAt,
  }
}

export function presentAutomation(record: AutomationRecord): Automation {
  const {
    accountId,
    workspaceId: _workspaceId,
    providerAutomationId: _providerId,
    ...config
  } = record
  return { ...config, instagramAccountId: accountId }
}

export function presentScheduledPost(
  record: ScheduledPostRecord
): ScheduledPost {
  const {
    accountId,
    workspaceId: _workspaceId,
    providerPostId: _providerId,
    ...post
  } = record
  return { ...post, instagramAccountId: accountId }
}
