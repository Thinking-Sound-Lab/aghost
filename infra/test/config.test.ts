import { describe, expect, it } from "vitest"
import { loadStageConfig } from "../lib/config"
import { config, environment } from "./fixture"

describe("stage configuration", () => {
  it("derives the stage's account, repository, and credentials secret", () => {
    expect(config.env).toEqual({ account: "123456789012", region: "us-east-1" })
    expect(config.github).toEqual({
      repository: {
        name: "Thinking-Sound-Lab/aghost",
        subject: "repo:Thinking-Sound-Lab@230501294/aghost@1412704218",
      },
      environment: "prod",
    })
    expect(config.api.secretName).toBe("aghost/prod/api")
  })

  it("synthesizes without a PostHog key, leaving analytics off", () => {
    const { POSTHOG_KEY: _unset, ...withoutKey } = environment
    expect(loadStageConfig(withoutKey).api.posthog).toEqual({
      key: "",
      host: "https://us.i.posthog.com",
    })
  })

  it("names every missing or malformed variable", () => {
    const { SUPABASE_URL: _missing, ...incomplete } = environment
    expect(() =>
      loadStageConfig({ ...incomplete, AWS_ACCOUNT_ID: "1234" })
    ).toThrow(/AWS_ACCOUNT_ID[\s\S]*SUPABASE_URL/)
  })
})
