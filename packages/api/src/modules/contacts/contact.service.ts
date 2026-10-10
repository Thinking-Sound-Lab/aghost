import {
  CONTACT_PAGE_SIZE,
  type ContactPage,
  type ContactPageQuery,
} from "../../contract/contact"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { ContactProvider } from "./contact.provider"

export class ContactService {
  constructor(private readonly provider: ContactProvider) {}

  async list(
    workspace: WorkspaceRecord,
    query: ContactPageQuery
  ): Promise<ContactPage> {
    // Without a provider profile the workspace has never connected an account,
    // so it has messaged no one.
    if (!workspace.providerProfileId) {
      return { contacts: [], total: 0, hasMore: false }
    }

    return this.provider.listContacts(workspace.providerProfileId, {
      search: query.search,
      offset: query.offset,
      limit: CONTACT_PAGE_SIZE,
    })
  }
}
