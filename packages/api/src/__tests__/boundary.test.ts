import { createHmac, randomUUID } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import { createApiClient } from "../client"
import { createAutomationSchema } from "../contract/automation"
import { ZernioWebhookGateway } from "../infrastructure/zernio/zernio-webhook.gateway"

const input = {
  instagramAccountId: randomUUID(),
  name: "Send the guide",
  status: "paused",
  trigger: { postScope: "any_post" },
  keywords: [],
  matchMode: "word",
  openingDm: null,
  dmMessage: "Hi {{first_name}}, here is the guide.",
  dmButtons: [],
  commentReply: null,
  requireFollow: false,
}

describe("automation input boundary", () => {
  it("trims keywords and removes case-insensitive duplicates", () => {
    expect(
      createAutomationSchema.parse({
        ...input,
        keywords: [" Guide ", "GUIDE", "link"],
      }).keywords
    ).toEqual(["Guide", "link"])
  })

  it("enforces Instagram's shorter message limit when buttons are present", () => {
    const dmMessage = "a".repeat(641)
    expect(
      createAutomationSchema.safeParse({ ...input, dmMessage }).success
    ).toBe(true)
    expect(
      createAutomationSchema.safeParse({
        ...input,
        dmMessage,
        dmButtons: [{ label: "Guide", url: "https://example.com/guide" }],
      }).success
    ).toBe(false)
  })

  it("trims the opening DM and holds it to Instagram's button template limits", () => {
    expect(
      createAutomationSchema.parse({
        ...input,
        openingDm: { message: " Tap below ", buttonLabel: " Send it " },
      }).openingDm
    ).toEqual({ message: "Tap below", buttonLabel: "Send it" })
    for (const openingDm of [
      { message: "a".repeat(641), buttonLabel: "Send it" },
      { message: "Tap below", buttonLabel: "a".repeat(21) },
      { message: " ", buttonLabel: "Send it" },
    ]) {
      expect(
        createAutomationSchema.safeParse({ ...input, openingDm }).success
      ).toBe(false)
    }
  })

  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "data:text/html,guide",
  ])("rejects a non-HTTPS button: %s", (url) => {
    expect(
      createAutomationSchema.safeParse({
        ...input,
        dmButtons: [{ label: "Guide", url }],
      }).success
    ).toBe(false)
  })
})

describe("webhook signature boundary", () => {
  const secret = "local-test-secret"
  const gateway = new ZernioWebhookGateway(secret)
  const raw = JSON.stringify({
    id: "event-1",
    event: "account.connected",
    test: true,
  })
  const signature = createHmac("sha256", secret).update(raw).digest("hex")

  it("accepts the exact signed body and treats provider samples as unhandled", () => {
    expect(() => gateway.verify(raw, signature)).not.toThrow()
    expect(gateway.parse(raw).kind).toBe("unhandled")
    expect(() => gateway.verify(`${raw} `, signature)).toThrow()
  })

  it.each([
    undefined,
    "",
    `${signature}junk`,
    `${signature}00`,
    signature.slice(2),
  ])("rejects missing, truncated, and suffixed signatures", (value) => {
    expect(() => gateway.verify(raw, value)).toThrow()
  })
})

describe("browser API client failures", () => {
  it("preserves field validation errors", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          error: {
            code: "validation_failed",
            message: "Check the fields",
            fields: { name: "Required" },
          },
        },
        { status: 422 }
      )
    )
    await expect(
      createApiClient("/api", transport).workspace.rename("")
    ).rejects.toMatchObject({
      code: "validation_failed",
      fields: { name: "Required" },
    })
    expect(transport).toHaveBeenCalledWith(
      "/api/workspace",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" })
    )
  })

  it.each([200, 502])(
    "reports a non-JSON proxy response consistently (%s)",
    async (status) => {
      const transport = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("<html>Bad gateway</html>", { status }))
      await expect(
        createApiClient("/api", transport).auth.session()
      ).rejects.toMatchObject({
        name: "ApiClientError",
        code: "internal_error",
        message: "The server returned an unexpected response.",
      })
    }
  )

  it("reports network failures without exposing transport details", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("private network details"))
    await expect(
      createApiClient("/api", transport).auth.session()
    ).rejects.toMatchObject({
      code: "internal_error",
      message:
        "Could not reach the server. Check your connection and try again.",
    })
  })
})
