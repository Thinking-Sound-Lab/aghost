import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiClientError } from "@workspace/api/client"
import type { AuthorizationRequest } from "@workspace/api/contract"
import { api } from "@/lib/api"
import { useAuthorizeStore } from "./authorize-store"
import { usePendingConnectionStore } from "./pending-connection-store"

vi.hoisted(() => {
  const values = new Map<string, string>()
  vi.stubGlobal("sessionStorage", {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => values.set(name, value),
    removeItem: (name: string) => values.delete(name),
  })
  vi.stubGlobal("window", { location: { assign: vi.fn() } })
})
vi.mock("@/lib/api", () => ({
  api: { oauth: { request: vi.fn(), approve: vi.fn(), deny: vi.fn() } },
}))
vi.mock("./auth-store", () => ({
  useAuthStore: { getState: () => ({ expire: vi.fn() }) },
}))

const request: AuthorizationRequest = {
  id: "pending",
  clientName: "Agent",
  destination: "agent.example",
  local: false,
}

describe("returning to a pending app connection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthorizeStore.getState().reset()
    usePendingConnectionStore.getState().forget()
  })

  it("reloads consent after choosing a plan and clears the previous paywall", async () => {
    vi.mocked(api.oauth.request).mockRejectedValueOnce(
      new ApiClientError("plan_required", "Choose a plan")
    )
    await useAuthorizeStore.getState().load(request.id)
    expect(useAuthorizeStore.getState().planRequired).toBe(true)
    useAuthorizeStore.getState().reset()
    vi.mocked(api.oauth.request).mockResolvedValueOnce(request)
    await useAuthorizeStore.getState().load(request.id)
    expect(useAuthorizeStore.getState()).toMatchObject({
      request,
      status: "ready",
      planRequired: false,
      error: null,
    })
  })

  it("ignores a previous request's late failure after another request loads", async () => {
    let rejectOld!: (error: Error) => void
    vi.mocked(api.oauth.request).mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectOld = reject
      })
    )
    const loadingOld = useAuthorizeStore.getState().load("old")
    useAuthorizeStore.getState().reset()
    vi.mocked(api.oauth.request).mockResolvedValueOnce(request)
    await useAuthorizeStore.getState().load(request.id)
    rejectOld(new ApiClientError("plan_required", "Choose a plan"))
    await loadingOld
    expect(useAuthorizeStore.getState()).toMatchObject({
      request,
      status: "ready",
      planRequired: false,
    })
  })

  it("discards a load that finishes after leaving consent", async () => {
    let finish!: (request: AuthorizationRequest) => void
    vi.mocked(api.oauth.request).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    const loading = useAuthorizeStore.getState().load(request.id)
    useAuthorizeStore.getState().reset()
    finish(request)
    await loading
    expect(useAuthorizeStore.getState()).toMatchObject({
      request: null,
      status: "idle",
    })
  })

  it("recovers the pending connection from tab storage after checkout", async () => {
    sessionStorage.setItem(
      "aghost-pending-connection",
      JSON.stringify({ state: { requestId: request.id }, version: 0 })
    )
    await usePendingConnectionStore.persist.rehydrate()
    expect(usePendingConnectionStore.getState().requestId).toBe(request.id)
    usePendingConnectionStore.getState().forget()
    expect(
      JSON.parse(sessionStorage.getItem("aghost-pending-connection")!).state
        .requestId
    ).toBeNull()
  })

  it("keeps the pending connection on a failed decision and clears it after success", async () => {
    usePendingConnectionStore.getState().remember(request.id)
    vi.mocked(api.oauth.approve).mockRejectedValueOnce(new Error("Try again"))
    await useAuthorizeStore.getState().decide(request.id, true)
    expect(usePendingConnectionStore.getState().requestId).toBe(request.id)
    expect(window.location.assign).not.toHaveBeenCalled()
    vi.mocked(api.oauth.approve).mockResolvedValueOnce({
      redirectUrl: "https://agent.example/callback?code=new",
    })
    await useAuthorizeStore.getState().decide(request.id, true)
    expect(usePendingConnectionStore.getState().requestId).toBeNull()
    expect(window.location.assign).toHaveBeenCalledWith(
      "https://agent.example/callback?code=new"
    )
  })
})
