/** An agent app asking to connect to the workspace, as the consent page shows it. */
export type AuthorizationRequest = {
  id: string
  /** The name the app registered with, which it chose itself. */
  clientName: string
  /** Where the browser goes after the decision, so an impostor can be spotted. */
  destination: string
  /** The app receives the decision on this computer, where any program could claim to be it. */
  local: boolean
}

/** Where to send the browser, back to the app, after approving or denying. */
export type AuthorizationDecision = { redirectUrl: string }

export function authorizePath(requestId: string): string {
  return `/authorize?${new URLSearchParams({ request: requestId })}`
}

export function authorizeLoginPath(requestId: string): string {
  return `/login?${new URLSearchParams({ next: "authorize", request: requestId })}`
}
