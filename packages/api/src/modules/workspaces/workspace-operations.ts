/**
 * Serializes plan changes and automation writes across every API process.
 * Implementations must retain ownership until the work (including provider
 * calls) finishes. Nested operations in the same call may reuse ownership.
 */
export interface WorkspaceOperations {
  run<T>(workspaceId: string, work: () => Promise<T>): Promise<T>
}
