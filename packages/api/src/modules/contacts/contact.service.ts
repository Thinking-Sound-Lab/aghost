import {
  CONTACT_PAGE_SIZE,
  type ContactPage,
  type ContactPageQuery,
} from "../../contract/contact"
import type { SocialSetRecord } from "../social-sets/social-set"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { ContactProvider } from "./contact.provider"

/** Finds the social set whose contacts are listed. */
export interface ContactSocialSets {
  resolve(
    workspace: WorkspaceRecord,
    id: string | undefined
  ): Promise<SocialSetRecord>
}

export class ContactService {
  constructor(
    private readonly provider: ContactProvider,
    private readonly sets: ContactSocialSets
  ) {}

  async list(
    workspace: WorkspaceRecord,
    query: ContactPageQuery
  ): Promise<ContactPage> {
    const set = await this.sets.resolve(workspace, query.socialSetId)
    // Without a provider profile the set has never connected an account, so
    // it has messaged no one.
    if (!set.providerProfileId) {
      return { contacts: [], total: 0, hasMore: false }
    }

    return this.provider.listContacts(set.providerProfileId, {
      search: query.search,
      offset: query.offset,
      limit: CONTACT_PAGE_SIZE,
    })
  }
}
