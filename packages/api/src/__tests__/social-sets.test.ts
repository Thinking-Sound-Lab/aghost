import { describe, expect, it, vi } from "vitest"
import type { AccountRecord } from "../modules/accounts/account"
import type { AccountRepository } from "../modules/accounts/account.repository"
import { AccountService } from "../modules/accounts/account.service"
import type { SocialSetRecord } from "../modules/social-sets/social-set"
import { recordingAnalytics } from "./analytics-fixture"

const workspace = { id: "workspace", ownerId: "owner", name: "Studio" }
const set: SocialSetRecord = {
  id: "set",
  workspaceId: workspace.id,
  name: "Social set 1",
  providerProfileId: "profile",
  createdAt: "2026-01-01T00:00:00Z",
}

function instagram(
  id: string,
  status: AccountRecord["status"],
  sharedPlatformBeforeSets: boolean
): AccountRecord {
  return {
    id,
    workspaceId: workspace.id,
    providerAccountId: `remote-${id}`,
    platform: "instagram",
    username: id,
    displayName: null,
    profilePictureUrl: null,
    status,
    disconnectReason: status === "connected" ? null : "Access expired.",
    socialSetId: set.id,
    providerProfileId: set.providerProfileId,
    sharedPlatformBeforeSets,
    createdAt: "2026-01-01T00:00:00Z",
  }
}

function service(accounts: AccountRecord[]) {
  const getConnectUrl = vi.fn(async () => "https://connect.example")
  return {
    getConnectUrl,
    accounts: new AccountService(
      {
        listByWorkspace: async () => accounts,
        findById: async (_workspaceId: string, id: string) =>
          accounts.find((account) => account.id === id) ?? null,
      } as unknown as AccountRepository,
      {
        getConnectUrl,
        listAccounts: async () => [],
        listRecentPosts: async () => [],
        disconnectAccount: async () => {},
      },
      {
        list: async () => [set],
        resolve: async () => set,
        ensureProviderProfile: async () => "profile",
      },
      { deleteAllForAccount: async () => {} },
      { deleteAllForAccount: async () => {} },
      "https://app.example/accounts/callback",
      { assertCanConnectAccount: async () => {} },
      { run: (_workspaceId, work) => work() },
      recordingAnalytics().source("dashboard")
    ),
  }
}

describe("one account per platform in a social set", () => {
  it("refuses to reconnect an account while another holds its platform", async () => {
    const { accounts, getConnectUrl } = service([
      instagram("old", "disconnected", false),
      instagram("current", "connected", false),
    ])
    await expect(
      accounts.startReconnection(workspace, "old")
    ).rejects.toMatchObject({ code: "conflict" })
    expect(getConnectUrl).not.toHaveBeenCalled()
  })

  it("reconnects accounts that shared the platform before sets", async () => {
    const { accounts, getConnectUrl } = service([
      instagram("old", "disconnected", true),
      instagram("current", "connected", true),
    ])
    await expect(accounts.startReconnection(workspace, "old")).resolves.toBe(
      "https://connect.example"
    )
    expect(getConnectUrl).toHaveBeenCalledWith(
      "instagram",
      "profile",
      "https://app.example/accounts/callback",
      null
    )
  })
})
