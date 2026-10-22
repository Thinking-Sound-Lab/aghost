const CHANNEL = "aghost-accounts"

/** Tells the app's other tabs that the workspace's channels changed. */
export function announceAccountsChanged(): void {
  const channel = new BroadcastChannel(CHANNEL)
  channel.postMessage("changed")
  channel.close()
}

/** Calls the listener when another tab changes the workspace's channels. */
export function onAccountsChanged(listener: () => void): () => void {
  const channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = listener
  return () => channel.close()
}
