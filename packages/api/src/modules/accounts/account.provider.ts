import type { InstagramPost } from "../../contract/account"
import type { Platform } from "../../contract/platform"
import type { ProviderAccount } from "./account"

/** The service that connects social accounts and acts for them. */
export interface AccountProvider {
  /**
   * URL where the user authorizes connecting an account on the platform to
   * the profile. With `reconnectAccountId`, the user authorizes that account
   * again.
   */
  getConnectUrl(
    platform: Platform,
    providerProfileId: string,
    redirectUrl: string,
    reconnectAccountId: string | null
  ): Promise<string>
  /** The profile's accounts on the platforms the product supports. */
  listAccounts(providerProfileId: string): Promise<ProviderAccount[]>
  listRecentPosts(providerAccountId: string): Promise<InstagramPost[]>
  /** Removes the account from the provider. Succeeds when it is already gone. */
  disconnectAccount(providerAccountId: string): Promise<void>
}
