/**
 * The provider groups a customer's connected accounts under a profile. Each
 * workspace owns exactly one.
 */
export interface ProfileProvider {
  /**
   * Creates the profile with this name, or returns the existing one when a
   * profile with the same name is already there. Returns the profile id.
   */
  ensureProfile(name: string): Promise<string>
}
