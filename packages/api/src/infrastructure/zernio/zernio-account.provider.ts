import type { SocialAccount } from "@zernio/node"

import type { InstagramPost } from "../../contract/account"
import {
  PLATFORM_RULES,
  PLATFORMS,
  type Platform,
} from "../../contract/platform"
import type { ProviderAccount } from "../../modules/accounts/account"
import type { AccountProvider } from "../../modules/accounts/account.provider"
import { ProviderError } from "../../shared/errors"
import { request, requestDeletion, type ZernioAccess } from "./zernio-client"

// Analytics reads insights and every platform publishes. Only Instagram runs
// comment-to-DM and the inbox, so only it asks for comments and messaging.
const CONNECT_SCOPES: Record<Platform, string> = {
  instagram: "posting,analytics,comments,messaging",
  facebook: "posting,analytics",
  linkedin: "posting,analytics",
  twitter: "posting,analytics",
  threads: "posting,analytics",
  youtube: "posting,analytics",
}

const ACTION = "load the connected accounts"

export class ZernioAccountProvider implements AccountProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  async getConnectUrl(
    platform: Platform,
    providerProfileId: string,
    redirectUrl: string,
    reconnectAccountId: string | null
  ): Promise<string> {
    const action = `start the ${PLATFORM_RULES[platform].name} connection`

    const body = await request(action, () =>
      this.zernio().connect.getConnectUrl({
        throwOnError: true,
        path: { platform },
        query: {
          profileId: providerProfileId,
          redirect_url: redirectUrl,
          scopes: CONNECT_SCOPES[platform],
          ...(reconnectAccountId && { reconnectAccountId }),
        },
      })
    )

    if (!body.authUrl) {
      throw new ProviderError(
        `Couldn't ${action}. The response had no authorization URL.`
      )
    }

    return body.authUrl
  }

  async listAccounts(providerProfileId: string): Promise<ProviderAccount[]> {
    const body = await request(ACTION, () =>
      this.zernio().accounts.listAccounts({
        throwOnError: true,
        query: { profileId: providerProfileId },
      })
    )

    // Zernio ignores a filter it does not recognise and answers with every
    // account in the team. Refuse a response that reaches outside the profile
    // rather than attach another customer's account to this workspace.
    const outsideProfile = body.accounts.some(
      (account) => profileIdOf(account) !== providerProfileId
    )

    if (outsideProfile) {
      throw new ProviderError(
        `Couldn't ${ACTION}. The response included accounts from another profile.`
      )
    }

    // Accounts Zernio made as a side effect, such as for ads, are not enabled
    // for posting, and other platforms are not offered here.
    return body.accounts.flatMap((account) =>
      isSupported(account.platform) && account.enabled !== false
        ? [toProviderAccount(account, account.platform)]
        : []
    )
  }

  async listRecentPosts(providerAccountId: string): Promise<InstagramPost[]> {
    const body = await request("load recent posts", () =>
      this.zernio().accounts.getAccountPosts({
        throwOnError: true,
        path: { accountId: providerAccountId },
      })
    )

    // `posts` is optional in the API: an account without posts omits it.
    if (!body.posts) {
      return []
    }

    return body.posts.map((post) => {
      if (!post.id) {
        throw new ProviderError(
          "Couldn't load recent posts. A post in the response had no id."
        )
      }

      return {
        platformPostId: post.id,
        caption: post.message ? post.message : null,
        permalink: post.permalink ?? null,
        thumbnailUrl: post.picture ?? null,
        mediaType: post.mediaType ?? null,
        publishedAt: post.createdTime ?? null,
        commentCount: post.commentCount ?? null,
        likeCount: post.likeCount ?? null,
      }
    })
  }

  disconnectAccount(providerAccountId: string): Promise<void> {
    return requestDeletion("disconnect the account", () =>
      this.zernio().accounts.deleteAccount({
        throwOnError: true,
        path: { accountId: providerAccountId },
      })
    )
  }
}

function isSupported(platform: string): platform is Platform {
  return (PLATFORMS as readonly string[]).includes(platform)
}

function profileIdOf(account: SocialAccount): string | undefined {
  return typeof account.profileId === "string"
    ? account.profileId
    : account.profileId._id
}

function toProviderAccount(
  account: SocialAccount,
  platform: Platform
): ProviderAccount {
  // Facebook Pages, LinkedIn pages and YouTube channels may have a name and
  // no handle.
  const username = account.username || account.displayName
  if (!username) {
    throw new ProviderError(
      `Couldn't ${ACTION}. A ${PLATFORM_RULES[platform].name} account in the response had no name.`
    )
  }

  return {
    providerAccountId: account._id,
    platform,
    username,
    displayName: account.displayName ?? null,
    profilePictureUrl: account.profilePicture ?? null,
    connected: account.isActive && account.needsReconnection !== true,
  }
}
