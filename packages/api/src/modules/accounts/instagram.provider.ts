import type { InstagramPost } from "../../contract/account"
import type { ProviderAccount } from "./account"

export interface InstagramProvider {
  /**
   * URL where the user authorizes connecting an Instagram account to the
   * profile. With `reconnectAccountId`, the user authorizes that account again.
   */
  getConnectUrl(
    providerProfileId: string,
    redirectUrl: string,
    reconnectAccountId: string | null
  ): Promise<string>
  listAccounts(providerProfileId: string): Promise<ProviderAccount[]>
  listRecentPosts(providerAccountId: string): Promise<InstagramPost[]>
  /** Removes the account from the provider. Succeeds when it is already gone. */
  disconnectAccount(providerAccountId: string): Promise<void>
}
