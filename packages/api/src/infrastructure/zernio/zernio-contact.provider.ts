import type { ListContactsResponse } from "@zernio/node"

import type { Contact, ContactPage } from "../../contract/contact"
import type {
  ContactPageRequest,
  ContactProvider,
} from "../../modules/contacts/contact.provider"
import { ProviderError } from "../../shared/errors"
import { request, type ZernioAccess } from "./zernio-client"

type ZernioContact = NonNullable<ListContactsResponse["contacts"]>[number]

const ACTION = "load contacts"

export class ZernioContactProvider implements ContactProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  async listContacts(
    providerProfileId: string,
    page: ContactPageRequest
  ): Promise<ContactPage> {
    const body = await request(ACTION, () =>
      this.zernio().contacts.listContacts({
        throwOnError: true,
        query: {
          profileId: providerProfileId,
          platform: "instagram",
          ...(page.search && { search: page.search }),
          limit: page.limit,
          skip: page.offset,
        },
      })
    )

    const total = body.pagination?.total
    const hasMore = body.pagination?.hasMore

    if (!body.contacts || total === undefined || hasMore === undefined) {
      throw new ProviderError(
        `Couldn't ${ACTION}. The response was missing its contacts or page details.`
      )
    }

    return { contacts: body.contacts.map(toContact), total, hasMore }
  }
}

function toContact(contact: ZernioContact): Contact {
  if (!contact.id || !contact.tags) {
    throw new ProviderError(
      `Couldn't ${ACTION}. A contact in the response was incomplete.`
    )
  }

  return {
    id: contact.id,
    name: contact.name ?? null,
    username: contact.displayIdentifier
      ? contact.displayIdentifier.replace(/^@/, "")
      : null,
    avatarUrl: contact.avatarUrl ?? null,
    tags: contact.tags,
    lastMessageAt: latest(
      contact.lastMessageSentAt,
      contact.lastMessageReceivedAt
    ),
    createdAt: contact.createdAt ?? null,
  }
}

/** The later of two timestamps, either of which may be missing. */
function latest(
  first: string | null | undefined,
  second: string | null | undefined
): string | null {
  if (!first || !second) {
    return first || second || null
  }

  return Date.parse(first) >= Date.parse(second) ? first : second
}
