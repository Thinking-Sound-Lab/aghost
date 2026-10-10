import { createHash, randomBytes } from "node:crypto"
import type {
  ApiKey,
  ParsedCreateApiKeyInput,
  CreatedApiKey,
} from "../../contract/api-key"
import {
  InvalidApiKeyError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors"
import type { WorkspaceRecord } from "../workspaces/workspace"
import type { ApiKeyRecord, ApiKeyRepository } from "./api-key.repository"

function presentKey({
  workspaceId: _workspaceId,
  ...key
}: ApiKeyRecord): ApiKey {
  return key
}

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export class ApiKeyService {
  constructor(private readonly keys: ApiKeyRepository) {}

  async list(workspace: WorkspaceRecord): Promise<ApiKey[]> {
    return (await this.keys.list(workspace.id)).map(presentKey)
  }

  async create(
    workspace: WorkspaceRecord,
    input: ParsedCreateApiKeyInput
  ): Promise<CreatedApiKey> {
    if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
      throw new ValidationError({
        expiresAt: "Choose an expiration in the future.",
      })
    }
    const token = `agh_${randomBytes(32).toString("base64url")}`
    const key = await this.keys.insert({
      workspaceId: workspace.id,
      name: input.name,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
      prefix: token.slice(0, 12),
      tokenHash: hashApiKey(token),
    })
    return { key: presentKey(key), token }
  }

  async revoke(workspace: WorkspaceRecord, id: string): Promise<void> {
    if (!(await this.keys.revoke(workspace.id, id)))
      throw new NotFoundError("API key")
  }

  async authenticate(token: string): Promise<ApiKeyRecord> {
    if (!/^agh_[A-Za-z0-9_-]{43}$/.test(token)) throw new InvalidApiKeyError()
    const key = await this.keys.use(hashApiKey(token))
    if (!key) throw new InvalidApiKeyError()
    return key
  }
}
