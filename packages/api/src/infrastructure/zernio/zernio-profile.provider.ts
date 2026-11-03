import { ZernioApiError } from "@zernio/node"

import type { ProfileProvider } from "../../modules/workspaces/profile.provider"
import { ProviderError } from "../../shared/errors"
import {
  hasStatus,
  requestDeletion,
  toProviderError,
  type ZernioAccess,
} from "./zernio-client"

const ACTION = "set up the social set"

export class ZernioProfileProvider implements ProfileProvider {
  constructor(private readonly zernio: ZernioAccess) {}

  async ensureProfile(name: string): Promise<string> {
    let profileId: string | undefined

    try {
      const { data } = await this.zernio().profiles.createProfile({
        throwOnError: true,
        body: { name },
      })
      profileId = data?.profile?._id
    } catch (error) {
      // Profile names are unique per team. A conflict means the profile was
      // created by an earlier attempt, and Zernio returns its id.
      const existingProfileId = existingProfileIdOf(error)

      if (existingProfileId) {
        return existingProfileId
      }

      throw toProviderError(ACTION, error)
    }

    if (!profileId) {
      throw new ProviderError(
        `Couldn't ${ACTION}. The response had no profile id.`
      )
    }

    return profileId
  }

  deleteProfile(profileId: string): Promise<void> {
    return requestDeletion("delete the social set", () =>
      this.zernio().profiles.deleteProfile({
        throwOnError: true,
        path: { profileId },
      })
    )
  }
}

function existingProfileIdOf(error: unknown): string | null {
  if (!(error instanceof ZernioApiError) || !hasStatus(error, 409)) {
    return null
  }

  const existingProfileId = error.details?.existingProfileId

  return typeof existingProfileId === "string" ? existingProfileId : null
}
