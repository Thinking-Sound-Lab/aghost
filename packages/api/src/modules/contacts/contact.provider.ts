import type { ContactPage } from "../../contract/contact"

export type ContactPageRequest = {
  search: string
  offset: number
  limit: number
}

/** The service that keeps the people the accounts have messaged with. */
export interface ContactProvider {
  /** The profile's Instagram contacts that match the search. */
  listContacts(
    providerProfileId: string,
    page: ContactPageRequest
  ): Promise<ContactPage>
}
