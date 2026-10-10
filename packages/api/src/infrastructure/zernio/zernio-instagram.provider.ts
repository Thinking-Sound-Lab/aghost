import type { SocialAccount } from "@zernio/node"

import type { InstagramPost } from "../../contract/account"
import type { ProviderAccount } from "../../modules/accounts/account"
import type { InstagramProvider } from "../../modules/accounts/instagram.provider"
import { ProviderError } from "../../shared/errors"
import { request, requestDeletion, type ZernioAccess } from "./zernio-client"

// Comment-to-DM needs to read comments and send messages, nothing else.
const CONNECT_SCOPES = "comments,messaging"

export class ZernioInstagramProvider implements InstagramProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  async getConnectUrl(
    providerProfileId: string,
    redirectUrl: string
  ): Promise<string> {
    const action = "start the Instagram connection"

    const body = await request(action, () =>
      this.zernio().connect.getConnectUrl({
        throwOnError: true,
        path: { platform: "instagram" },
        query: {
          profileId: providerProfileId,
          redirect_url: redirectUrl,
          scopes: CONNECT_SCOPES,
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
    const action = "load the connected Instagram accounts"

    const body = await request(action, () =>
      this.zernio().accounts.listAccounts({
        throwOnError: true,
        query: { profileId: providerProfileId, platform: "instagram" },
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
        `Couldn't ${action}. The response included accounts from another profile.`
      )
    }

    return body.accounts
      .filter((account) => account.platform === "instagram")
      .map(toProviderAccount)
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
    return requestDeletion("disconnect the Instagram account", () =>
      this.zernio().accounts.deleteAccount({
        throwOnError: true,
        path: { accountId: providerAccountId },
      })
    )
  }
}

function profileIdOf(account: SocialAccount): string | undefined {
  return typeof account.profileId === "string"
    ? account.profileId
    : account.profileId._id
}

function toProviderAccount(account: SocialAccount): ProviderAccount {
  if (!account.username) {
    throw new ProviderError(
      "Couldn't load the connected Instagram accounts. An account in the response had no username."
    )
  }

  return {
    providerAccountId: account._id,
    username: account.username,
    displayName: account.displayName ?? null,
    profilePictureUrl: account.profilePicture ?? null,
    connected: account.isActive && account.needsReconnection !== true,
  }
}
