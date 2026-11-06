# MCP directories

Where the [MCP server](mcp.md) is listed, and how to keep each listing current.

## Official MCP Registry

Published on November 6, 2026 as `io.github.Thinking-Sound-Lab/aghost` 1.0.0, from [`server.json`](../server.json) at the repository root. It lists the remote endpoint `https://aghost.app/api/mcp` over Streamable HTTP, with an optional `Authorization` header for clients that don't sign in with OAuth.

```sh
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.Thinking-Sound-Lab/aghost"
```

To update the listing, change `server.json`, raise its `version`, then publish with [`mcp-publisher`](https://github.com/modelcontextprotocol/registry):

```sh
mcp-publisher validate server.json
mcp-publisher login github --token "$(gh auth token)"
mcp-publisher publish server.json
```

The `io.github.Thinking-Sound-Lab/` namespace needs a GitHub token from an owner of the organization with `read:org`; the GitHub CLI's default login has it. The device-flow `mcp-publisher login github` cannot publish to an organization namespace. Published versions cannot be deleted; `mcp-publisher status` can deprecate one. The `description` is limited to 100 characters.

Other directories read the registry. Glama lists registry servers as connectors by namespace, and PulseMCP is reported to import it weekly. Check that both show aghost a week after publishing before submitting to them separately.

## Directories that need a submission

These need the owner's account. Use the listing text below.

| Directory                   | How                                        | Notes                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude Connectors Directory | Anthropic's server review form             | Remote servers that need authentication must use OAuth, and every tool needs safety annotations. aghost meets both: OAuth 2.1 with dynamic registration, and `readOnlyHint`/`destructiveHint` on every tool. Reviewers need a test workspace with a plan and sample data; give one free time with a 100% discount code ([billing](billing.md#free-periods)). |
| Smithery                    | Sign in and add a remote server by its URL |                                                                                                                                                                                                                                                                                                                                                              |
| mcp.so                      | Its submit form                            |                                                                                                                                                                                                                                                                                                                                                              |
| Cursor Directory            | Its MCP submit form                        |                                                                                                                                                                                                                                                                                                                                                              |

## Listing text

- **Name:** aghost
- **Tagline:** Schedule posts to six platforms and automate Instagram DMs from your AI agent
- **Short description:** Schedule posts to Instagram, Facebook, LinkedIn, X, Threads and YouTube, and automate Instagram DMs
- **Description:** aghost lets Claude, Claude Code, Codex, Cursor or any MCP client schedule posts to Instagram, Facebook, LinkedIn, X, Threads and YouTube, with a caption per channel. It attaches comment-to-DM automations to Instagram posts before they publish, reads and replies to the Instagram inbox, and reads analytics and posting times for every channel. 29 tools, each annotated as read-only or not and destructive or not.
- **Server URL:** `https://aghost.app/api/mcp` (Streamable HTTP)
- **Authentication:** OAuth 2.1 sign-in with dynamic client registration, or a workspace API key as `Authorization: Bearer <key>`
- **Documentation:** `https://aghost.app/agents`, with a page per platform at `https://aghost.app/agents/<instagram|facebook|linkedin|x|threads|youtube>`, and the setup skill at `https://aghost.app/api/mcp/skill.md`
- **Icon:** `https://aghost.app/icon.png` (192×192), or `https://aghost.app/mascot.png` (640×640)
- **Pricing:** Paid, from $29/month, with a 7-day free trial. MCP is included on every plan.
- **Privacy policy:** `https://aghost.app/privacy-policy`
- **Repository:** `https://github.com/Thinking-Sound-Lab/aghost`
- **Categories:** Social media, Marketing, Instagram, Scheduling
