import type { AutomationStatus } from "../../contract/automation"
import type {
  AutomationConfig,
  AutomationRecord,
  NewAutomation,
} from "./automation"

export interface AutomationRepository {
  listByWorkspace(workspaceId: string): Promise<AutomationRecord[]>
  listByAccount(
    workspaceId: string,
    accountId: string
  ): Promise<AutomationRecord[]>
  findById(workspaceId: string, id: string): Promise<AutomationRecord | null>
  insert(automation: NewAutomation): Promise<AutomationRecord>
  updateConfig(
    workspaceId: string,
    id: string,
    config: AutomationConfig,
    status: AutomationStatus
  ): Promise<AutomationRecord>
  updateStatus(
    workspaceId: string,
    id: string,
    status: AutomationStatus
  ): Promise<AutomationRecord>
  delete(workspaceId: string, id: string): Promise<void>
}
