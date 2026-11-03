/**
 * The provider groups a customer's connected accounts under a profile. Each
 * social set owns exactly one.
 */
export interface ProfileProvider {
  /**
   * Creates the profile with this name, or returns the existing one when a
   * profile with the same name is already there. Returns the profile id.
   */
  ensureProfile(name: string): Promise<string>
  /** Removes an empty profile. Succeeds when it is already gone. */
  deleteProfile(profileId: string): Promise<void>
}
